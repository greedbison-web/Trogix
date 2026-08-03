import {
  order,
  orderLines,
  orderTotal,
  restaurant,
  withCurrency,
} from "@/lib/demo-restaurant";

/**
 * The third surface in §2 — the same order, settled.
 *
 * Deliberately the plainest surface on the site. A bill that tries to be
 * designed reads as untrustworthy; this one just adds up.
 */
export function BillSurface({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full rounded-[20px] border border-paper-edge/70 bg-paper-raised p-7 shadow-float sm:p-9 ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-ink-500">
          Table {restaurant.table} · Paid
        </p>
        <p className="text-micro tabular-nums text-ink-300">{order.settledAt}</p>
      </div>

      <p className="mt-7 font-serif text-[2rem] leading-none tracking-[-0.02em]">
        {restaurant.name}
      </p>
      <p className="mt-2 text-micro text-ink-500">
        {restaurant.neighbourhood}, {restaurant.city}
      </p>

      <ul className="mt-8 space-y-3 border-t border-paper-edge pt-6">
        {orderLines.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-4">
            <span className="text-caption text-ink-700">
              <span className="tabular-nums text-ink-500">{line.quantity}×</span>{" "}
              {line.name}
            </span>
            <span className="shrink-0 text-caption tabular-nums text-ink-700">
              {withCurrency(line.price * line.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-baseline justify-between border-t border-paper-edge pt-6">
        <span className="text-caption text-ink-500">Settled to {restaurant.name}</span>
        <span className="font-serif text-[1.75rem] leading-none tabular-nums">
          {withCurrency(orderTotal)}
        </span>
      </div>
    </div>
  );
}
