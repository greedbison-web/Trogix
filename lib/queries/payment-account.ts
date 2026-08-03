import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type PaymentAccountView = {
  status: "disconnected" | "connected" | "expired" | "revoked";
  accountId: string | null;
  accountName: string | null;
  accountEmail: string | null;
  liveMode: boolean;
  connectedAt: Date | null;
  lastError: string | null;
} | null;

export async function getPaymentAccount(
  businessId: string,
): Promise<PaymentAccountView> {
  try {
    const db = getDb();
    const [row] = await db
      .select({
        status: schema.paymentAccounts.status,
        accountId: schema.paymentAccounts.accountId,
        accountName: schema.paymentAccounts.accountName,
        accountEmail: schema.paymentAccounts.accountEmail,
        liveMode: schema.paymentAccounts.liveMode,
        connectedAt: schema.paymentAccounts.connectedAt,
        lastError: schema.paymentAccounts.lastError,
      })
      .from(schema.paymentAccounts)
      .where(
        and(
          eq(schema.paymentAccounts.businessId, businessId),
          eq(schema.paymentAccounts.provider, "razorpay"),
        ),
      )
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

/** Recent settlements for the payments screen. */
export async function getRecentPayments(businessId: string) {
  try {
    const db = getDb();
    return await db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        status: schema.payments.status,
        method: schema.payments.method,
        providerPaymentId: schema.payments.providerPaymentId,
        paidAt: schema.payments.paidAt,
        createdAt: schema.payments.createdAt,
        failureReason: schema.payments.failureReason,
        orderNumber: schema.orders.orderNumber,
      })
      .from(schema.payments)
      .innerJoin(schema.orders, eq(schema.payments.orderId, schema.orders.id))
      .where(eq(schema.payments.businessId, businessId))
      .orderBy(desc(schema.payments.createdAt))
      .limit(25);
  } catch {
    return [];
  }
}
