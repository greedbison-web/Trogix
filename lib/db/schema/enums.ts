import { pgEnum } from "drizzle-orm/pg-core";

export const businessTypeEnum = pgEnum("business_type", [
  "restaurant",
  "cafe",
  "cloud_kitchen",
]);

export const businessStatusEnum = pgEnum("business_status", [
  "onboarding",
  "active",
  "suspended",
  "closed",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "trial",
  "starter",
  "growth",
  "enterprise",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "upi",
  "razorpay",
  "cash",
  "disabled",
]);

export const staffRoleEnum = pgEnum("staff_role", [
  "owner",
  "manager",
  "waiter",
  "kitchen",
  "cashier",
]);

export const staffStatusEnum = pgEnum("staff_status", [
  "invited",
  "active",
  "disabled",
]);

export const tableStatusEnum = pgEnum("table_status", [
  "available",
  "seated",
  "billed",
  "inactive",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "awaiting_payment",
  "placed",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
]);

export const orderTypeEnum = pgEnum("order_type", [
  "dine_in",
  "takeaway",
  "delivery",
]);

export const orderItemStatusEnum = pgEnum("order_item_status", [
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "upi",
  "card",
  "cash",
  "netbanking",
  "wallet",
]);

export const spiceLevelEnum = pgEnum("spice_level", [
  "none",
  "mild",
  "medium",
  "hot",
]);

export const paymentAccountStatusEnum = pgEnum("payment_account_status", [
  "disconnected",
  "connected",
  "expired",
  "revoked",
]);
