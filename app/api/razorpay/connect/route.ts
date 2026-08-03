import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { authorizeUrl, razorpayEnv } from "@/lib/razorpay/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Starts the OAuth handshake for the signed-in owner's business. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/dashboard/payments`);
  }

  const record = await getBusinessForOwner(user.id);
  if (!record) return NextResponse.redirect(`${origin}/onboarding`);

  if (!razorpayEnv().configured) {
    return NextResponse.redirect(
      `${origin}/dashboard/payments?error=not_configured`,
    );
  }

  return NextResponse.redirect(authorizeUrl(record.business.id));
}
