import { relations } from "drizzle-orm";
import { users } from "./users";
import { businesses, businessSettings } from "./businesses";
import { staffMembers } from "./staff";
import { restaurantTables } from "./tables";
import { categories, menuItems, itemVariants } from "./menu";
import { orders, orderItems } from "./orders";
import { payments, receipts } from "./payments";
import { paymentAccounts } from "./payment-accounts";

export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
  staffMemberships: many(staffMembers),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
  }),
  settings: one(businessSettings),
  staffMembers: many(staffMembers),
  tables: many(restaurantTables),
  categories: many(categories),
  menuItems: many(menuItems),
  orders: many(orders),
  payments: many(payments),
  receipts: many(receipts),
  paymentAccount: one(paymentAccounts),
}));

export const paymentAccountsRelations = relations(paymentAccounts, ({ one }) => ({
  business: one(businesses, {
    fields: [paymentAccounts.businessId],
    references: [businesses.id],
  }),
}));

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  business: one(businesses, {
    fields: [businessSettings.businessId],
    references: [businesses.id],
  }),
}));

export const staffMembersRelations = relations(staffMembers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [staffMembers.businessId],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [staffMembers.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const restaurantTablesRelations = relations(
  restaurantTables,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [restaurantTables.businessId],
      references: [businesses.id],
    }),
    orders: many(orders),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  business: one(businesses, {
    fields: [categories.businessId],
    references: [businesses.id],
  }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  business: one(businesses, {
    fields: [menuItems.businessId],
    references: [businesses.id],
  }),
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  variants: many(itemVariants),
  orderItems: many(orderItems),
}));

export const itemVariantsRelations = relations(itemVariants, ({ one }) => ({
  business: one(businesses, {
    fields: [itemVariants.businessId],
    references: [businesses.id],
  }),
  menuItem: one(menuItems, {
    fields: [itemVariants.menuItemId],
    references: [menuItems.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id],
  }),
  table: one(restaurantTables, {
    fields: [orders.tableId],
    references: [restaurantTables.id],
  }),
  staff: one(staffMembers, {
    fields: [orders.staffId],
    references: [staffMembers.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  business: one(businesses, {
    fields: [orderItems.businessId],
    references: [businesses.id],
  }),
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  variant: one(itemVariants, {
    fields: [orderItems.variantId],
    references: [itemVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  business: one(businesses, {
    fields: [payments.businessId],
    references: [businesses.id],
  }),
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  receipts: many(receipts),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  business: one(businesses, {
    fields: [receipts.businessId],
    references: [businesses.id],
  }),
  payment: one(payments, {
    fields: [receipts.paymentId],
    references: [payments.id],
  }),
}));
