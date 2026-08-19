import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isPreview } from "@/lib/preview/mode";

export type OrderStatus =
  | "draft" | "placed" | "accepted" | "preparing"
  | "ready" | "served" | "completed" | "cancelled";

export const ACTIVE_STATUSES: OrderStatus[] = [
  "placed", "accepted", "preparing", "ready",
];

export type OrderLine = {
  id: string;
  nameSnapshot: string;
  variantSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
  status: string;
};

export type OrderRow = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  type: "dine_in" | "takeaway" | "delivery";
  tableLabel: string | null;
  guestName: string | null;
  guestPhone: string | null;
  notes: string | null;
  kitchenNote: string | null;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  placedAt: Date | null;
  completedAt: Date | null;
  paymentStatus: string | null;
  items: OrderLine[];
};

async function hydrate(
  businessId: string,
  where: ReturnType<typeof and>,
  limit: number,
): Promise<OrderRow[]> {
  const db = getDb();

  const orders = await db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      status: schema.orders.status,
      type: schema.orders.type,
      guestName: schema.orders.guestName,
      guestPhone: schema.orders.guestPhone,
      notes: schema.orders.notes,
      kitchenNote: schema.orders.kitchenNote,
      subtotal: schema.orders.subtotal,
      taxAmount: schema.orders.taxAmount,
      serviceChargeAmount: schema.orders.serviceChargeAmount,
      total: schema.orders.total,
      placedAt: schema.orders.placedAt,
      completedAt: schema.orders.completedAt,
      tableLabel: schema.restaurantTables.label,
      paymentStatus: sql<string | null>`(
        select p.status from ${schema.payments} p
        where p.order_id = ${schema.orders.id}
        order by p.created_at desc limit 1
      )`,
    })
    .from(schema.orders)
    .leftJoin(
      schema.restaurantTables,
      eq(schema.orders.tableId, schema.restaurantTables.id),
    )
    .where(where)
    .orderBy(desc(sql`coalesce(${schema.orders.placedAt}, ${schema.orders.createdAt})`))
    .limit(limit);

  if (orders.length === 0) return [];

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(
      and(
        eq(schema.orderItems.businessId, businessId),
        inArray(schema.orderItems.orderId, orders.map((o) => o.id)),
      ),
    );

  const byOrder = new Map<string, OrderLine[]>();
  for (const item of items) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push({
      id: item.id,
      nameSnapshot: item.nameSnapshot,
      variantSnapshot: item.variantSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      notes: item.notes,
      status: item.status,
    });
    byOrder.set(item.orderId, list);
  }

  return orders.map((order) => ({
    ...order,
    items: byOrder.get(order.id) ?? [],
  })) as OrderRow[];
}

/** Everything currently on the pass. */
export async function getActiveOrders(businessId: string) {
  if (isPreview()) return (await import("@/lib/preview/data")).previewActiveOrders;
  return hydrate(
    businessId,
    and(
      eq(schema.orders.businessId, businessId),
      inArray(schema.orders.status, ACTIVE_STATUSES),
    ),
    60,
  );
}

export async function getOrders(
  businessId: string,
  filter: "active" | "today" | "all",
  timezone: string,
) {
  if (filter === "active") return getActiveOrders(businessId);

  if (isPreview()) {
    const { previewOrders } = await import("@/lib/preview/data");
    return filter === "today"
      ? previewOrders.filter((o) => o.placedAt !== null)
      : previewOrders;
  }

  const startOfDay = sql`(date_trunc('day', now() AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone})`;

  return hydrate(
    businessId,
    filter === "today"
      ? and(
          eq(schema.orders.businessId, businessId),
          gte(schema.orders.placedAt, startOfDay as never),
        )
      : eq(schema.orders.businessId, businessId),
    100,
  );
}


export type TimelineEntry = {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: Date;
};

/** Full history for one order, oldest first. */
export async function getOrderTimeline(
  businessId: string,
  orderId: string,
): Promise<TimelineEntry[]> {
  try {
    const db = getDb();
    return await db
      .select({
        id: schema.orderEvents.id,
        type: schema.orderEvents.type,
        fromStatus: schema.orderEvents.fromStatus,
        toStatus: schema.orderEvents.toStatus,
        note: schema.orderEvents.note,
        createdAt: schema.orderEvents.createdAt,
      })
      .from(schema.orderEvents)
      .where(
        and(
          eq(schema.orderEvents.businessId, businessId),
          eq(schema.orderEvents.orderId, orderId),
        ),
      )
      .orderBy(schema.orderEvents.createdAt);
  } catch {
    return [];
  }
}

/** Timelines for many orders in one round trip. */
export async function getTimelines(businessId: string, orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, TimelineEntry[]>();
  if (isPreview()) return (await import("@/lib/preview/data")).previewTimelines();
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.orderEvents.id,
        orderId: schema.orderEvents.orderId,
        type: schema.orderEvents.type,
        fromStatus: schema.orderEvents.fromStatus,
        toStatus: schema.orderEvents.toStatus,
        note: schema.orderEvents.note,
        createdAt: schema.orderEvents.createdAt,
      })
      .from(schema.orderEvents)
      .where(
        and(
          eq(schema.orderEvents.businessId, businessId),
          inArray(schema.orderEvents.orderId, orderIds),
        ),
      )
      .orderBy(schema.orderEvents.createdAt);

    const byOrder = new Map<string, TimelineEntry[]>();
    for (const row of rows) {
      const list = byOrder.get(row.orderId) ?? [];
      list.push(row);
      byOrder.set(row.orderId, list);
    }
    return byOrder;
  } catch {
    return new Map<string, TimelineEntry[]>();
  }
}
