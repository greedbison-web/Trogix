import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { paymentAccountStatusEnum } from "./enums";
import { businesses } from "./businesses";

/**
 * A restaurant's own payment gateway account.
 *
 * Trogix is never a party to the funds: we hold an OAuth grant that lets us
 * create orders ON the restaurant's Razorpay account, and settlement goes from
 * Razorpay straight to the restaurant's registered bank account. No platform
 * account, no escrow, no payouts.
 *
 * Tokens are encrypted at rest (AES-256-GCM) — see lib/crypto.ts.
 */
export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    provider: text("provider").notNull().default("razorpay"),
    status: paymentAccountStatusEnum("status").notNull().default("disconnected"),

    /** Razorpay merchant id of the restaurant (acc_… / merchant id). */
    accountId: text("account_id"),
    accountName: text("account_name"),
    accountEmail: text("account_email"),

    /** The publishable key of the restaurant's account, sent to the browser. */
    publicKey: text("public_key"),

    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

    liveMode: boolean("live_mode").notNull().default(false),

    connectedAt: timestamp("connected_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastError: text("last_error"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("payment_accounts_business_provider_key").on(t.businessId, t.provider),
    index("payment_accounts_account_id_idx").on(t.accountId),
  ],
);

export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type NewPaymentAccount = typeof paymentAccounts.$inferInsert;
