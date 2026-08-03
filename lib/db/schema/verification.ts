import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { users } from "./users";

/**
 * One live OTP challenge per account.
 *
 * The row survives a consumed or invalidated code so the resend counter and
 * the temporary block cannot be reset by simply asking for a new code. Only
 * `code_hash` is ever written — never the code itself — and the hash is a
 * keyed HMAC, so a database leak alone does not let an attacker reverse a
 * six-digit code by brute force.
 */
export const verificationChallenges = pgTable(
  "verification_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Address the live code was sent to, captured at issue time. */
    email: text("email").notNull(),
    phone: text("phone").notNull(),

    /** HMAC-SHA256 of the code. Null once consumed or invalidated. */
    codeHash: text("code_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    attempts: integer("attempts").notNull().default(0),
    resendCount: integer("resend_count").notNull().default(0),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    /** Set when the resend ceiling is hit; blocks new code generation. */
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),

    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    requestIp: text("request_ip"),
    userAgent: text("user_agent"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("verification_challenges_user_id_key").on(t.userId),
    index("verification_challenges_expires_at_idx").on(t.expiresAt),
  ],
);

/**
 * Fixed-window counters for server-side rate limiting.
 *
 * Kept in Postgres rather than process memory because every serverless
 * instance would otherwise carry its own allowance, which is no limit at all.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    /** `scope:subject`, e.g. `otp.request:ip:1.2.3.4`. */
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("rate_limits_window_started_at_idx").on(t.windowStartedAt)],
);

export type VerificationChallenge = typeof verificationChallenges.$inferSelect;
export type NewVerificationChallenge =
  typeof verificationChallenges.$inferInsert;
