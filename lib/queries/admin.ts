import "server-only";
import { and, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/** Restaurants counted "online" if they saw activity in this window. */
const ONLINE_WINDOW = sql`now() - interval '15 minutes'`;

/**
 * Correlated subqueries must reference the OUTER businesses row explicitly.
 * Drizzle renders `schema.businesses.id` unqualified inside a raw subquery,
 * where it would bind to the subquery's own alias instead.
 */
const OUTER_BUSINESS_ID = sql.raw('"businesses"."id"');
const ACTIVE_ORDER_STATUSES = ["placed", "accepted", "preparing", "ready"] as const;

/* ------------------------------------------------------------- Dashboard */

export async function getPlatformOverview() {
  const db = getDb();
  const startOfToday = sql`date_trunc('day', now())`;

  const [
    restaurants,
    orders,
    paymentVolume,
    signups,
    tables,
    online,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where bs.business_status = 'active')::int`,
        trial: sql<number>`count(*) filter (where bs.subscription_plan = 'trial')::int`,
        suspended: sql<number>`count(*) filter (where bs.business_status = 'suspended')::int`,
      })
      .from(sql`${schema.businesses} b`)
      .leftJoin(sql`${schema.businessSettings} bs`, sql`bs.business_id = b.id`)
      .where(sql`b.deleted_at is null`),

    db
      .select({
        today: sql<number>`count(*) filter (where placed_at >= ${startOfToday})::int`,
        total: sql<number>`count(*)::int`,
        activeNow: sql<number>`count(*) filter (where status in ('placed','accepted','preparing','ready'))::int`,
      })
      .from(schema.orders),

    db
      .select({
        succeededTotal: sql<number>`coalesce(sum(amount) filter (where status = 'succeeded'), 0)::bigint`,
        succeededToday: sql<number>`coalesce(sum(amount) filter (where status = 'succeeded' and paid_at >= ${startOfToday}), 0)::bigint`,
        failedToday: sql<number>`count(*) filter (where status = 'failed' and created_at >= ${startOfToday})::int`,
        countSucceeded: sql<number>`count(*) filter (where status = 'succeeded')::int`,
        countAll: sql<number>`count(*)::int`,
      })
      .from(schema.payments),

    db
      .select({
        today: sql<number>`count(*) filter (where created_at >= ${startOfToday})::int`,
        last7: sql<number>`count(*) filter (where created_at >= now() - interval '7 days')::int`,
        last30: sql<number>`count(*) filter (where created_at >= now() - interval '30 days')::int`,
      })
      .from(schema.businesses)
      .where(isNull(schema.businesses.deletedAt)),

    db
      .select({
        total: sql<number>`count(*)::int`,
        seated: sql<number>`count(*) filter (where status = 'seated')::int`,
      })
      .from(schema.restaurantTables)
      .where(isNull(schema.restaurantTables.deletedAt)),

    db
      .select({
        count: sql<number>`count(distinct business_id)::int`,
      })
      .from(schema.orders)
      .where(sql`coalesce(placed_at, created_at) >= ${ONLINE_WINDOW}`),
  ]);

  const volume = paymentVolume[0];
  const successRate =
    volume && volume.countAll > 0
      ? Math.round((volume.countSucceeded / volume.countAll) * 100)
      : null;

  return {
    restaurants: restaurants[0] ?? { total: 0, active: 0, trial: 0, suspended: 0 },
    orders: orders[0] ?? { today: 0, total: 0, activeNow: 0 },
    payments: {
      revenueTotal: Number(volume?.succeededTotal ?? 0),
      revenueToday: Number(volume?.succeededToday ?? 0),
      failedToday: volume?.failedToday ?? 0,
      successRate,
    },
    signups: signups[0] ?? { today: 0, last7: 0, last30: 0 },
    tables: tables[0] ?? { total: 0, seated: 0 },
    onlineRestaurants: online[0]?.count ?? 0,
  };
}

/* -------------------------------------------------- Restaurant management */

export type RestaurantFilter = "all" | "active" | "trial" | "suspended" | "onboarding";

export async function listRestaurants(options: {
  query?: string;
  filter?: RestaurantFilter;
  limit?: number;
}) {
  const db = getDb();
  const { query, filter = "all", limit = 50 } = options;

  const conditions = [isNull(schema.businesses.deletedAt)];

  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    conditions.push(
      or(
        ilike(schema.businesses.name, q),
        ilike(schema.businesses.slug, q),
        ilike(schema.businesses.city, q),
        ilike(schema.businesses.phone, q),
        ilike(schema.businesses.ownerName, q),
      )!,
    );
  }

  if (filter === "trial") {
    conditions.push(eq(schema.businessSettings.subscriptionPlan, "trial"));
  } else if (filter !== "all") {
    conditions.push(eq(schema.businessSettings.businessStatus, filter));
  }

  return db
    .select({
      id: schema.businesses.id,
      name: schema.businesses.name,
      slug: schema.businesses.slug,
      type: schema.businesses.type,
      city: schema.businesses.city,
      state: schema.businesses.state,
      phone: schema.businesses.phone,
      ownerName: schema.businesses.ownerName,
      createdAt: schema.businesses.createdAt,
      currency: schema.businesses.currency,
      status: schema.businessSettings.businessStatus,
      plan: schema.businessSettings.subscriptionPlan,
      trialEndsAt: schema.businessSettings.trialEndsAt,
      planExpiresAt: schema.businessSettings.planExpiresAt,
      paymentStatus: schema.paymentAccounts.status,
      orderCount: sql<number>`(
        select count(*)::int from ${schema.orders} o where o.business_id = ${OUTER_BUSINESS_ID}
      )`,
      revenue: sql<number>`(
        select coalesce(sum(p.amount), 0)::bigint from ${schema.payments} p
        where p.business_id = ${OUTER_BUSINESS_ID} and p.status = 'succeeded'
      )`,
      lastOrderAt: sql<Date | null>`(
        select max(coalesce(o.placed_at, o.created_at)) from ${schema.orders} o
        where o.business_id = ${OUTER_BUSINESS_ID}
      )`,
    })
    .from(schema.businesses)
    .leftJoin(
      schema.businessSettings,
      eq(schema.businessSettings.businessId, schema.businesses.id),
    )
    .leftJoin(
      schema.paymentAccounts,
      and(
        eq(schema.paymentAccounts.businessId, schema.businesses.id),
        eq(schema.paymentAccounts.provider, "razorpay"),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(schema.businesses.createdAt))
    .limit(limit);
}

export async function getRestaurantDetail(businessId: string) {
  const db = getDb();

  const [record] = await db
    .select({
      business: schema.businesses,
      settings: schema.businessSettings,
      account: schema.paymentAccounts,
    })
    .from(schema.businesses)
    .leftJoin(
      schema.businessSettings,
      eq(schema.businessSettings.businessId, schema.businesses.id),
    )
    .leftJoin(
      schema.paymentAccounts,
      and(
        eq(schema.paymentAccounts.businessId, schema.businesses.id),
        eq(schema.paymentAccounts.provider, "razorpay"),
      ),
    )
    .where(eq(schema.businesses.id, businessId))
    .limit(1);

  if (!record) return null;

  const [stats, recentOrders, activity, staff] = await Promise.all([
    db
      .select({
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(total) filter (where status = 'completed'), 0)::bigint`,
        menuItems: sql<number>`(select count(*)::int from ${schema.menuItems} m where m.business_id = ${businessId} and m.deleted_at is null)`,
        tables: sql<number>`(select count(*)::int from ${schema.restaurantTables} t where t.business_id = ${businessId} and t.deleted_at is null)`,
      })
      .from(schema.orders)
      .where(eq(schema.orders.businessId, businessId)),

    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        placedAt: schema.orders.placedAt,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .where(eq(schema.orders.businessId, businessId))
      .orderBy(desc(sql`coalesce(placed_at, created_at)`))
      .limit(10),

    db
      .select({
        id: schema.adminAuditLogs.id,
        action: schema.adminAuditLogs.action,
        adminEmail: schema.adminAuditLogs.adminEmail,
        metadata: schema.adminAuditLogs.metadata,
        createdAt: schema.adminAuditLogs.createdAt,
      })
      .from(schema.adminAuditLogs)
      .where(eq(schema.adminAuditLogs.businessId, businessId))
      .orderBy(desc(schema.adminAuditLogs.createdAt))
      .limit(25),

    db
      .select({
        id: schema.staffMembers.id,
        name: schema.staffMembers.name,
        email: schema.staffMembers.email,
        role: schema.staffMembers.role,
        status: schema.staffMembers.status,
      })
      .from(schema.staffMembers)
      .where(
        and(
          eq(schema.staffMembers.businessId, businessId),
          isNull(schema.staffMembers.deletedAt),
        ),
      ),
  ]);

  return {
    ...record,
    stats: stats[0] ?? { orders: 0, revenue: 0, menuItems: 0, tables: 0 },
    recentOrders,
    activity,
    staff,
  };
}

