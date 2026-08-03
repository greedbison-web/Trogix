import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

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
