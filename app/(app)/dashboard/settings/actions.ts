"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getUser, createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { INDIAN_STATES } from "@/lib/validation/business";
import type { ActionResult } from "../menu/types";

async function requireBusiness() {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  const record = await getActiveBusiness(user.id);
  if (!record) throw new Error("No business found.");
  return { user, business: record.business };
}

const ok = (): ActionResult => ({ ok: true, errors: {}, message: null });
const fail = (message: string, errors: Record<string, string> = {}): ActionResult => ({
  ok: false,
  errors,
  message,
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function refresh() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

/* ---------------------------------------------------------------- Profile */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Business name is too short.").max(80),
  ownerName: z.string().trim().min(2, "Owner name is too short.").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number."),
  addressLine: z.string().trim().min(5, "Enter the street address.").max(180),
  city: z.string().trim().min(2, "Enter the city.").max(60),
  state: z.enum(INDIAN_STATES),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid pincode."),
  contactEmail: z.string().trim().email("Enter a valid email.").or(z.literal("")),
  website: z.string().trim().max(200).or(z.literal("")),
});

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    ownerName: formData.get("ownerName"),
    phone: formData.get("phone"),
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    contactEmail: formData.get("contactEmail") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const v = parsed.data;
  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.businesses)
        .set({
          name: v.name,
          ownerName: v.ownerName,
          phone: v.phone,
          addressLine: v.addressLine,
          city: v.city,
          state: v.state,
          pincode: v.pincode,
        })
        .where(eq(schema.businesses.id, business.id));

      await tx
        .update(schema.businessSettings)
        .set({
          contactEmail: v.contactEmail || null,
          contactPhone: v.phone,
          website: v.website || null,
        })
        .where(eq(schema.businessSettings.businessId, business.id));
    });
  } catch {
    return fail("Could not save the profile.");
  }

  refresh();
  return ok();
}

/* --------------------------------------------------------------- Branding */

const LOGO_BUCKET = "business-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const HEX = /^#[0-9A-Fa-f]{6}$/;

export async function saveBranding(formData: FormData): Promise<ActionResult> {
  let business;
  let user;
  try {
    ({ business, user } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const primary = String(formData.get("primaryColor") ?? "").trim();
  const secondary = String(formData.get("secondaryColor") ?? "").trim();
  const receiptFooter = String(formData.get("receiptFooter") ?? "").trim();

  if (!HEX.test(primary)) return fail("Enter a valid colour.", { primaryColor: "Use #RRGGBB." });
  if (!HEX.test(secondary)) {
    return fail("Enter a valid colour.", { secondaryColor: "Use #RRGGBB." });
  }

  let logoUrl: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) {
      return fail("Please fix the highlighted fields.", { logo: "Logo must be under 2 MB." });
    }
    try {
      const supabase = await createClient();
      const extension = logo.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, logo, { contentType: logo.type, upsert: false });
      if (error) throw new Error("upload failed");
      logoUrl = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
    } catch {
      return fail("Please fix the highlighted fields.", { logo: "Could not upload the logo." });
    }
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.businessSettings)
        .set({
          primaryColor: primary,
          secondaryColor: secondary,
          receiptFooter: receiptFooter || null,
          ...(logoUrl ? { logoUrl } : {}),
        })
        .where(eq(schema.businessSettings.businessId, business.id));

      if (logoUrl) {
        await tx
          .update(schema.businesses)
          .set({ logoUrl })
          .where(eq(schema.businesses.id, business.id));
      }
    });
  } catch {
    return fail("Could not save branding.");
  }

  refresh();
  return ok();
}

/* ------------------------------------------------------- Taxes & charges */

const billingSchema = z.object({
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Enter a valid 15-character GSTIN.",
    )
    .or(z.literal("")),
  serviceChargePercent: z.coerce
    .number()
    .min(0, "Cannot be negative.")
    .max(25, "Service charge cannot exceed 25%."),
  taxEnabled: z.boolean(),
});

