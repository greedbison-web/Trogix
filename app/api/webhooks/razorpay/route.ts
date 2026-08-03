import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay/webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Razorpay webhook — the ONLY thing that marks an order paid.
 *
 * The browser's checkout callback is treated as a hint for the guest's UI, not
 * as proof of payment. Capture confirms the order and releases it to the
 * kitchen; failure leaves the order awaiting payment.
 *
 * Handlers are idempotent: Razorpay retries, and `provider_event_id` plus the
 * unique index on `provider_payment_id` make replays harmless.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          status?: string;
          method?: string;
          amount?: number;
          error_description?: string;
        };
      };
    };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const name = event.event ?? "";
  const entity = event.payload?.payment?.entity;

  if (!entity?.order_id) {
    // Not a payment event we act on — acknowledge so Razorpay stops retrying.
    return NextResponse.json({ received: true });
  }

  let db;
  try {
    db = getDb();
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // Locate the pending payment by the gateway order id we created.
  const [payment] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.providerOrderId, entity.order_id))
    .limit(1);

  if (!payment) return NextResponse.json({ received: true });

  // Replay guard.
  if (eventId && payment.providerEventId === eventId) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (payment.status === "succeeded" && name === "payment.captured") {
    return NextResponse.json({ received: true, duplicate: true });
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
          providerEventId: eventId || payment.providerEventId,
          providerPayload: event as unknown as Record<string, unknown>,
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

      // Confirm automatically: paid orders go straight onto the pass.
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

      // Issue the receipt once.
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
  } catch {
    // 500 asks Razorpay to retry — safe because every step above is idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

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