/* -------------------------------------------------------- Live monitoring */

export async function getLiveFeed() {
  const db = getDb();

  const [orders, payments, scans, failures, errors, online] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        total: schema.orders.total,
        currency: schema.orders.currency,
        placedAt: schema.orders.placedAt,
        createdAt: schema.orders.createdAt,
        businessName: schema.businesses.name,
        businessId: schema.businesses.id,
      })
      .from(schema.orders)
      .innerJoin(schema.businesses, eq(schema.orders.businessId, schema.businesses.id))
      .orderBy(desc(sql`coalesce(${schema.orders.placedAt}, ${schema.orders.createdAt})`))
      .limit(20),

    db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        status: schema.payments.status,
        method: schema.payments.method,
        createdAt: schema.payments.createdAt,
        businessName: schema.businesses.name,
      })
      .from(schema.payments)
      .innerJoin(schema.businesses, eq(schema.payments.businessId, schema.businesses.id))
      .orderBy(desc(schema.payments.createdAt))
      .limit(20),

    db
      .select({
        id: schema.qrScans.id,
        tableLabel: schema.qrScans.tableLabel,
        createdAt: schema.qrScans.createdAt,
        businessName: schema.businesses.name,
      })
      .from(schema.qrScans)
      .innerJoin(schema.businesses, eq(schema.qrScans.businessId, schema.businesses.id))
      .orderBy(desc(schema.qrScans.createdAt))
      .limit(20),

    db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        failureReason: schema.payments.failureReason,
        createdAt: schema.payments.createdAt,
        businessName: schema.businesses.name,
      })
      .from(schema.payments)
      .innerJoin(schema.businesses, eq(schema.payments.businessId, schema.businesses.id))
      .where(eq(schema.payments.status, "failed"))
      .orderBy(desc(schema.payments.createdAt))
      .limit(20),

    db
      .select({
        id: schema.errorLogs.id,
        level: schema.errorLogs.level,
        source: schema.errorLogs.source,
        message: schema.errorLogs.message,
        createdAt: schema.errorLogs.createdAt,
      })
      .from(schema.errorLogs)
      .orderBy(desc(schema.errorLogs.createdAt))
      .limit(20),

    db
      .select({
        id: schema.businesses.id,
        name: schema.businesses.name,
        lastActivity: sql<Date>`max(coalesce(o.placed_at, o.created_at))`,
        activeOrders: sql<number>`count(*) filter (where o.status in ('placed','accepted','preparing','ready'))::int`,
      })
      .from(schema.businesses)
      .innerJoin(sql`${schema.orders} o`, sql`o.business_id = ${OUTER_BUSINESS_ID}`)
      .where(sql`coalesce(o.placed_at, o.created_at) >= ${ONLINE_WINDOW}`)
      .groupBy(schema.businesses.id, schema.businesses.name)
      .orderBy(desc(sql`max(coalesce(o.placed_at, o.created_at))`))
      .limit(20),
  ]);

  return { orders, payments, scans, failures, errors, online };
}