export async function saveBilling(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = billingSchema.safeParse({
    gstNumber: formData.get("gstNumber") ?? "",
    serviceChargePercent: formData.get("serviceChargePercent") || 0,
    taxEnabled: formData.get("taxEnabled") === "true",
  });
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const v = parsed.data;
  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.businessSettings)
        .set({
          gstNumber: v.gstNumber || null,
          serviceCharge: Math.round(v.serviceChargePercent * 100),
          taxEnabled: v.taxEnabled,
        })
        .where(eq(schema.businessSettings.businessId, business.id));

      await tx
        .update(schema.businesses)
        .set({ gst: v.gstNumber || null })
        .where(eq(schema.businesses.id, business.id));
    });
  } catch {
    return fail("Could not save billing settings.");
  }

  refresh();
  return ok();
}

/* -------------------------------------------------------- Operating hours */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveHours(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const rows: {
    weekday: number;
    isOpen: boolean;
    opensAt: string;
    closesAt: string;
  }[] = [];

  for (let weekday = 0; weekday < 7; weekday += 1) {
    const isOpen = formData.get(`open-${weekday}`) === "true";
    const opensAt = String(formData.get(`from-${weekday}`) ?? "11:00");
    const closesAt = String(formData.get(`until-${weekday}`) ?? "23:00");

    if (isOpen && (!TIME.test(opensAt) || !TIME.test(closesAt))) {
      return fail("Use 24-hour times like 11:00.", { [`hours-${weekday}`]: "Invalid time." });
    }
    rows.push({ weekday, isOpen, opensAt, closesAt });
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .delete(schema.operatingHours)
        .where(eq(schema.operatingHours.businessId, business.id));
      await tx
        .insert(schema.operatingHours)
        .values(rows.map((row) => ({ businessId: business.id, ...row })));
    });
  } catch {
    return fail("Could not save opening hours.");
  }

  refresh();
  return ok();
}

/* ------------------------------------------------------------------ Staff */

const staffSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Name is too short.").max(80),
  email: z.string().trim().email("Enter a valid email.").or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number.")
    .or(z.literal("")),
  role: z.enum(["owner", "manager", "waiter", "kitchen", "cashier"]),
});

export async function saveStaff(formData: FormData): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const parsed = staffSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    role: formData.get("role") || "waiter",
  });
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }

  const v = parsed.data;
  try {
    const db = getDb();
    if (v.id) {
      await db
        .update(schema.staffMembers)
        .set({
          name: v.name,
          email: v.email || null,
          phone: v.phone || null,
          role: v.role,
        })
        .where(
          and(
            eq(schema.staffMembers.id, v.id),
            eq(schema.staffMembers.businessId, business.id),
          ),
        );
    } else {
      await db.insert(schema.staffMembers).values({
        businessId: business.id,
        name: v.name,
        email: v.email || null,
        phone: v.phone || null,
        role: v.role,
        status: "invited",
      });
    }
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return duplicate
      ? fail("Someone already uses that email.", { email: "Already in use." })
      : fail("Could not save the team member.");
  }

  refresh();
  return ok();
}

export async function setStaffStatus(
  staffId: string,
  status: "active" | "disabled",
): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  try {
    const db = getDb();
    await db
      .update(schema.staffMembers)
      .set({ status })
      .where(
        and(
          eq(schema.staffMembers.id, staffId),
          eq(schema.staffMembers.businessId, business.id),
        ),
      );
  } catch {
    return fail("Could not update the team member.");
  }

  refresh();
  return ok();
}

export async function removeStaff(staffId: string): Promise<ActionResult> {
  let business;
  try {
    ({ business } = await requireBusiness());
  } catch {
    return fail("Your session expired. Sign in again.");
  }

  const db = getDb();

  // The owner row is what grants the account access; it cannot be removed.
  const [member] = await db
    .select({ role: schema.staffMembers.role })
    .from(schema.staffMembers)
    .where(
      and(
        eq(schema.staffMembers.id, staffId),
        eq(schema.staffMembers.businessId, business.id),
        isNull(schema.staffMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!member) return fail("Team member not found.");
  if (member.role === "owner") return fail("The owner cannot be removed.");

  try {
    await db
      .update(schema.staffMembers)
      .set({ deletedAt: new Date(), status: "disabled" })
      .where(eq(schema.staffMembers.id, staffId));
  } catch {
    return fail("Could not remove the team member.");
  }

  refresh();
  return ok();
}
