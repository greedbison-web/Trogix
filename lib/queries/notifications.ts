import "server-only";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isPreview } from "@/lib/preview/mode";

export type RestaurantNotice = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  isMaintenanceBanner: boolean;
};

/** Live notices for a restaurant: its own, plus platform-wide broadcasts. */
export async function getNoticesForBusiness(
  businessId: string,
): Promise<RestaurantNotice[]> {
  if (isPreview()) return [];
  try {
    const db = getDb();
    return await db
      .select({
        id: schema.platformNotifications.id,
        title: schema.platformNotifications.title,
        body: schema.platformNotifications.body,
        level: schema.platformNotifications.level,
        isMaintenanceBanner: schema.platformNotifications.isMaintenanceBanner,
      })
      .from(schema.platformNotifications)
      .where(
        and(
          isNull(schema.platformNotifications.deletedAt),
          or(
            isNull(schema.platformNotifications.businessId),
            eq(schema.platformNotifications.businessId, businessId),
          )!,
          or(
            isNull(schema.platformNotifications.expiresAt),
            gt(schema.platformNotifications.expiresAt, sql`now()`),
          )!,
        ),
      )
      .orderBy(desc(schema.platformNotifications.publishedAt))
      .limit(5);
  } catch {
    return [];
  }
}
