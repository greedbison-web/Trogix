import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

export type AdminRole = "owner" | "admin" | "support" | "readonly";

export type AdminIdentity = {
  adminId: string;
  userId: string;
  email: string;
  role: AdminRole;
};

/**
 * Capability model. Every privileged action names a capability rather than a
 * role, so roles can be re-cut without hunting for role checks.
 */
export const CAPABILITIES = {
  "restaurants.read": ["owner", "admin", "support", "readonly"],
  "restaurants.suspend": ["owner", "admin"],
  "restaurants.delete": ["owner"],
  "subscriptions.manage": ["owner", "admin"],
  "coupons.manage": ["owner", "admin"],
  "payments.read": ["owner", "admin", "support", "readonly"],
  "webhooks.retry": ["owner", "admin"],
  "impersonate": ["owner", "admin", "support"],
  "notifications.send": ["owner", "admin"],
  "settings.write": ["owner"],
  "admins.manage": ["owner"],
  "audit.read": ["owner", "admin"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: AdminRole, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly AdminRole[]).includes(role);
}

/**
 * Resolves the current platform admin, or null. Cached per request so the
 * layout and every page share one lookup.
 */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const user = await getUser();
  if (!user) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        adminId: schema.platformAdmins.id,
        role: schema.platformAdmins.role,
        status: schema.platformAdmins.status,
      })
      .from(schema.platformAdmins)
      .where(
        and(
          eq(schema.platformAdmins.userId, user.id),
          eq(schema.platformAdmins.status, "active"),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      adminId: row.adminId,
      userId: user.id,
      email: user.email ?? "",
      role: row.role as AdminRole,
    };
  } catch {
    return null;
  }
});

/** Page/action guard. Sends non-admins to the restaurant app, not to a 403. */
export async function requireAdmin(capability?: Capability): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/login?next=/admin");
  if (capability && !can(admin.role, capability)) redirect("/admin?denied=1");
  return admin;
}

/** Throwing variant for server actions, which must not redirect mid-mutation. */
export async function requireAdminAction(
  capability: Capability,
): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised.");
  if (!can(admin.role, capability)) {
    throw new Error("Your role does not permit that action.");
  }
  return admin;
}

/** Append-only audit trail. Never throws — auditing must not break an action. */
export async function audit(
  admin: AdminIdentity,
  action: string,
  detail: {
    targetType?: string;
    targetId?: string;
    businessId?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    const db = getDb();
    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null;

    await db.insert(schema.adminAuditLogs).values({
      adminId: admin.adminId,
      adminEmail: admin.email,
      action,
      targetType: detail.targetType ?? null,
      targetId: detail.targetId ?? null,
      businessId: detail.businessId ?? null,
      metadata: detail.metadata ?? null,
      ipAddress: ip,
    });
  } catch {
    // Swallow: an audit failure must not roll back the action it describes.
  }
}
