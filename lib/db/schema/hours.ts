import { pgTable, uuid, integer, boolean, text, index } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { businesses } from "./businesses";

/** One row per weekday. 0 = Sunday. Times are HH:MM in the business timezone. */
export const operatingHours = pgTable(
  "operating_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    isOpen: boolean("is_open").notNull().default(true),
    opensAt: text("opens_at").notNull().default("11:00"),
    closesAt: text("closes_at").notNull().default("23:00"),
    ...timestamps,
  },
  (t) => [index("operating_hours_business_id_idx").on(t.businessId)],
);

export type OperatingHour = typeof operatingHours.$inferSelect;