/* ---------------------------------------------------------- Subscriptions */

export async function getSubscriptions() {
  const db = getDb();

  const [breakdown, expiring, couponRows] = await Promise.all([
    db
      .select({
        plan: schema.businessSettings.subscriptionPlan,
        status: schema.businessSettings.businessStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.businessSettings)
      .groupBy(
        schema.businessSettings.subscriptionPlan,
        schema.businessSettings.businessStatus,
      ),

    db
      .select({
        businessId: schema.businesses.id,
        name: schema.businesses.name,
        plan: schema.businessSettings.subscriptionPlan,
        status: schema.businessSettings.businessStatus,
        trialEndsAt: schema.businessSettings.trialEndsAt,
        planExpiresAt: schema.businessSettings.planExpiresAt,
      })
      .from(schema.businessSettings)
      .innerJoin(
        schema.businesses,
        eq(schema.businesses.id, schema.businessSettings.businessId),
      )
      .where(
        and(
          isNull(schema.businesses.deletedAt),
          or(
            sql`${schema.businessSettings.trialEndsAt} is not null and ${schema.businessSettings.trialEndsAt} < now() + interval '14 days'`,
            sql`${schema.businessSettings.planExpiresAt} is not null and ${schema.businessSettings.planExpiresAt} < now() + interval '14 days'`,
          )!,
        ),
      )
      .orderBy(sql`coalesce(${schema.businessSettings.trialEndsAt}, ${schema.businessSettings.planExpiresAt})`)
      .limit(40),

    db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt)).limit(50),
  ]);

  return { breakdown, expiring, coupons: couponRows };
}

/* ------------------------------------------------------ Payment monitoring */

