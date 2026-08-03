import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getActiveImpersonation } from "@/lib/admin/impersonation";

/** The signed-in owner's business plus its settings, or null. */
export async function getBusinessForOwner(ownerId: string) {
  try {
    const db = getDb();
    const rows = await db
      .select({
        business: schema.businesses,
        settings: schema.businessSettings,
      })
      .from(schema.businesses)
      .leftJoin(
        schema.businessSettings,
        eq(schema.businessSettings.businessId, schema.businesses.id),
      )
      .where(
        and(
          eq(schema.businesses.ownerId, ownerId),
          isNull(schema.businesses.deletedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  } catch {
    return null;
  }
}


/** The business by id, regardless of owner. Used by impersonation and admin. */
export async function getBusinessById(businessId: string) {
  try {
    const db = getDb();
    const rows = await db
      .select({
        business: schema.businesses,
        settings: schema.businessSettings,
      })
      .from(schema.businesses)
      .leftJoin(
        schema.businessSettings,
        eq(schema.businessSettings.businessId, schema.businesses.id),
      )
      .where(eq(schema.businesses.id, businessId))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * The business the current request should act on.
 *
 * If a platform admin holds a live impersonation grant, that business wins;
 * otherwise it is the signed-in user's own. Every restaurant-side screen goes
 * through here so impersonation is honoured in exactly one place.
 */
export async function getActiveBusiness(ownerId: string) {
  const impersonation = await getActiveImpersonation();
  if (impersonation) {
    const record = await getBusinessById(impersonation.businessId);
    if (record) return record;
  }
  return getBusinessForOwner(ownerId);
}
