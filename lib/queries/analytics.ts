import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;

/** Real trading figures for the last `days` days, in business-local time. */
export async function getAnalytics(businessId: string, timezone: string, days = 14) {
  const db = getDb();
  const since = sql`(date_trunc('day', now() AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone}) - ${sql.raw(`interval '${days - 1} days'`)}`;
  const startOfToday = sql`(date_trunc('day', now() AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone})`;

  const completed = and(
    eq(schema.orders.businessId, businessId),
    eq(schema.orders.status, "completed"),
  );

  const [today, period, series, topItems, byType] = await Promise.all([
    db
      .select({
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${schema.orders.total}), 0)::int`,
      })
      .from(schema.orders)
      .where(and(completed, gte(schema.orders.completedAt, startOfToday as never))),

    db
      .select({
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${schema.orders.total}), 0)::int`,
        average: sql<number>`coalesce(round(avg(${schema.orders.total})), 0)::int`,
      })
      .from(schema.orders)
      .where(and(completed, gte(schema.orders.completedAt, since as never))),

    db
      .select({
        day: sql<string>`to_char((${schema.orders.completedAt} AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${schema.orders.total}), 0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(schema.orders)
      .where(and(completed, gte(schema.orders.completedAt, since as never)))
      // Group by the select ordinal: the projected expression and the grouping
      // expression must be textually identical otherwise, and Drizzle renders
      // them with different qualification.
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        name: schema.orderItems.nameSnapshot,
        quantity: sql<number>`sum(${schema.orderItems.quantity})::int`,
        revenue: sql<number>`sum(${schema.orderItems.lineTotal})::int`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(and(completed, gte(schema.orders.completedAt, since as never)))
      .groupBy(schema.orderItems.nameSnapshot)
      .orderBy(sql`sum(${schema.orderItems.quantity}) desc`)
      .limit(8),

    db
      .select({
        type: schema.orders.type,
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${schema.orders.total}), 0)::int`,
      })
      .from(schema.orders)
      .where(and(completed, gte(schema.orders.completedAt, since as never)))
      .groupBy(schema.orders.type),
  ]);

  return {
    today: today[0] ?? { orders: 0, revenue: 0 },
    period: period[0] ?? { orders: 0, revenue: 0, average: 0 },
    series,
    topItems,
    byType,
    days,
  };
}
