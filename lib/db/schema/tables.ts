import {
  pgTable,
  uuid,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps, softDelete } from "./_shared";
import { tableStatusEnum } from "./enums";
import { businesses } from "./businesses";

export const restaurantTables = pgTable(
  "restaurant_tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    /** Display label, e.g. "12" or "Terrace 3". */
    label: text("label").notNull(),
    section: text("section"),
    seats: integer("seats").notNull().default(2),
    status: tableStatusEnum("status").notNull().default("available"),
    /** Opaque token embedded in the QR/NFC target. */
    qrToken: text("qr_token").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("restaurant_tables_business_id_idx").on(t.businessId),
    uniqueIndex("restaurant_tables_qr_token_key").on(t.qrToken),
    uniqueIndex("restaurant_tables_business_label_key").on(t.businessId, t.label),
  ],
);

export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type NewRestaurantTable = typeof restaurantTables.$inferInsert;
