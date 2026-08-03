import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { queueMessage } from "@/lib/messaging/send";

export type ProcessResult = { ok: boolean; message: string | null };

type PaymentEntity = {
  id?: string;
  order_id?: string;
  status?: string;
  method?: string;
  amount?: number;
  error_description?: string;
};

function normaliseMethod(method: string | undefined) {
  switch (method) {
    case "upi":
      return "upi" as const;
    case "card":
      return "card" as const;
    case "netbanking":
      return "netbanking" as const;
    case "wallet":
      return "wallet" as const;
    default:
      return null;
  }
}

/**
 * Applies a Razorpay payment event to our records.
 *
 * Shared by live webhook delivery and by admin retry, so a replayed event
 * takes exactly the same path as the original. Idempotent throughout: safe to
 * call any number of times with the same payload.
 */
export async function processRazorpayEvent(
  event: Record<string, unknown>,
  eventId: string | null,
): Promise<ProcessResult> {
  const name = typeof event.event === "string" ? event.event : "";
  const payload = event.payload as
    | { payment?: { entity?: PaymentEntity } }
    | undefined;
  const entity = payload?.payment?.entity;

  if (!entity?.order_id) {
    return { ok: true, message: "No payment entity; nothing to apply." };
  }

  const db = getDb();

  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.providerOrderId, entity.order_id))
    .limit(1);

  if (!payment) {
    return { ok: true, message: "No matching payment; ignored." };
  }

  if (eventId && payment.providerEventId === eventId) {
    return { ok: true, message: "Duplicate event; already applied." };
  }
  if (payment.status === "succeeded" && name === "payment.captured") {
    return { ok: true, message: "Already captured." };
  }

  const captured = name === "payment.captured" || entity.status === "captured";
  const failed = name === "payment.failed" || entity.status === "failed";

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.payments)
        .set({
          status: captured ? "succeeded" : failed ? "failed" : "processing",
          method: normaliseMethod(entity.method),
          providerPaymentId: entity.id ?? payment.providerPaymentId,
          providerEventId: eventId ?? payment.providerEventId,
          providerPayload: event as never,
          failureReason: failed ? (entity.error_description ?? "Payment failed") : null,
          paidAt: captured ? new Date() : payment.paidAt,
        })
        .where(eq(schema.payments.id, payment.id));

      if (!captured) return;

      const [order] = await tx
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, payment.orderId))
        .limit(1);
      if (!order) return;

      // Paid orders are confirmed automatically and released to the kitchen.
      if (order.status === "awaiting_payment" || order.status === "draft") {
        await tx
          .update(schema.orders)
          .set({ status: "placed", placedAt: order.placedAt ?? new Date() })
          .where(eq(schema.orders.id, order.id));

        if (order.tableId) {
          await tx
            .update(schema.restaurantTables)
            .set({ status: "seated" })
            .where(eq(schema.restaurantTables.id, order.tableId));
        }
      }

      const [existing] = await tx
        .select({ id: schema.receipts.id })
        .from(schema.receipts)
        .where(eq(schema.receipts.paymentId, payment.id))
        .limit(1);
      if (existing) return;

      const lines = await tx
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      const [{ next }] = await tx
        .select({ next: sql<number>`count(*) + 1` })
        .from(schema.receipts)
        .where(eq(schema.receipts.businessId, order.businessId));

      await tx.insert(schema.receipts).values({
        businessId: order.businessId,
        paymentId: payment.id,
        receiptNumber: `R-${String(next).padStart(5, "0")}`,
        snapshot: {
          orderNumber: order.orderNumber,
          placedAt: order.placedAt,
          subtotal: order.subtotal,
          serviceChargeAmount: order.serviceChargeAmount,
          taxAmount: order.taxAmount,
          total: order.total,
          currency: order.currency,
          method: normaliseMethod(entity.method),
          providerPaymentId: entity.id ?? null,
          lines: lines.map((line) => ({
            name: line.nameSnapshot,
            variant: line.variantSnapshot,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
        issuedTo: order.guestName,
        issuedPhone: order.guestPhone,
      });
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Processing failed.",
    };
  }

  if (captured) await notifyGuest(payment.orderId, "order_confirmed");
  if (failed) await notifyGuest(payment.orderId, "payment_failed");

  return { ok: true, message: null };
}

/** Sends the guest an update on both channels we hold contact details for. */
export async function notifyGuest(
  orderId: string,
  template: "order_confirmed" | "order_ready" | "order_completed" | "payment_failed",
) {
  try {
    const db = getDb();
    const [row] = await db
      .select({
        businessId: schema.orders.businessId,
        orderNumber: schema.orders.orderNumber,
        guestName: schema.orders.guestName,
        guestPhone: schema.orders.guestPhone,
        total: schema.orders.total,
        currency: schema.orders.currency,
        businessName: schema.businesses.name,
        tableLabel: schema.restaurantTables.label,
      })
      .from(schema.orders)
      .innerJoin(schema.businesses, eq(schema.orders.businessId, schema.businesses.id))
      .leftJoin(
        schema.restaurantTables,
        eq(schema.orders.tableId, schema.restaurantTables.id),
      )
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!row) return;

    const context = {
      businessName: row.businessName,
      orderNumber: row.orderNumber,
      tableLabel: row.tableLabel,
      guestName: row.guestName,
      total: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: row.currency,
        maximumFractionDigits: 0,
      }).format(row.total / 100),
    };

    await queueMessage({
      businessId: row.businessId,
      orderId,
      channel: "whatsapp",
      recipient: row.guestPhone ? `91${row.guestPhone}` : null,
      template,
      context,
    });
  } catch {
    // Messaging never blocks payment processing.
  }
}

/** Best-effort platform error stream, surfaced in admin live monitoring. */
export async function logPlatformError(
  source: string,
  message: string,
  detail: { stack?: string; businessId?: string; context?: Record<string, unknown> } = {},
) {
  try {
    const db = getDb();
    await db.insert(schema.errorLogs).values({
      level: "error",
      source,
      message,
      stack: detail.stack ?? null,
      businessId: detail.businessId ?? null,
      context: detail.context ?? null,
    });
  } catch {
    // Never let logging break the caller.
  }
}
