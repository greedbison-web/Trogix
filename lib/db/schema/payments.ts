import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { paymentStatusEnum, paymentMethodEnum } from "./enums";
import { businesses } from "./businesses";
import { orders } from "./orders";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),

    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    method: paymentMethodEnum("method"),

    /** Gateway identifiers. */
    provider: text("provider"),
    providerPaymentId: text("provider_payment_id"),
    providerOrderId: text("provider_order_id"),
    providerSignature: text("provider_signature"),
    providerPayload: jsonb("provider_payload"),

    failureReason: text("failure_reason"),
    refundedAmount: integer("refunded_amount").notNull().default(0),

    paidAt: timestamp("paid_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    index("payments_business_id_idx").on(t.businessId),
    index("payments_order_id_idx").on(t.orderId),
    index("payments_status_idx").on(t.businessId, t.status),
    uniqueIndex("payments_provider_payment_id_key").on(t.providerPaymentId),
  ],
);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),

    /** Per-business sequence for tax purposes. */
    receiptNumber: text("receipt_number").notNull(),
    /** Immutable rendering of the bill at issue time. */
    snapshot: jsonb("snapshot").notNull(),
    pdfUrl: text("pdf_url"),

    issuedTo: text("issued_to"),
    issuedEmail: text("issued_email"),
    issuedPhone: text("issued_phone"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    ...timestamps,
  },
  (t) => [
    index("receipts_business_id_idx").on(t.businessId),
    index("receipts_payment_id_idx").on(t.paymentId),
    uniqueIndex("receipts_business_number_key").on(t.businessId, t.receiptNumber),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
