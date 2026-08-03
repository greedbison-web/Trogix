import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";

/**
 * Profile mirror of auth.users. Kept in the public schema so business tables
 * can hold real foreign keys; rows are created by a trigger on signup.
 *
 * Email and phone are both unique. The verification timestamps are written
 * only by the OTP service after a code was proved — never from a flag the
 * client supplied.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),

    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    /** Address the successful verification was performed from. */
    verifiedIp: text("verified_ip"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_key").on(t.email),
    uniqueIndex("users_phone_key").on(t.phone),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
