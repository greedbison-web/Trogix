import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps, softDelete } from "./_shared";
import {
  adminRoleEnum,
  adminStatusEnum,
  notificationLevelEnum,
  webhookStatusEnum,
  logLevelEnum,
} from "./enums";
import { users } from "./users";
import { businesses } from "./businesses";

/**
 * Platform-side tables. These are NOT tenant-owned — they belong to Trogix
 * itself and are never exposed to a restaurant. Access is gated by
 * `platform_admins` membership, and RLS on these tables denies the
 * `authenticated` role outright (see the migration).
 */

/** Staff of the Trogix platform. Membership here grants /admin access. */
export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: adminRoleEnum("role").notNull().default("support"),
    status: adminStatusEnum("status").notNull().default("active"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("platform_admins_user_id_key").on(t.userId)],
);

/** Append-only record of every privileged action. */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => platformAdmins.id, {
      onDelete: "set null",
    }),
    adminEmail: text("admin_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("admin_audit_logs_created_at_idx").on(t.createdAt),
    index("admin_audit_logs_admin_id_idx").on(t.adminId),
    index("admin_audit_logs_business_id_idx").on(t.businessId),
  ],
);

/** Time-boxed, revocable, audited "view as restaurant" grants. */
export const impersonationSessions = pgTable(
  "impersonation_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => platformAdmins.id, { onDelete: "cascade" }),
    adminEmail: text("admin_email"),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("impersonation_sessions_admin_id_idx").on(t.adminId),
    index("impersonation_sessions_business_id_idx").on(t.businessId),
  ],
);

/** Every gateway webhook received, so failures are visible and retryable. */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("razorpay"),
    eventId: text("event_id"),
    eventType: text("event_type"),
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    providerOrderId: text("provider_order_id"),
    signatureValid: boolean("signature_valid").notNull().default(false),
    status: webhookStatusEnum("status").notNull().default("received"),
    attempts: integer("attempts").notNull().default(1),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("webhook_events_status_idx").on(t.status),
    index("webhook_events_created_at_idx").on(t.createdAt),
    index("webhook_events_business_id_idx").on(t.businessId),
  ],
);

/** Guest QR/NFC opens — powers live monitoring. */
export const qrScans = pgTable(
  "qr_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    tableId: uuid("table_id"),
    tableLabel: text("table_label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("qr_scans_business_id_idx").on(t.businessId),
    index("qr_scans_created_at_idx").on(t.createdAt),
  ],
);

/** Platform error stream surfaced in admin monitoring. */
export const errorLogs = pgTable(
  "error_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: logLevelEnum("level").notNull().default("error"),
    source: text("source").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    context: jsonb("context"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("error_logs_created_at_idx").on(t.createdAt),
    index("error_logs_level_idx").on(t.level),
  ],
);

/** Broadcasts, per-restaurant messages and the maintenance banner. */
export const platformNotifications = pgTable(
  "platform_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    level: notificationLevelEnum("level").notNull().default("info"),
    /** Null targets every restaurant. */
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "cascade",
    }),
    isMaintenanceBanner: boolean("is_maintenance_banner").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdByEmail: text("created_by_email"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("platform_notifications_business_id_idx").on(t.businessId),
    index("platform_notifications_published_at_idx").on(t.publishedAt),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    description: text("description"),
    /** Basis points off, e.g. 2000 = 20%. */
    percentOffBps: integer("percent_off_bps").notNull().default(0),
    appliesToPlan: text("applies_to_plan"),
    maxRedemptions: integer("max_redemptions"),
    redemptions: integer("redemptions").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("coupons_code_key").on(t.code)],
);

/** Namespaced key/value store: taxes, branding, email templates, flags. */
export const platformSettings = pgTable(
  "platform_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedByEmail: text("updated_by_email"),
    ...timestamps,
  },
  (t) => [uniqueIndex("platform_settings_namespace_key").on(t.namespace, t.key)],
);

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type ImpersonationSession = typeof impersonationSessions.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type PlatformNotification = typeof platformNotifications.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
