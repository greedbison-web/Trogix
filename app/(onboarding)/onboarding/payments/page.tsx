import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { getPaymentAccount } from "@/lib/queries/payment-account";
import { razorpayEnv } from "@/lib/razorpay/oauth";

export const metadata: Metadata = { title: "Connect payments" };
export const dynamic = "force-dynamic";

/** Final onboarding step: the restaurant connects its own Razorpay account. */
export default async function OnboardingPaymentsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding/payments");

  const record = await getBusinessForOwner(user.id);
  if (!record) redirect("/onboarding");

  const account = await getPaymentAccount(record.business.id);
  if (account?.status === "connected") redirect("/dashboard");

  const configured = razorpayEnv().configured;

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <p className="text-micro font-medium uppercase tracking-[0.16em] text-ink-500">
            Last step · Payments
          </p>
          <p className="text-micro tabular-nums text-ink-300">100%</p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={5}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label="Onboarding progress"
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-sunken"
        >
          <div className="h-full w-full rounded-full bg-accent" />
        </div>
      </div>

      <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Connect your Razorpay account
      </h1>
      <p className="mt-3 text-caption leading-relaxed text-ink-500">
        Guests pay {record.business.name} directly. Trogix never receives or
        holds your money — Razorpay settles straight to your registered bank
        account.
      </p>

      <ul className="mt-8 space-y-3 border-t border-paper-edge pt-6">
        {[
          "Your own merchant account, your own settlement schedule",
          "Cards, UPI, netbanking and wallets, all on your account",
          "Orders reach the kitchen automatically once payment clears",
        ].map((line) => (
          <li key={line} className="flex items-baseline gap-3 text-caption text-ink-700">
            <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-accent" />
            {line}
          </li>
        ))}
      </ul>

      {account?.lastError ? (
        <p role="alert" className="mt-6 text-caption text-[var(--color-state-late)]">
          {account.lastError}
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        {configured ? (
          <a
            href="/api/razorpay/connect"
            className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-caption font-medium text-paper"
          >
            Connect Razorpay
          </a>
        ) : (
          <span className="inline-flex h-12 items-center rounded-full border border-paper-edge px-6 text-caption text-ink-300">
            Razorpay Connect is not configured on this deployment
          </span>
        )}
        <Link
          href="/dashboard"
          className="h-12 rounded-full px-5 text-caption font-medium leading-[3rem] text-ink-500 hover:text-ink"
        >
          Do this later
        </Link>
      </div>

      <p className="mt-6 text-micro text-ink-300">
        Until an account is connected, guests can browse your menu but cannot
        place orders.
      </p>
    </div>
  );
}
