import "server-only";

import { and, count, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const OPEN_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready",
] as const;

/**
 * Every figure on the dashboard comes from here. One round trip per metric,
 * all issued in parallel.
 */
export async function getDashboardData(businessId: string, timezone: string) {
  const db = getDb();

  // "Today" is the restaurant's local day, not the server's.
  const startOfLocalDay = sql`(date_trunc('day', now() AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone})`;

  const [
    categoryCount,
    menuItemCount,
    tableCount,
    todaysOrderCount,
    pendingOrderCount,
    recentOrders,
    menuStatus,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.businessId, businessId),
          isNull(schema.categories.deletedAt),
        ),
      ),

    db
      .select({ value: count() })
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.businessId, businessId),
          isNull(schema.menuItems.deletedAt),
        ),
      ),

    db
      .select({ value: count() })
      .from(schema.restaurantTables)
      .where(
        and(
          eq(schema.restaurantTables.businessId, businessId),
          isNull(schema.restaurantTables.deletedAt),
        ),
      ),

    db
      .select({ value: count() })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.businessId, businessId),
          sql`${schema.orders.placedAt} >= ${startOfLocalDay}`,
        ),
      ),

    db
      .select({ value: count() })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.businessId, businessId),
          inArray(schema.orders.status, [...OPEN_STATUSES]),
        ),
      ),

    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        type: schema.orders.type,
        total: schema.orders.total,
        placedAt: schema.orders.placedAt,
        createdAt: schema.orders.createdAt,
        tableLabel: schema.restaurantTables.label,
        itemCount: sql<number>`(
          select coalesce(sum(oi.quantity), 0)::int
          from ${schema.orderItems} oi
          where oi.order_id = ${schema.orders.id}
        )`,
      })
      .from(schema.orders)
      .leftJoin(
        schema.restaurantTables,
        eq(schema.orders.tableId, schema.restaurantTables.id),
      )
      .where(eq(schema.orders.businessId, businessId))
      .orderBy(desc(sql`coalesce(${schema.orders.placedAt}, ${schema.orders.createdAt})`))
      .limit(6),

    db
      .select({
        published: sql<number>`count(*) filter (where ${schema.menuItems.isAvailable})::int`,
        draft: sql<number>`count(*) filter (where not ${schema.menuItems.isAvailable})::int`,
        lastUpdated: sql<Date | null>`max(${schema.menuItems.updatedAt})`,
      })
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.businessId, businessId),
          isNull(schema.menuItems.deletedAt),
        ),
      ),
  ]);

  return {
    counts: {
      categories: categoryCount[0]?.value ?? 0,
      menuItems: menuItemCount[0]?.value ?? 0,
      tables: tableCount[0]?.value ?? 0,
      todaysOrders: todaysOrderCount[0]?.value ?? 0,
      pendingOrders: pendingOrderCount[0]?.value ?? 0,
    },
    recentOrders,
    menu: {
      published: menuStatus[0]?.published ?? 0,
      draft: menuStatus[0]?.draft ?? 0,
      lastUpdated: menuStatus[0]?.lastUpdated ?? null,
    },
  };
}

/** Zeroed shape used when the database is unreachable. */
export const emptyDashboard: DashboardData = {
  counts: {
    categories: 0,
    menuItems: 0,
    tables: 0,
    todaysOrders: 0,
    pendingOrders: 0,
  },
  recentOrders: [],
  menu: { published: 0, draft: 0, lastUpdated: null },
};
