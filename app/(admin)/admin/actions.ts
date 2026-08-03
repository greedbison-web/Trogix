"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireAdminAction, audit } from "@/lib/admin/auth";
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_MINUTES,
} from "@/lib/admin/impersonation";
import { getAccessToken } from "@/lib/razorpay/oauth";

export type AdminResult = { ok: boolean; message: string | null };

const ok = (): AdminResult => ({ ok: true, message: null });
const fail = (message: string): AdminResult => ({ ok: false, message });

function refreshAdmin(path?: string) {
  revalidatePath("/admin");
  if (path) revalidatePath(path);
}

/* -------------------------------------------------- Restaurant management */

export async function setBusinessStatus(
  businessId: string,
  status: "active" | "suspended" | "closed" | "onboarding",
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("restaurants.suspend");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  try {
    const db = getDb();
    await db
      .update(schema.businessSettings)
      .set({ businessStatus: status })
      .where(eq(schema.businessSettings.businessId, businessId));
  } catch {
    return fail("Could not update the restaurant.");
  }

  await audit(admin, `restaurant.${status}`, {
    targetType: "business",
    targetId: businessId,
    businessId,
    metadata: { status },
  });

  refreshAdmin(`/admin/restaurants/${businessId}`);
  return ok();
}

export async function deleteBusiness(
  businessId: string,
  confirmation: string,
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("restaurants.delete");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const db = getDb();
  const [business] = await db
    .select({ name: schema.businesses.name })
    .from(schema.businesses)
    .where(eq(schema.businesses.id, businessId))
    .limit(1);

  if (!business) return fail("Restaurant not found.");
  if (confirmation.trim() !== business.name) {
    return fail(`Type "${business.name}" exactly to confirm deletion.`);
  }

  try {
    // Soft delete: orders, payments and receipts are financial records and
    // must survive. Suspending stops all guest traffic immediately.
    await db.transaction(async (tx) => {
      await tx
        .update(schema.businesses)
        .set({ deletedAt: new Date() })
        .where(eq(schema.businesses.id, businessId));
      await tx
        .update(schema.businessSettings)
        .set({ businessStatus: "closed" })
        .where(eq(schema.businessSettings.businessId, businessId));
    });
  } catch {
    return fail("Could not delete the restaurant.");
  }

  await audit(admin, "restaurant.delete", {
    targetType: "business",
    targetId: businessId,
    businessId,
    metadata: { name: business.name },
  });

  refreshAdmin("/admin/restaurants");
  return ok();
}

/* ---------------------------------------------------------- Subscriptions */

const planSchema = z.enum(["trial", "starter", "growth", "enterprise"]);

export async function setSubscription(
  businessId: string,
  plan: string,
  expiresInDays: number | null,
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("subscriptions.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return fail("Unknown plan.");

  const expiresAt =
    expiresInDays && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  try {
    const db = getDb();
    await db
      .update(schema.businessSettings)
      .set({
        subscriptionPlan: parsed.data,
        planStartedAt: new Date(),
        planExpiresAt: expiresAt,
        ...(parsed.data === "trial" ? {} : { trialEndsAt: null }),
      })
      .where(eq(schema.businessSettings.businessId, businessId));
  } catch {
    return fail("Could not change the plan.");
  }

  await audit(admin, "subscription.change", {
    targetType: "business",
    targetId: businessId,
    businessId,
    metadata: { plan: parsed.data, expiresAt },
  });

  refreshAdmin("/admin/subscriptions");
  return ok();
}

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Code must be at least 3 characters.")
    .max(24)
    .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens only."),
  description: z.string().trim().max(160).optional(),
  percentOff: z.coerce.number().int().min(1).max(100),
  maxRedemptions: z.coerce.number().int().min(1).max(100000).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(3650).optional(),
});

export async function createCoupon(formData: FormData): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("coupons.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description") || undefined,
    percentOff: formData.get("percentOff"),
    maxRedemptions: formData.get("maxRedemptions") || undefined,
    expiresInDays: formData.get("expiresInDays") || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the coupon details.");
  }

  const values = parsed.data;

  try {
    const db = getDb();
    await db.insert(schema.coupons).values({
      code: values.code,
      description: values.description ?? null,
      percentOffBps: values.percentOff * 100,
      maxRedemptions: values.maxRedemptions ?? null,
      expiresAt: values.expiresInDays
        ? new Date(Date.now() + values.expiresInDays * 24 * 60 * 60 * 1000)
        : null,
    });
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return fail(duplicate ? "That code already exists." : "Could not create the coupon.");
  }

  await audit(admin, "coupon.create", {
    targetType: "coupon",
    targetId: values.code,
    metadata: { percentOff: values.percentOff },
  });

  refreshAdmin("/admin/subscriptions");
  return ok();
}

