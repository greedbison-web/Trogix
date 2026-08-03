import { pgTable, uuid, text, index } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";

/**
 * Profile mirror of auth.users. Kept in the public schema so business tables
 * can hold real foreign keys; rows are created by a trigger on signup.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    ...timestamps,
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
