import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
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

  const [peakHours, repeat, tableUse] = await Promise.all([
    db
      .select({
        hour: sql<number>`extract(hour from (${schema.orders.completedAt} AT TIME ZONE ${timezone}))::int`,
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${schema.orders.total}), 0)::int`,
      })
      .from(schema.orders)
      .where(and(completed, gte(schema.orders.completedAt, since as never)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        guests: sql<number>`count(*)::int`,
        repeatGuests: sql<number>`count(*) filter (where visits > 1)::int`,
        totalVisits: sql<number>`coalesce(sum(visits), 0)::int`,
      })
      .from(
        sql`(
          select guest_phone, count(*) as visits
          from ${schema.orders}
          where business_id = ${businessId}
            and status = 'completed'
            and guest_phone is not null
          group by guest_phone
        ) g`,
      ),

    db
      .select({
        label: schema.restaurantTables.label,
        orders: sql<number>`count(o.id)::int`,
        revenue: sql<number>`coalesce(sum(o.total), 0)::int`,
      })
      .from(schema.restaurantTables)
      .leftJoin(
        sql`${schema.orders} o`,
        sql`o.table_id = ${schema.restaurantTables.id} and o.status = 'completed' and o.completed_at >= ${since}`,
      )
      .where(
        and(
          eq(schema.restaurantTables.businessId, businessId),
          isNull(schema.restaurantTables.deletedAt),
        ),
      )
      .groupBy(schema.restaurantTables.id, schema.restaurantTables.label)
      .orderBy(desc(sql`count(o.id)`)),
  ]);

  return {
    peakHours,
    repeat: repeat[0] ?? { guests: 0, repeatGuests: 0, totalVisits: 0 },
    tableUse,
    today: today[0] ?? { orders: 0, revenue: 0 },
    period: period[0] ?? { orders: 0, revenue: 0, average: 0 },
    series,
    topItems,
    byType,
    days,
  };
}
