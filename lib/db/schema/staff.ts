import { pgTable, uuid, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps, softDelete } from "./_shared";
import { staffRoleEnum, staffStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { users } from "./users";

export const staffMembers = pgTable(
  "staff_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Null until the invite is accepted. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    role: staffRoleEnum("role").notNull().default("waiter"),
    status: staffStatusEnum("status").notNull().default("invited"),
    /** 4-6 digit PIN hash for shared-terminal login. */
    pinHash: text("pin_hash"),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("staff_members_business_id_idx").on(t.businessId),
    index("staff_members_user_id_idx").on(t.userId),
    uniqueIndex("staff_members_business_email_key").on(t.businessId, t.email),
  ],
);

export type StaffMember = typeof staffMembers.$inferSelect;
export type NewStaffMember = typeof staffMembers.$inferInsert;
