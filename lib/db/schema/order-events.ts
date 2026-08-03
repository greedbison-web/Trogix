import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { orders } from "./orders";

/** Append-only timeline of everything that happened to an order. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text("note"),
    actor: text("actor"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("order_events_order_id_idx").on(t.orderId),
    index("order_events_business_id_idx").on(t.businessId),
  ],
);

export type OrderEvent = typeof orderEvents.$inferSelect;
