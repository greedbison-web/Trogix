"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderRow } from "@/lib/queries/orders";
import { setOrderStatus } from "@/app/(app)/dashboard/orders/actions";

/** Minutes since the order was placed — drives the urgency colour. */
function ageMinutes(placedAt: Date | null) {
  if (!placedAt) return 0;
  return Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
}

export function KitchenBoard({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 8000);
    const clock = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [router]);

  void tick;

  function advance(orderId: string, status: string) {
    startTransition(async () => {
      await setOrderStatus(orderId, status);
      router.refresh();
    });
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-center font-serif text-[2rem] leading-none text-paper/40">
          The pass is clear
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {orders.map((order) => {
        const age = ageMinutes(order.placedAt);
        const late = age >= 8;
        const next =
          order.status === "placed"
            ? { label: "Accept", value: "accepted" }
            : order.status === "accepted"
              ? { label: "Start", value: "preparing" }
              : order.status === "preparing"
                ? { label: "Ready", value: "ready" }
                : { label: "Served", value: "served" };

        return (
          <li
            key={order.id}
            className={`rounded-2xl border bg-white/[0.04] p-5 ${
              late ? "border-[var(--color-state-late)]/60" : "border-white/10"
            }`}
          >
            <div className="flex items-start justify-between">
              <p className="font-serif text-[2rem] leading-none text-paper">
                {order.tableLabel ? `T${order.tableLabel}` : `#${order.orderNumber}`}
              </p>
              <span
                className={`flex items-center gap-1.5 text-[12px] font-medium ${
                  late ? "text-[var(--color-state-late)]" : "text-accent"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    late ? "bg-[var(--color-state-late)]" : "bg-accent"
                  }`}
                />
                {age} min
              </span>
            </div>

            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-paper/35">
              #{order.orderNumber} · {order.status}
            </p>

            <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
              {order.items.map((line) => (
                <li key={line.id} className="text-[15px] leading-snug text-paper/90">
                  <span className="tabular-nums text-paper/50">{line.quantity}×</span>{" "}
                  {line.nameSnapshot}
                  {line.variantSnapshot ? (
                    <span className="text-paper/50"> ({line.variantSnapshot})</span>
                  ) : null}
                  {line.notes ? (
                    <span className="block text-[13px] text-[var(--color-state-late)]">
                      {line.notes}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            {order.notes ? (
              <p className="mt-3 rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] text-paper/80">
                {order.notes}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => advance(order.id, next.value)}
              className="mt-5 h-11 w-full rounded-full bg-paper text-caption font-medium text-ink active:scale-[0.98]"
            >
              {next.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
