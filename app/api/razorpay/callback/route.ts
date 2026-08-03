import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  verifyState,
  exchangeCode,
  fetchMerchant,
  storeGrant,
} from "@/lib/razorpay/oauth";

export const dynamic = "force-dynamic";

/** Razorpay redirects here after the restaurant authorises Trogix. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  const back = (status: string) =>
    NextResponse.redirect(`${origin}/dashboard/payments?${status}`);

  if (denied) return back("error=denied");
  if (!code || !state) return back("error=invalid");

  const businessId = verifyState(state);
  if (!businessId) return back("error=state");

  try {
    const token = await exchangeCode(code);
    const merchant = await fetchMerchant(token.access_token);
    await storeGrant(businessId, token, merchant);
  } catch {
    try {
      const db = getDb();
      await db
        .update(schema.paymentAccounts)
        .set({
          status: "disconnected",
          lastError: "Could not complete the Razorpay connection.",
          lastErrorAt: new Date(),
        })
        .where(
          and(
            eq(schema.paymentAccounts.businessId, businessId),
            eq(schema.paymentAccounts.provider, "razorpay"),
          ),
        );
    } catch {
      // nothing further to record
    }
    return back("error=exchange");
  }

  return back("connected=1");
}
