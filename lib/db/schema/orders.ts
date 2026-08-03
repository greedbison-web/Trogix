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
import { orderStatusEnum, orderTypeEnum, orderItemStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { restaurantTables } from "./tables";
import { menuItems, itemVariants } from "./menu";
import { staffMembers } from "./staff";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Null for takeaway and delivery. */
    tableId: uuid("table_id").references(() => restaurantTables.id, {
      onDelete: "set null",
    }),
    staffId: uuid("staff_id").references(() => staffMembers.id, {
      onDelete: "set null",
    }),

    /** Per-business sequence, e.g. 1043. Shown to guests and the kitchen. */
    orderNumber: integer("order_number").notNull(),
    status: orderStatusEnum("status").notNull().default("draft"),
    type: orderTypeEnum("type").notNull().default("dine_in"),

    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    notes: text("notes"),

    // Money in minor units, frozen at placement.
    subtotal: integer("subtotal").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    serviceChargeAmount: integer("service_charge_amount").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    total: integer("total").notNull().default(0),
    currency: text("currency").notNull().default("INR"),

    placedAt: timestamp("placed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    index("orders_business_id_idx").on(t.businessId),
    index("orders_table_id_idx").on(t.tableId),
    index("orders_status_idx").on(t.businessId, t.status),
    index("orders_placed_at_idx").on(t.businessId, t.placedAt),
    uniqueIndex("orders_business_number_key").on(t.businessId, t.orderNumber),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Kept if the menu item is later archived. */
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
      onDelete: "set null",
    }),
    variantId: uuid("variant_id").references(() => itemVariants.id, {
      onDelete: "set null",
    }),

    /** Snapshot — the menu may change after the order is placed. */
    nameSnapshot: text("name_snapshot").notNull(),
    variantSnapshot: text("variant_snapshot"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull().default(1),
    lineTotal: integer("line_total").notNull(),

    notes: text("notes"),
    status: orderItemStatusEnum("status").notNull().default("pending"),

    ...timestamps,
  },
  (t) => [
    index("order_items_business_id_idx").on(t.businessId),
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_menu_item_id_idx").on(t.menuItemId),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
