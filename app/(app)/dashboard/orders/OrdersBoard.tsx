"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderRow } from "@/lib/queries/orders";
import { formatMoney, formatTime } from "@/lib/format";
import { setOrderStatus, saveKitchenNote } from "./actions";
import type { TimelineEntry } from "@/lib/queries/orders";

const NEXT_STATUS: Record<string, { label: string; value: string } | null> = {
  placed: { label: "Accept", value: "accepted" },
  accepted: { label: "Start preparing", value: "preparing" },
  preparing: { label: "Mark ready", value: "ready" },
  ready: { label: "Mark served", value: "served" },
  served: null,
  completed: null,
  cancelled: null,
  draft: null,
};

export function OrdersBoard({
  orders,
  timelines,
  currency,
  timezone,
  filter,
}: {
  orders: OrderRow[];
  timelines: Record<string, TimelineEntry[]>;
  currency: string;
  timezone: string;
  filter: "active" | "today" | "all";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  // Live: the pass refreshes itself while the tab is open.
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [router]);

  function run(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? null : result.message);
      router.refresh();
    });
  }

  return (
    <div>
      <nav className="flex gap-2">
        {(["active", "today", "all"] as const).map((value) => (
          <a
            key={value}
            href={`/dashboard/orders?filter=${value}`}
            aria-current={filter === value ? "page" : undefined}
            className={`h-9 rounded-full px-4 text-micro font-medium capitalize leading-9 transition-colors ${
              filter === value
                ? "bg-ink text-paper"
                : "border border-paper-edge bg-paper-raised text-ink-500 hover:text-ink"
            }`}
          >
            {value}
          </a>
        ))}
      </nav>

      {notice ? (
        <p role="alert" className="mt-4 text-caption text-[var(--color-state-late)]">
          {notice}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-paper-edge bg-paper-raised px-6 py-16 text-center">
          <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
            Nothing on the pass
          </p>
          <p className="mx-auto mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
            Orders appear here the moment a guest places them.
          </p>
        </div>
      ) : (
        <ul className={`mt-6 space-y-4 ${pending ? "opacity-60" : ""}`}>
          {orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            const open = order.status !== "completed" && order.status !== "cancelled";
            return (
              <li
                key={order.id}
                className="rounded-2xl border border-paper-edge bg-paper-raised p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-[1.75rem] leading-none tracking-[-0.02em]">
                      #{order.orderNumber}
                      {order.tableLabel ? (
                        <span className="text-ink-500"> · Table {order.tableLabel}</span>
                      ) : (
                        <span className="text-ink-500"> · {order.type.replace("_", " ")}</span>
                      )}
                    </p>
                    <p className="mt-2 text-micro text-ink-500">
                      {order.placedAt
                        ? formatTime(new Date(order.placedAt), timezone)
                        : "Not placed"}
                      {order.guestName ? ` · ${order.guestName}` : ""}
                      {order.guestPhone ? ` · ${order.guestPhone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-paper-sunken px-2.5 py-1 text-[11px] font-medium capitalize text-ink-700">
                      {order.status}
                    </span>
                    <p className="mt-2 font-serif text-[1.5rem] leading-none tabular-nums">
                      {formatMoney(order.total, currency)}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5 border-t border-paper-edge pt-4">
                  {order.items.map((line) => (
                    <li key={line.id} className="flex justify-between text-caption">
                      <span className="text-ink-700">
                        <span className="tabular-nums text-ink-500">{line.quantity}×</span>{" "}
                        {line.nameSnapshot}
                        {line.variantSnapshot ? (
                          <span className="text-ink-500"> ({line.variantSnapshot})</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-ink-700">
                        {formatMoney(line.lineTotal, currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.notes ? (
                  <p className="mt-3 rounded-xl bg-paper-sunken px-3 py-2 text-micro text-ink-700">
                    <span className="font-medium">Guest note:</span> {order.notes}
                  </p>
                ) : null}

                {order.kitchenNote ? (
                  <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-micro text-accent-deep">
                    <span className="font-medium">Kitchen note:</span> {order.kitchenNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((id) => (id === order.id ? null : order.id))
                    }
                    aria-expanded={expanded === order.id}
                    className="text-micro font-medium text-accent-deep hover:underline"
                  >
                    {expanded === order.id ? "Hide timeline" : "Timeline"}
                    {timelines[order.id]?.length
                      ? ` (${timelines[order.id].length})`
                      : ""}
                  </button>
                </div>

                {expanded === order.id ? (
                  <div className="mt-3 rounded-xl border border-paper-edge bg-paper p-4">
                    <ol className="space-y-2">
                      <li className="flex gap-3 text-micro">
                        <span className="w-12 shrink-0 tabular-nums text-ink-300">
                          {order.placedAt
                            ? formatTime(new Date(order.placedAt), timezone)
                            : "—"}
                        </span>
                        <span className="text-ink-700">Order placed</span>
                      </li>
                      {(timelines[order.id] ?? []).map((entry) => (
                        <li key={entry.id} className="flex gap-3 text-micro">
                          <span className="w-12 shrink-0 tabular-nums text-ink-300">
                            {formatTime(new Date(entry.createdAt), timezone)}
                          </span>
                          <span className="text-ink-700">
                            {entry.type === "status"
                              ? `${entry.fromStatus} → ${entry.toStatus}`
                              : entry.type === "kitchen_note"
                                ? `Kitchen note: ${entry.note}`
                                : entry.type}
                          </span>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-paper-edge pt-4">
                      <input
                        value={noteDraft[order.id] ?? order.kitchenNote ?? ""}
                        onChange={(e) =>
                          setNoteDraft((d) => ({ ...d, [order.id]: e.target.value }))
                        }
                        placeholder="Note for the kitchen"
                        aria-label={`Kitchen note for order ${order.orderNumber}`}
                        maxLength={280}
                        className="h-10 min-w-[200px] flex-1 rounded-full border border-paper-edge bg-paper-raised px-4 text-micro outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            saveKitchenNote(
                              order.id,
                              noteDraft[order.id] ?? order.kitchenNote ?? "",
                            ),
                          )
                        }
                        className="h-10 rounded-full bg-ink px-4 text-micro font-medium text-paper disabled:opacity-60"
                      >
                        Save note
                      </button>
                    </div>
                  </div>
                ) : null}

                {open ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {next ? (
                      <button
                        type="button"
                        onClick={() => run(() => setOrderStatus(order.id, next.value))}
                        className="h-10 rounded-full bg-ink px-4 text-micro font-medium text-paper"
                      >
                        {next.label}
                      </button>
                    ) : null}

                    <span
                      className={`flex h-10 items-center rounded-full px-4 text-micro font-medium ${
                        order.paymentStatus === "succeeded"
                          ? "bg-accent-soft text-accent-deep"
                          : order.paymentStatus === "failed"
                            ? "bg-paper-sunken text-[var(--color-state-late)]"
                            : "bg-paper-sunken text-ink-500"
                      }`}
                    >
                      {order.paymentStatus === "succeeded"
                        ? "Paid"
                        : order.paymentStatus === "failed"
                          ? "Payment failed"
                          : "Awaiting payment"}
                    </span>

                    <button
                      type="button"
                      onClick={() => run(() => setOrderStatus(order.id, "cancelled"))}
                      className="ml-auto h-10 rounded-full px-3 text-micro font-medium text-[var(--color-state-late)] hover:bg-paper-sunken"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
