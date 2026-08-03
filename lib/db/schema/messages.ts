import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { messageChannelEnum, messageStatusEnum } from "./enums";
import { businesses } from "./businesses";
import { orders } from "./orders";

/**
 * Outbound guest messages. Rows are written by the app and drained by a
 * provider adapter, so a missing provider queues rather than loses messages.
 */
export const outboundMessages = pgTable(
  "outbound_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),

    channel: messageChannelEnum("channel").notNull(),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),

    status: messageStatusEnum("status").notNull().default("queued"),
    attempts: text("attempts").notNull().default("0"),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    metadata: jsonb("metadata"),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("outbound_messages_business_id_idx").on(t.businessId),
    index("outbound_messages_status_idx").on(t.status),
    index("outbound_messages_order_id_idx").on(t.orderId),
  ],
);

export type OutboundMessage = typeof outboundMessages.$inferSelect;