export async function setCouponActive(
  couponId: string,
  isActive: boolean,
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("coupons.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  try {
    const db = getDb();
    await db
      .update(schema.coupons)
      .set({ isActive })
      .where(eq(schema.coupons.id, couponId));
  } catch {
    return fail("Could not update the coupon.");
  }

  await audit(admin, isActive ? "coupon.enable" : "coupon.disable", {
    targetType: "coupon",
    targetId: couponId,
  });

  refreshAdmin("/admin/subscriptions");
  return ok();
}

/* ------------------------------------------------------ Payment monitoring */

/**
 * Re-runs a stored webhook payload through the same handler logic. The stored
 * payload is trusted because it was signature-verified when first received —
 * rejected events are never retryable.
 */
export async function retryWebhook(webhookId: string): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("webhooks.retry");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const db = getDb();
  const [event] = await db
    .select()
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.id, webhookId))
    .limit(1);

  if (!event) return fail("Webhook not found.");
  if (!event.signatureValid) {
    return fail("That webhook failed signature verification and cannot be replayed.");
  }

  const { processRazorpayEvent } = await import("@/lib/razorpay/process");

  try {
    const result = await processRazorpayEvent(
      event.payload as Record<string, unknown>,
      event.eventId,
    );
    await db
      .update(schema.webhookEvents)
      .set({
        status: result.ok ? "processed" : "failed",
        attempts: event.attempts + 1,
        lastError: result.ok ? null : result.message,
        processedAt: result.ok ? new Date() : null,
      })
      .where(eq(schema.webhookEvents.id, webhookId));

    await audit(admin, "webhook.retry", {
      targetType: "webhook_event",
      targetId: webhookId,
      businessId: event.businessId ?? undefined,
      metadata: { outcome: result.ok ? "processed" : "failed" },
    });

    if (!result.ok) return fail(result.message ?? "Retry failed.");
  } catch {
    return fail("Retry failed.");
  }

  refreshAdmin("/admin/payments");
  return ok();
}

/** Confirms a restaurant's Razorpay grant still works, without moving money. */
export async function checkRazorpayConnection(
  businessId: string,
): Promise<AdminResult> {
  try {
    await requireAdminAction("payments.read");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const grant = await getAccessToken(businessId);
  refreshAdmin("/admin/payments");
  return grant
    ? ok()
    : fail("No usable grant — the restaurant must reconnect Razorpay.");
}

/* ------------------------------------------------------------ Impersonation */

const impersonateSchema = z.object({
  businessId: z.string().uuid(),
  reason: z.string().trim().min(8, "Give a reason of at least 8 characters."),
});

export async function startImpersonation(formData: FormData): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("impersonate");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const parsed = impersonateSchema.safeParse({
    businessId: formData.get("businessId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const expiresAt = new Date(Date.now() + IMPERSONATION_MINUTES * 60 * 1000);

  let sessionId: string;
  try {
    const db = getDb();
    const [session] = await db
      .insert(schema.impersonationSessions)
      .values({
        adminId: admin.adminId,
        adminEmail: admin.email,
        businessId: parsed.data.businessId,
        reason: parsed.data.reason,
        expiresAt,
      })
      .returning({ id: schema.impersonationSessions.id });
    sessionId = session.id;
  } catch {
    return fail("Could not start the session.");
  }

  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  await audit(admin, "impersonation.start", {
    targetType: "business",
    targetId: parsed.data.businessId,
    businessId: parsed.data.businessId,
    metadata: { reason: parsed.data.reason, expiresAt },
  });

  redirect("/dashboard");
}

export async function stopImpersonation(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(IMPERSONATION_COOKIE)?.value;
  store.delete(IMPERSONATION_COOKIE);

  if (sessionId) {
    try {
      const db = getDb();
      await db
        .update(schema.impersonationSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.impersonationSessions.id, sessionId),
            isNull(schema.impersonationSessions.revokedAt),
          ),
        );
    } catch {
      // Cookie is already cleared; the row expires on its own.
    }
  }

  redirect("/admin");
}

export async function revokeImpersonation(sessionId: string): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("impersonate");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  try {
    const db = getDb();
    await db
      .update(schema.impersonationSessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.impersonationSessions.id, sessionId));
  } catch {
    return fail("Could not revoke the session.");
  }

  await audit(admin, "impersonation.revoke", {
    targetType: "impersonation_session",
    targetId: sessionId,
  });

  refreshAdmin("/admin/security");
  return ok();
}

/* ----------------------------------------------------------- Notifications */

const notificationSchema = z.object({
  title: z.string().trim().min(3, "Title is too short.").max(120),
  body: z.string().trim().min(3, "Message is too short.").max(1000),
  level: z.enum(["info", "warning", "critical"]),
  businessId: z.string().uuid().optional().or(z.literal("")),
  isMaintenanceBanner: z.boolean().default(false),
  expiresInHours: z.coerce.number().int().min(1).max(720).optional(),
});

