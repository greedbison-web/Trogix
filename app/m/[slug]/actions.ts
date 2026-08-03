"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { priceOrder, type PricedLine } from "@/lib/pricing";
import { createRazorpayOrder } from "@/lib/razorpay/api";

const lineSchema = z.object({
  itemId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int().min(1).max(50),
});

const placeOrderSchema = z.object({
  slug: z.string().min(1),
  tableToken: z.string().optional().nullable(),
  guestName: z.string().trim().max(80).optional(),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(280).optional(),
  lines: z.array(lineSchema).min(1, "Your order is empty."),
});

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: number;
      total: number;
      currency: string;
      /** Razorpay checkout handover — the charge lives on the restaurant's account. */
      checkout: {
        keyId: string;
        razorpayOrderId: string;
        businessName: string;
      };
    }
  | { ok: false; message: string };

/**
 * Prices the order server-side from the database. Client-supplied prices are
 * never trusted — only item ids and quantities cross the wire.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid order." };
  }
  const { slug, tableToken, guestName, guestPhone, notes, lines } = parsed.data;

  let db;
  try {
    db = getDb();
  } catch {
    return { ok: false, message: "Ordering is unavailable right now." };
  }

  const [venue] = await db
    .select({
      businessId: schema.businesses.id,
      businessName: schema.businesses.name,
      currency: schema.businesses.currency,
      serviceCharge: schema.businessSettings.serviceCharge,
      taxEnabled: schema.businessSettings.taxEnabled,
    })
    .from(schema.businesses)
    .leftJoin(
      schema.businessSettings,
      eq(schema.businessSettings.businessId, schema.businesses.id),
    )
    .where(and(eq(schema.businesses.slug, slug), isNull(schema.businesses.deletedAt)))
    .limit(1);

  if (!venue) return { ok: false, message: "Restaurant not found." };

  let tableId: string | null = null;
  if (tableToken) {
    const [table] = await db
      .select({ id: schema.restaurantTables.id })
      .from(schema.restaurantTables)
      .where(
        and(
          eq(schema.restaurantTables.businessId, venue.businessId),
          eq(schema.restaurantTables.qrToken, tableToken),
          isNull(schema.restaurantTables.deletedAt),
        ),
      )
      .limit(1);
    tableId = table?.id ?? null;
  }

  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  const items = await db
    .select()
    .from(schema.menuItems)
    .where(
      and(
        eq(schema.menuItems.businessId, venue.businessId),
        isNull(schema.menuItems.deletedAt),
      ),
    );
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const variants = await db
    .select()
    .from(schema.itemVariants)
    .where(
      and(
        eq(schema.itemVariants.businessId, venue.businessId),
        isNull(schema.itemVariants.deletedAt),
      ),
    );
  const variantsById = new Map(variants.map((v) => [v.id, v]));

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const item = itemsById.get(line.itemId);
    if (!item || !item.isAvailable) {
      return { ok: false, message: "An item in your order is no longer available." };
    }
    const variant = line.variantId ? variantsById.get(line.variantId) : undefined;
    if (line.variantId && (!variant || variant.menuItemId !== item.id)) {
      return { ok: false, message: "An option in your order is no longer available." };
    }
    const unitPrice = item.price + (variant?.priceDelta ?? 0);
    priced.push({
      itemId: item.id,
      variantId: variant?.id ?? null,
      quantity: line.quantity,
      name: item.name,
      variantName: variant?.name ?? null,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
    });
  }

  if (!itemIds.length || !priced.length) {
    return { ok: false, message: "Your order is empty." };
  }

  const totals = priceOrder(priced, {
    serviceChargeBps: venue.serviceCharge ?? 0,
    taxEnabled: venue.taxEnabled ?? true,
  });

  try {
    const created = await db.transaction(async (tx) => {
      const [{ next }] = await tx
        .select({
          next: sql<number>`coalesce(max(${schema.orders.orderNumber}), 0) + 1`,
        })
        .from(schema.orders)
        .where(eq(schema.orders.businessId, venue.businessId));

      const [order] = await tx
        .insert(schema.orders)
        .values({
          businessId: venue.businessId,
          tableId,
          orderNumber: next,
          status: "awaiting_payment",
          type: tableId ? "dine_in" : "takeaway",
          guestName: guestName || null,
          guestPhone: guestPhone || null,
          notes: notes || null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          serviceChargeAmount: totals.serviceChargeAmount,
          total: totals.total,
          currency: venue.currency,
        })
        .returning({
          id: schema.orders.id,
          orderNumber: schema.orders.orderNumber,
        });

      await tx.insert(schema.orderItems).values(
        priced.map((line) => ({
          businessId: venue.businessId,
          orderId: order.id,
          menuItemId: line.itemId,
          variantId: line.variantId,
          nameSnapshot: line.name,
          variantSnapshot: line.variantName,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
      );

      return order;
    });

    // The charge is created ON the restaurant's Razorpay account.
    const charge = await createRazorpayOrder(venue.businessId, {
      amount: totals.total,
      currency: venue.currency,
      receipt: `order-${created.orderNumber}`,
      notes: {
        trogix_order_id: created.id,
        order_number: String(created.orderNumber),
      },
    });

    if (!charge || !charge.publicKey) {
      await db
        .update(schema.orders)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(schema.orders.id, created.id));
      return {
        ok: false,
        message:
          "This restaurant cannot take payments right now. Please speak to your server.",
      };
    }

    await db.insert(schema.payments).values({
      businessId: venue.businessId,
      orderId: created.id,
      amount: totals.total,
      currency: venue.currency,
      status: "pending",
      provider: "razorpay",
      providerOrderId: charge.order.id,
      accountId: charge.accountId,
    });

    return {
      ok: true,
      orderId: created.id,
      orderNumber: created.orderNumber,
      total: totals.total,
      currency: venue.currency,
      checkout: {
        keyId: charge.publicKey,
        razorpayOrderId: charge.order.id,
        businessName: venue.businessName,
      },
    };
  } catch {
    return { ok: false, message: "Could not place your order. Please try again." };
  }
}

/** Poll target for the guest confirmation screen. Webhook is authoritative. */
export async function getOrderPaymentState(orderId: string) {
  try {
    const db = getDb();
    const [row] = await db
      .select({
        orderStatus: schema.orders.status,
        paymentStatus: schema.payments.status,
      })
      .from(schema.orders)
      .leftJoin(schema.payments, eq(schema.payments.orderId, schema.orders.id))
      .where(eq(schema.orders.id, orderId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
