import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay/webhook";
import { processRazorpayEvent, logPlatformError } from "@/lib/razorpay/process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Razorpay webhook — the ONLY thing that marks an order paid.
 *
 * Every delivery is recorded in `webhook_events` so the admin platform can see
 * failures and replay them. Rejected signatures are recorded too, but flagged
 * `signature_valid = false` and are never retryable.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") || null;

  let event: Record<string, unknown> = {};
  try {
    event = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const valid = verifyWebhookSignature(raw, signature);

  let db;
  try {
    db = getDb();
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const eventType = typeof event.event === "string" ? event.event : null;
  const entity = (
    event.payload as { payment?: { entity?: { order_id?: string } } } | undefined
  )?.payment?.entity;
  const providerOrderId = entity?.order_id ?? null;

  // Resolve the tenant so the admin views can attribute the event.
  let businessId: string | null = null;
  if (providerOrderId) {
    const [payment] = await db
      .select({ businessId: schema.payments.businessId })
      .from(schema.payments)
      .where(eq(schema.payments.providerOrderId, providerOrderId))
      .limit(1);
    businessId = payment?.businessId ?? null;
  }

  const recordEvent = async (
    status: "processed" | "failed" | "rejected",
    lastError: string | null,
  ) => {
    try {
      await db
        .insert(schema.webhookEvents)
        .values({
          provider: "razorpay",
          eventId,
          eventType,
          businessId,
          providerOrderId,
          signatureValid: valid,
          status,
          lastError,
          payload: event as never,
          processedAt: status === "processed" ? new Date() : null,
        })
        .onConflictDoNothing();
    } catch {
      // The event still gets processed; only the audit copy is lost.
    }
  };

  if (!valid) {
    await recordEvent("rejected", "Signature verification failed.");
    await logPlatformError("razorpay.webhook", "Rejected webhook signature", {
      context: { eventId, eventType },
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const result = await processRazorpayEvent(event, eventId);
  await recordEvent(result.ok ? "processed" : "failed", result.ok ? null : result.message);

  if (!result.ok) {
    await logPlatformError("razorpay.webhook", result.message ?? "Processing failed", {
      businessId: businessId ?? undefined,
      context: { eventId, eventType },
    });
    // 500 asks Razorpay to retry; every step above is idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
