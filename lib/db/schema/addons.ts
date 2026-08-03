import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { timestamps, softDelete } from "./_shared";
import { businesses } from "./businesses";
import { menuItems } from "./menu";

/** Optional extras a guest can add to a line, priced independently. */
export const itemAddons = pgTable(
  "item_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: integer("price").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("item_addons_business_id_idx").on(t.businessId),
    index("item_addons_menu_item_id_idx").on(t.menuItemId),
  ],
);

export type ItemAddon = typeof itemAddons.$inferSelect;
