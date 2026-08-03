import "server-only";
import { getAccessToken } from "./oauth";

const API = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

/**
 * Creates the charge on the RESTAURANT's Razorpay account using their OAuth
 * grant. Settlement is Razorpay → restaurant's bank. Trogix takes no cut here
 * and never touches the funds.
 */
export async function createRazorpayOrder(
  businessId: string,
  params: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  },
): Promise<{ order: RazorpayOrder; publicKey: string | null; accountId: string | null } | null> {
  const grant = await getAccessToken(businessId);
  if (!grant) return null;

  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grant.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      payment_capture: 1,
      notes: params.notes ?? {},
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  return {
    order: (await response.json()) as RazorpayOrder,
    publicKey: grant.publicKey,
    accountId: grant.accountId,
  };
}

export async function fetchPayment(businessId: string, paymentId: string) {
  const grant = await getAccessToken(businessId);
  if (!grant) return null;

  const response = await fetch(`${API}/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${grant.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    id: string;
    order_id: string;
    status: string;
    method?: string;
    amount: number;
    error_description?: string;
  };
}
