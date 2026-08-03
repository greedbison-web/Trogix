import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps, softDelete } from "./_shared";
import { businesses } from "./businesses";
import { spiceLevelEnum } from "./enums";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("categories_business_id_idx").on(t.businessId),
    uniqueIndex("categories_business_slug_key").on(t.businessId, t.slug),
  ],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    /** Minor units (paise). Avoids float rounding on money. */
    price: integer("price").notNull(),
    imageUrl: text("image_url"),

    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    isRecommended: boolean("is_recommended").notNull().default(false),
    isBestseller: boolean("is_bestseller").notNull().default(false),
    spiceLevel: spiceLevelEnum("spice_level").notNull().default("none"),
    /** Free-form allergen tags, e.g. {"nuts","dairy"}. */
    allergens: text("allergens").array(),
    preparationMinutes: integer("preparation_minutes"),
    sortOrder: integer("sort_order").notNull().default(0),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("menu_items_business_id_idx").on(t.businessId),
    index("menu_items_category_id_idx").on(t.categoryId),
    uniqueIndex("menu_items_business_slug_key").on(t.businessId, t.slug),
  ],
);

export const itemVariants = pgTable(
  "item_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    /** Added to the item price, in minor units. May be negative. */
    priceDelta: integer("price_delta").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("item_variants_business_id_idx").on(t.businessId),
    index("item_variants_menu_item_id_idx").on(t.menuItemId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type ItemVariant = typeof itemVariants.$inferSelect;
export type NewItemVariant = typeof itemVariants.$inferInsert;
