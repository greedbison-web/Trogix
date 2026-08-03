"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicVenue } from "@/lib/queries/public-menu";
import { formatMoney } from "@/lib/format";

type CheckoutHandover = {
  keyId: string;
  razorpayOrderId: string;
  businessName: string;
};

type PaymentState = {
  orderStatus: string;
  paymentStatus: string | null;
} | null;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const SDK_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Guest payment handover.
 *
 * The Razorpay checkout runs against the RESTAURANT's own key, so funds settle
 * to their bank account. The browser callback is only a hint — the order is
 * confirmed by the server webhook, which this screen polls for.
 */
export function RazorpayCheckout({
  venue,
  table,
  orderId,
  orderNumber,
  total,
  checkout,
  pollState,
  onDone,
}: {
  venue: PublicVenue;
  table: { id: string; label: string } | null;
  orderId: string;
  orderNumber: number;
  total: number;
  checkout: CheckoutHandover;
  pollState: (orderId: string) => Promise<PaymentState>;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<
    "loading" | "ready" | "waiting" | "confirmed" | "failed"
  >("loading");
  const [message, setMessage] = useState<string | null>(null);
  const opened = useRef(false);

  // Load the checkout SDK once.
  useEffect(() => {
    if (window.Razorpay) {
      setPhase("ready");
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    const onLoad = () => setPhase("ready");
    const onError = () => {
      setPhase("failed");
      setMessage("Could not reach the payment provider. Check your connection.");
    };
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (!existing) {
      script.src = SDK_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, []);

  // The webhook is the source of truth; poll until it lands.
  useEffect(() => {
    if (phase !== "waiting") return;
    let cancelled = false;

    const id = window.setInterval(async () => {
      const state = await pollState(orderId);
      if (cancelled || !state) return;
      if (state.paymentStatus === "succeeded") {
        setPhase("confirmed");
      } else if (state.paymentStatus === "failed") {
        setPhase("failed");
        setMessage("That payment did not go through. You can try again.");
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, orderId, pollState]);

  const open = useCallback(() => {
    if (!window.Razorpay) return;
    const rzp = new window.Razorpay({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: total,
      currency: venue.currency,
      name: checkout.businessName,
      description: `Order #${orderNumber}`,
      image: venue.logoUrl ?? undefined,
      theme: { color: venue.secondaryColor },
      handler: () => setPhase("waiting"),
      modal: {
        ondismiss: () => {
          setPhase("ready");
          setMessage("Payment cancelled. Your order is held until you pay.");
        },
      },
    });
    rzp.open();
    setMessage(null);
  }, [checkout, total, venue, orderNumber]);

  // Open automatically the first time the SDK is ready.
  useEffect(() => {
    if (phase === "ready" && !opened.current) {
      opened.current = true;
      open();
    }
  }, [phase, open]);

  if (phase === "confirmed") {
    return (
      <Screen>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        </div>
        <h1 className="mt-8 font-serif text-[2rem] leading-none tracking-[-0.02em]">
          Paid. Order #{orderNumber} is with the kitchen
        </h1>
        <p className="mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
          {table ? `Table ${table.label} · ` : ""}
          {venue.name} has confirmed your order.
        </p>
        <p className="mt-6 font-serif text-[2.5rem] leading-none tabular-nums">
          {formatMoney(total, venue.currency)}
        </p>
        {venue.receiptFooter ? (
          <p className="mt-6 max-w-[320px] text-micro text-ink-300">
            {venue.receiptFooter}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onDone}
          className="mt-8 text-caption text-ink-500 underline underline-offset-4"
        >
          Order something else
        </button>
      </Screen>
    );
  }

  if (phase === "waiting") {
    return (
      <Screen>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-paper-edge border-t-accent" />
        <h1 className="mt-8 font-serif text-[1.75rem] leading-none tracking-[-0.02em]">
          Confirming your payment
        </h1>
        <p className="mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
          This takes a few seconds. Please don&apos;t close this screen.
        </p>
      </Screen>
    );
  }

  return (
    <Screen>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
        Order #{orderNumber}
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-none tracking-[-0.02em]">
        {formatMoney(total, venue.currency)}
      </h1>
      <p className="mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
        Paid directly to {checkout.businessName}. Your order reaches the kitchen
        the moment payment clears.
      </p>

      {message ? (
        <p role="alert" className="mt-6 max-w-[320px] text-caption text-[var(--color-state-late)]">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={open}
        disabled={phase === "loading"}
        className="mt-8 h-12 rounded-full bg-accent px-8 text-caption font-medium text-white disabled:opacity-60"
      >
        {phase === "loading" ? "Loading…" : "Pay now"}
      </button>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      {children}
    </div>
  );
}
