import { timestamp } from "drizzle-orm/pg-core";

/** Every table carries these. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/** Tables that are archived rather than destroyed. */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
