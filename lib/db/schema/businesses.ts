import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps, softDelete } from "./_shared";
import {
  businessTypeEnum,
  businessStatusEnum,
  subscriptionPlanEnum,
  paymentModeEnum,
} from "./enums";
import { users } from "./users";

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
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

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("businesses_slug_key").on(t.slug),
    index("businesses_owner_id_idx").on(t.ownerId),
  ],
);

export const businessSettings = pgTable(
  "business_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),

    // Identity
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color").notNull().default("#111111"),
    secondaryColor: text("secondary_color").notNull().default("#449EB9"),

    // Localization
    currency: text("currency").notNull().default("INR"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),

    // Payments
    paymentMode: paymentModeEnum("payment_mode").notNull().default("upi"),
    upiId: text("upi_id"),
    razorpayAccountId: text("razorpay_account_id"),

    // Billing
    gstNumber: text("gst_number"),
    /** Basis points, e.g. 500 = 5%. */
    serviceCharge: integer("service_charge").notNull().default(0),
    taxEnabled: boolean("tax_enabled").notNull().default(true),
    receiptFooter: text("receipt_footer"),

    // Contact
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    website: text("website"),

    // Lifecycle
    subscriptionPlan: subscriptionPlanEnum("subscription_plan")
      .notNull()
      .default("trial"),
    businessStatus: businessStatusEnum("business_status")
      .notNull()
      .default("onboarding"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    planStartedAt: timestamp("plan_started_at", { withTimezone: true }),
    planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
    couponCode: text("coupon_code"),

    // Approval review
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByEmail: text("reviewed_by_email"),
    reviewNote: text("review_note"),

    ...timestamps,
  },
  (t) => [uniqueIndex("business_settings_business_id_key").on(t.businessId)],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type NewBusinessSettings = typeof businessSettings.$inferInsert;
