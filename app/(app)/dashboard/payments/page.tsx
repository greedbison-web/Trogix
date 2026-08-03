import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import {
  getPaymentAccount,
  getRecentPayments,
} from "@/lib/queries/payment-account";
import { razorpayEnv } from "@/lib/razorpay/oauth";
import { formatMoney, formatRelativeDay } from "@/lib/format";
import { DisconnectButton } from "./DisconnectButton";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  denied: "You declined the connection on Razorpay.",
  invalid: "Razorpay sent an incomplete response. Try connecting again.",
  state: "That connection link expired. Start again.",
  exchange: "Razorpay rejected the connection. Try again.",
  not_configured: "Razorpay Connect is not configured on this deployment.",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getActiveBusiness(user.id);
  if (!record) redirect("/onboarding");

  const params = await searchParams;
  const [account, payments] = await Promise.all([
    getPaymentAccount(record.business.id),
    getRecentPayments(record.business.id),
  ]);

  const connected = account?.status === "connected";
  const configured = razorpayEnv().configured;
  const currency = record.business.currency;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          Payments
        </h1>
        <p className="mt-2 max-w-[560px] text-caption leading-relaxed text-ink-500">
          Guests pay your Razorpay account directly. Trogix never receives or
          holds your money — settlement goes from Razorpay to your bank on your
          own schedule.
        </p>
      </header>

      {params.error ? (
        <p role="alert" className="text-caption text-[var(--color-state-late)]">
          {ERRORS[params.error] ?? "Something went wrong. Try again."}
        </p>
      ) : null}
      {params.connected ? (
        <p className="text-caption text-accent-deep">
          Razorpay connected. You can take payments now.
        </p>
      ) : null}

      <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
              Razorpay account
            </h2>
            {connected ? (
              <>
                <p className="mt-3 font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
                  {account?.accountName ?? "Connected"}
                </p>
                <p className="mt-2 text-caption text-ink-500">
                  {account?.accountEmail ?? account?.accountId ?? ""}
                  {account?.connectedAt
                    ? ` · connected ${formatRelativeDay(
                        new Date(account.connectedAt),
                        record.business.timezone,
                      )}`
                    : ""}
                </p>
                <p className="mt-2 text-micro text-ink-300">
                  {account?.liveMode ? "Live mode" : "Test mode"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
                  Not connected
                </p>
                <p className="mt-2 max-w-[420px] text-caption leading-relaxed text-ink-500">
                  {account?.status === "expired"
                    ? "Your Razorpay grant expired. Reconnect to keep taking payments."
                    : "Connect your own Razorpay account to start taking orders. Guests cannot check out until this is done."}
                </p>
                {account?.lastError ? (
                  <p className="mt-2 text-micro text-[var(--color-state-late)]">
                    {account.lastError}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="flex gap-2">
            {configured ? (
              <a
                href="/api/razorpay/connect"
                className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-caption font-medium text-paper"
              >
                {connected ? "Reconnect" : "Connect Razorpay"}
              </a>
            ) : (
              <span className="inline-flex h-11 items-center rounded-full border border-paper-edge px-5 text-caption text-ink-300">
                Not configured
              </span>
            )}
            {connected ? <DisconnectButton /> : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
          Recent payments
        </h2>
        {payments.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center">
            <p className="text-caption text-ink-500">
              No payments yet. They appear here the moment Razorpay confirms
              them.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-paper-edge overflow-hidden rounded-2xl border border-paper-edge bg-paper-raised">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-caption text-ink">
                    Order #{payment.orderNumber}
                    {payment.method ? (
                      <span className="text-ink-500"> · {payment.method}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 truncate text-micro text-ink-500">
                    {payment.providerPaymentId ?? "Awaiting confirmation"}
                    {payment.failureReason ? ` · ${payment.failureReason}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <StatusPill status={payment.status} />
                  <span className="text-caption tabular-nums text-ink">
                    {formatMoney(payment.amount, currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "succeeded"
      ? "bg-accent-soft text-accent-deep"
      : status === "failed"
        ? "bg-paper-sunken text-[var(--color-state-late)]"
        : "bg-paper-sunken text-ink-500";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${tone}`}>
      {status}
    </span>
  );
}