export async function getPaymentMonitoring() {
  const db = getDb();

  const [accounts, rate, webhooks, failed] = await Promise.all([
    db
      .select({
        businessId: schema.businesses.id,
        name: schema.businesses.name,
        status: schema.paymentAccounts.status,
        accountId: schema.paymentAccounts.accountId,
        liveMode: schema.paymentAccounts.liveMode,
        connectedAt: schema.paymentAccounts.connectedAt,
        lastError: schema.paymentAccounts.lastError,
        tokenExpiresAt: schema.paymentAccounts.tokenExpiresAt,
      })
      .from(schema.businesses)
      .leftJoin(
        schema.paymentAccounts,
        and(
          eq(schema.paymentAccounts.businessId, schema.businesses.id),
          eq(schema.paymentAccounts.provider, "razorpay"),
        ),
      )
      .where(isNull(schema.businesses.deletedAt))
      .orderBy(schema.businesses.name)
      .limit(100),

    db
      .select({
        succeeded: sql<number>`count(*) filter (where status = 'succeeded')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
        pending: sql<number>`count(*) filter (where status = 'pending')::int`,
        total: sql<number>`count(*)::int`,
        volume: sql<number>`coalesce(sum(amount) filter (where status = 'succeeded'), 0)::bigint`,
      })
      .from(schema.payments)
      .where(gte(schema.payments.createdAt, sql`now() - interval '30 days'` as never)),

    db
      .select({
        id: schema.webhookEvents.id,
        eventType: schema.webhookEvents.eventType,
        eventId: schema.webhookEvents.eventId,
        status: schema.webhookEvents.status,
        attempts: schema.webhookEvents.attempts,
        lastError: schema.webhookEvents.lastError,
        signatureValid: schema.webhookEvents.signatureValid,
        providerOrderId: schema.webhookEvents.providerOrderId,
        createdAt: schema.webhookEvents.createdAt,
      })
      .from(schema.webhookEvents)
      .where(inArray(schema.webhookEvents.status, ["failed", "rejected"]))
      .orderBy(desc(schema.webhookEvents.createdAt))
      .limit(50),

    db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        failureReason: schema.payments.failureReason,
        createdAt: schema.payments.createdAt,
        businessName: schema.businesses.name,
        orderNumber: schema.orders.orderNumber,
      })
      .from(schema.payments)
      .innerJoin(schema.businesses, eq(schema.payments.businessId, schema.businesses.id))
      .innerJoin(schema.orders, eq(schema.payments.orderId, schema.orders.id))
      .where(eq(schema.payments.status, "failed"))
      .orderBy(desc(schema.payments.createdAt))
      .limit(50),
  ]);

  const r = rate[0];
  return {
    accounts,
    rate: {
      ...r,
      volume: Number(r?.volume ?? 0),
      successRate: r && r.total > 0 ? Math.round((r.succeeded / r.total) * 100) : null,
    },
    webhooks,
    failed,
  };
}

/* ---------------------------------------------------------------- Analytics */

export async function getPlatformAnalytics(days = 30) {
  const db = getDb();
  const since = sql.raw(`now() - interval '${days} days'`);

  const [daily, monthly, topRestaurants, retention, activeUsers] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(paid_at::date, 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(amount), 0)::bigint`,
        payments: sql<number>`count(*)::int`,
      })
      .from(schema.payments)
      .where(and(eq(schema.payments.status, "succeeded"), sql`paid_at >= ${since}`))
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        month: sql<string>`to_char(date_trunc('month', paid_at), 'YYYY-MM')`,
        revenue: sql<number>`coalesce(sum(amount), 0)::bigint`,
        payments: sql<number>`count(*)::int`,
      })
      .from(schema.payments)
      .where(eq(schema.payments.status, "succeeded"))
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`)
      .limit(12),

    db
      .select({
        businessId: schema.businesses.id,
        name: schema.businesses.name,
        revenue: sql<number>`coalesce(sum(p.amount), 0)::bigint`,
        orders: sql<number>`count(distinct p.order_id)::int`,
      })
      .from(schema.businesses)
      .innerJoin(sql`${schema.payments} p`, sql`p.business_id = ${OUTER_BUSINESS_ID}`)
      .where(sql`p.status = 'succeeded'`)
      .groupBy(schema.businesses.id, schema.businesses.name)
      .orderBy(desc(sql`coalesce(sum(p.amount), 0)`))
      .limit(10),

    db
      .select({
        signedUp: sql<number>`count(*)::int`,
        orderedEver: sql<number>`count(*) filter (where exists (select 1 from ${schema.orders} o where o.business_id = ${OUTER_BUSINESS_ID}))::int`,
        orderedLast30: sql<number>`count(*) filter (where exists (select 1 from ${schema.orders} o where o.business_id = ${OUTER_BUSINESS_ID} and coalesce(o.placed_at, o.created_at) >= now() - interval '30 days'))::int`,
      })
      .from(schema.businesses)
      .where(isNull(schema.businesses.deletedAt)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users),
  ]);

  const totalRevenue = monthly.reduce((sum, m) => sum + Number(m.revenue), 0);
  const thisMonth = Number(monthly[0]?.revenue ?? 0);
  const lastMonth = Number(monthly[1]?.revenue ?? 0);
  const growth =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  return {
    daily: daily.map((d) => ({ ...d, revenue: Number(d.revenue) })),
    monthly: monthly.map((m) => ({ ...m, revenue: Number(m.revenue) })).reverse(),
    topRestaurants: topRestaurants.map((r) => ({ ...r, revenue: Number(r.revenue) })),
    retention: retention[0] ?? { signedUp: 0, orderedEver: 0, orderedLast30: 0 },
    activeUsers: activeUsers[0]?.count ?? 0,
    totals: { totalRevenue, thisMonth, lastMonth, growth },
    days,
  };
}

/* ----------------------------------------------------------------- Security */

export async function getAuditLogs(limit = 100) {
  const db = getDb();
  return db
    .select({
      id: schema.adminAuditLogs.id,
      action: schema.adminAuditLogs.action,
      adminEmail: schema.adminAuditLogs.adminEmail,
      targetType: schema.adminAuditLogs.targetType,
      targetId: schema.adminAuditLogs.targetId,
      metadata: schema.adminAuditLogs.metadata,
      ipAddress: schema.adminAuditLogs.ipAddress,
      createdAt: schema.adminAuditLogs.createdAt,
      businessName: schema.businesses.name,
    })
    .from(schema.adminAuditLogs)
    .leftJoin(
      schema.businesses,
      eq(schema.adminAuditLogs.businessId, schema.businesses.id),
    )
    .orderBy(desc(schema.adminAuditLogs.createdAt))
    .limit(limit);
}

export async function getAdmins() {
  const db = getDb();
  return db
    .select({
      id: schema.platformAdmins.id,
      role: schema.platformAdmins.role,
      status: schema.platformAdmins.status,
      lastSeenAt: schema.platformAdmins.lastSeenAt,
      createdAt: schema.platformAdmins.createdAt,
      email: schema.users.email,
      fullName: schema.users.fullName,
    })
    .from(schema.platformAdmins)
    .innerJoin(schema.users, eq(schema.platformAdmins.userId, schema.users.id))
    .orderBy(schema.platformAdmins.createdAt);
}

export async function getImpersonationSessions(limit = 30) {
  const db = getDb();
  return db
    .select({
      id: schema.impersonationSessions.id,
      adminEmail: schema.impersonationSessions.adminEmail,
      reason: schema.impersonationSessions.reason,
      expiresAt: schema.impersonationSessions.expiresAt,
      revokedAt: schema.impersonationSessions.revokedAt,
      createdAt: schema.impersonationSessions.createdAt,
      businessName: schema.businesses.name,
      businessId: schema.impersonationSessions.businessId,
    })
    .from(schema.impersonationSessions)
    .innerJoin(
      schema.businesses,
      eq(schema.impersonationSessions.businessId, schema.businesses.id),
    )
    .orderBy(desc(schema.impersonationSessions.createdAt))
    .limit(limit);
}

/* --------------------------------------------------- Notifications/settings */

export async function getNotifications(limit = 50) {
  const db = getDb();
  return db
    .select({
      id: schema.platformNotifications.id,
      title: schema.platformNotifications.title,
      body: schema.platformNotifications.body,
      level: schema.platformNotifications.level,
      isMaintenanceBanner: schema.platformNotifications.isMaintenanceBanner,
      publishedAt: schema.platformNotifications.publishedAt,
      expiresAt: schema.platformNotifications.expiresAt,
      createdByEmail: schema.platformNotifications.createdByEmail,
      businessName: schema.businesses.name,
    })
    .from(schema.platformNotifications)
    .leftJoin(
      schema.businesses,
      eq(schema.platformNotifications.businessId, schema.businesses.id),
    )
    .where(isNull(schema.platformNotifications.deletedAt))
    .orderBy(desc(schema.platformNotifications.publishedAt))
    .limit(limit);
}

export async function getPlatformSettings() {
  const db = getDb();
  return db
    .select()
    .from(schema.platformSettings)
    .orderBy(schema.platformSettings.namespace, schema.platformSettings.key);
}

export { ACTIVE_ORDER_STATUSES };