export async function sendNotification(formData: FormData): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("notifications.send");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const parsed = notificationSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    level: formData.get("level") || "info",
    businessId: formData.get("businessId") || "",
    isMaintenanceBanner: formData.get("isMaintenanceBanner") === "true",
    expiresInHours: formData.get("expiresInHours") || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the message.");
  }

  const values = parsed.data;

  try {
    const db = getDb();
    await db.insert(schema.platformNotifications).values({
      title: values.title,
      body: values.body,
      level: values.level,
      businessId: values.businessId ? values.businessId : null,
      isMaintenanceBanner: values.isMaintenanceBanner,
      expiresAt: values.expiresInHours
        ? new Date(Date.now() + values.expiresInHours * 60 * 60 * 1000)
        : null,
      createdByEmail: admin.email,
    });
  } catch {
    return fail("Could not send the notification.");
  }

  await audit(admin, "notification.send", {
    targetType: values.businessId ? "business" : "all",
    targetId: values.businessId || undefined,
    businessId: values.businessId || undefined,
    metadata: { title: values.title, level: values.level },
  });

  refreshAdmin("/admin/notifications");
  return ok();
}

export async function dismissNotification(id: string): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("notifications.send");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  try {
    const db = getDb();
    await db
      .update(schema.platformNotifications)
      .set({ deletedAt: new Date() })
      .where(eq(schema.platformNotifications.id, id));
  } catch {
    return fail("Could not remove the notification.");
  }

  await audit(admin, "notification.dismiss", {
    targetType: "notification",
    targetId: id,
  });

  refreshAdmin("/admin/notifications");
  return ok();
}

/* --------------------------------------------------------------- Settings */

export async function updateSetting(
  namespace: string,
  key: string,
  raw: string,
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("settings.write");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    // Bare strings are the common case; store them as JSON strings.
    value = raw;
  }

  try {
    const db = getDb();
    await db
      .update(schema.platformSettings)
      .set({ value: value as never, updatedByEmail: admin.email })
      .where(
        and(
          eq(schema.platformSettings.namespace, namespace),
          eq(schema.platformSettings.key, key),
        ),
      );
  } catch {
    return fail("Could not save the setting.");
  }

  await audit(admin, "setting.update", {
    targetType: "setting",
    targetId: `${namespace}.${key}`,
    metadata: { value },
  });

  refreshAdmin("/admin/settings");
  return ok();
}

/* ------------------------------------------------------------------ Admins */

export async function setAdminRole(
  adminId: string,
  role: "owner" | "admin" | "support" | "readonly",
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("admins.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  if (adminId === admin.adminId) {
    return fail("You cannot change your own role.");
  }

  try {
    const db = getDb();
    await db
      .update(schema.platformAdmins)
      .set({ role })
      .where(eq(schema.platformAdmins.id, adminId));
  } catch {
    return fail("Could not change the role.");
  }

  await audit(admin, "admin.role_change", {
    targetType: "platform_admin",
    targetId: adminId,
    metadata: { role },
  });

  refreshAdmin("/admin/security");
  return ok();
}

export async function setAdminStatus(
  adminId: string,
  status: "active" | "disabled",
): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("admins.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  if (adminId === admin.adminId) return fail("You cannot disable yourself.");

  try {
    const db = getDb();
    await db
      .update(schema.platformAdmins)
      .set({ status })
      .where(eq(schema.platformAdmins.id, adminId));
  } catch {
    return fail("Could not update the admin.");
  }

  await audit(admin, `admin.${status}`, {
    targetType: "platform_admin",
    targetId: adminId,
  });

  refreshAdmin("/admin/security");
  return ok();
}

export async function inviteAdmin(formData: FormData): Promise<AdminResult> {
  let admin;
  try {
    admin = await requireAdminAction("admins.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not authorised.");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "support");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail("Enter a valid email address.");
  }

  const db = getDb();
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${email}`)
    .limit(1);

  if (!user) {
    return fail("No Trogix account with that email. Ask them to sign up first.");
  }

  try {
    await db
      .insert(schema.platformAdmins)
      .values({
        userId: user.id,
        role: role as "owner" | "admin" | "support" | "readonly",
        status: "active",
      })
      .onConflictDoUpdate({
        target: schema.platformAdmins.userId,
        set: { status: "active", role: role as "owner" },
      });
  } catch {
    return fail("Could not grant access.");
  }

  await audit(admin, "admin.invite", {
    targetType: "platform_admin",
    targetId: user.id,
    metadata: { email, role },
  });

  refreshAdmin("/admin/security");
  return ok();
}
