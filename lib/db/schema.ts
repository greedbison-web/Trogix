import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const businessTypeEnum = pgEnum("business_type", [
  "restaurant",
  "cafe",
  "cloud_kitchen",
]);

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** auth.users.id — the owner. */
    ownerId: uuid("owner_id").notNull(),

    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    type: businessTypeEnum("type").notNull(),

    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull(),
    gst: text("gst"),

    addressLine: text("address_line").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),

    logoUrl: text("logo_url"),

    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    currency: text("currency").notNull().default("INR"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("businesses_owner_id_idx").on(table.ownerId)],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
