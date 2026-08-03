"use client";

import { useMemo, useState, useTransition } from "react";
import type { MenuCategory, MenuItemRow } from "@/lib/queries/menu";
import type { PublicVenue } from "@/lib/queries/public-menu";
import { formatMoney } from "@/lib/format";
import { priceOrder, type PricedLine } from "@/lib/pricing";
import { placeOrder } from "./actions";

type Line = { itemId: string; variantId: string | null; quantity: number };

export function GuestMenu({
  venue,
  categories,
  table,
  tableToken,
}: {
  venue: PublicVenue;
  categories: MenuCategory[];
  table: { id: string; label: string } | null;
  tableToken: string | null;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [openCategory, setOpenCategory] = useState(categories[0]?.id ?? "");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placed, setPlaced] = useState<{ number: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItemRow>();
    for (const category of categories) {
      for (const item of category.items) map.set(item.id, item);
    }
    return map;
  }, [categories]);

  const priced: PricedLine[] = lines.flatMap((line) => {
    const item = itemsById.get(line.itemId);
    if (!item) return [];
    const variant = item.variants.find((v) => v.id === line.variantId);
    const unitPrice = item.price + (variant?.priceDelta ?? 0);
    return [
      {
        ...line,
        name: item.name,
        variantName: variant?.name ?? null,
        unitPrice,
        lineTotal: unitPrice * line.quantity,
      },
    ];
  });

  const totals = priceOrder(priced, {
    serviceChargeBps: venue.serviceCharge,
    taxEnabled: venue.taxEnabled,
  });
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  function add(item: MenuItemRow, variantId: string | null) {
    setLines((current) => {
      const found = current.find(
        (l) => l.itemId === item.id && l.variantId === variantId,
      );
      return found
        ? current.map((l) =>
            l === found ? { ...l, quantity: l.quantity + 1 } : l,
          )
        : [...current, { itemId: item.id, variantId, quantity: 1 }];
    });
  }

  function changeQuantity(index: number, delta: number) {
    setLines((current) =>
      current
        .map((l, i) => (i === index ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        slug: venue.slug,
        tableToken,
        guestName: String(formData.get("guestName") ?? ""),
        guestPhone: String(formData.get("guestPhone") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        lines,
      });
      if (result.ok) {
        setPlaced({ number: result.orderNumber, total: result.total });
        setLines([]);
        setCheckoutOpen(false);
        setCartOpen(false);
      } else {
        setError(result.message);
      }
    });
  }

  if (placed) {
    return (
      <Confirmation
        venue={venue}
        table={table}
        orderNumber={placed.number}
        total={placed.total}
        onDone={() => setPlaced(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-28">
      <header className="px-5 pt-8">
        {venue.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={venue.logoUrl}
            alt=""
            className="mb-4 h-12 w-12 rounded-xl border border-paper-edge object-cover"
          />
        ) : null}
        {table ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
            Table {table.label}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-[2rem] leading-none tracking-[-0.02em]">
          {venue.name}
        </h1>
      </header>

      {/* Category rail */}
      <nav
        aria-label="Menu sections"
        className="sticky top-0 z-10 mt-6 flex gap-2 overflow-x-auto border-b border-paper-edge bg-paper/90 px-5 py-3 backdrop-blur-xl"
      >
        {categories.map((category) => (
          <a
            key={category.id}
            href={`#cat-${category.id}`}
            onClick={() => setOpenCategory(category.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              openCategory === category.id
                ? "bg-ink text-paper"
                : "border border-paper-edge bg-paper-raised text-ink-500"
            }`}
          >
            {category.name}
          </a>
        ))}
      </nav>

      <div className="px-5">
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="mt-8 scroll-mt-20">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
              {category.name}
            </h2>
            <ul className="mt-3 space-y-3">
              {category.items.map((item) => (
                <MenuRow key={item.id} item={item} currency={venue.currency} onAdd={add} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Cart bar */}
      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-full border border-white/50 bg-white/70 py-2.5 pl-5 pr-2.5 shadow-lift backdrop-blur-xl"
          >
            <span className="text-[13px] font-medium tabular-nums">
              {count} {count === 1 ? "item" : "items"} ·{" "}
              {formatMoney(totals.subtotal, venue.currency)}
            </span>
            <span className="rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-white">
              View cart
            </span>
          </button>
        </div>
      ) : null}

      {cartOpen ? (
        <Sheet title="Your order" onClose={() => setCartOpen(false)}>
          {priced.length === 0 ? (
            <p className="py-10 text-center text-caption text-ink-500">
              Your cart is empty.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-paper-edge">
                {priced.map((line, index) => (
                  <li key={`${line.itemId}-${line.variantId}`} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-caption text-ink">{line.name}</p>
                      {line.variantName ? (
                        <p className="text-micro text-ink-500">{line.variantName}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQuantity(index, -1)}
                        aria-label={`Remove one ${line.name}`}
                        className="h-8 w-8 rounded-full border border-paper-edge text-ink-700"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-caption tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(index, 1)}
                        aria-label={`Add one ${line.name}`}
                        className="h-8 w-8 rounded-full border border-paper-edge text-ink-700"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-20 shrink-0 text-right text-caption tabular-nums text-ink">
                      {formatMoney(line.lineTotal, venue.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <Totals totals={totals} venue={venue} />

              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
                className="mt-6 h-12 w-full rounded-full bg-ink text-caption font-medium text-paper"
              >
                Continue
              </button>
            </>
          )}
        </Sheet>
      ) : null}

      {checkoutOpen ? (
        <Sheet title="Confirm order" onClose={() => setCheckoutOpen(false)}>
          <form action={submit} className="space-y-4">
            <label className="block">
              <span className="text-micro font-medium text-ink-700">Your name</span>
              <input
                name="guestName"
                placeholder="Optional"
                className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-micro font-medium text-ink-700">
                Mobile number
              </span>
              <input
                name="guestPhone"
                inputMode="numeric"
                maxLength={10}
                placeholder="For order updates"
                className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-micro font-medium text-ink-700">
                Notes for the kitchen
              </span>
              <textarea
                name="notes"
                rows={2}
                placeholder="Allergies, preferences"
                className="mt-2 w-full resize-y rounded-xl border border-paper-edge bg-paper-raised px-4 py-3 text-body outline-none focus:border-accent"
              />
            </label>

            <Totals totals={totals} venue={venue} />

            {error ? (
              <p role="alert" className="text-caption text-[var(--color-state-late)]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-full bg-accent text-caption font-medium text-white disabled:opacity-60"
            >
              {pending
                ? "Sending to kitchen…"
                : `Place order · ${formatMoney(totals.total, venue.currency)}`}
            </button>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}

function MenuRow({
  item,
  currency,
  onAdd,
}: {
  item: MenuItemRow;
  currency: string;
  onAdd: (item: MenuItemRow, variantId: string | null) => void;
}) {
  const [choosing, setChoosing] = useState(false);
  const hasVariants = item.variants.length > 0;

  return (
    <li className="rounded-2xl border border-paper-edge/70 bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="flex items-center gap-2">
            <VegMark veg={item.isVegetarian} />
            <span className="truncate text-body font-medium">{item.name}</span>
          </span>
          {item.description ? (
            <p className="mt-1 text-caption leading-snug text-ink-500">
              {item.description}
            </p>
          ) : null}
          <p className="mt-2 text-caption tabular-nums text-ink-700">
            {formatMoney(item.price, currency)}
          </p>
          {item.preparationMinutes ? (
            <p className="mt-1 text-micro text-ink-300">
              About {item.preparationMinutes} min
            </p>
          ) : null}
        </div>

        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl border border-paper-edge object-cover"
          />
        ) : null}
      </div>

      {hasVariants && choosing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => {
                onAdd(item, variant.id);
                setChoosing(false);
              }}
              className="rounded-full border border-paper-edge px-3 py-1.5 text-[12px] font-medium text-ink"
            >
              {variant.name}
              {variant.priceDelta !== 0
                ? ` ${variant.priceDelta > 0 ? "+" : "−"}${formatMoney(Math.abs(variant.priceDelta), currency)}`
                : ""}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (hasVariants ? setChoosing(true) : onAdd(item, null))}
          className="mt-3 h-9 rounded-full bg-ink px-4 text-[12px] font-medium text-paper"
        >
          {hasVariants ? "Choose" : "Add"}
        </button>
      )}
    </li>
  );
}

function Totals({
  totals,
  venue,
}: {
  totals: ReturnType<typeof priceOrder>;
  venue: PublicVenue;
}) {
  return (
    <dl className="mt-5 space-y-2 border-t border-paper-edge pt-4">
      <Row label="Subtotal" value={formatMoney(totals.subtotal, venue.currency)} />
      {totals.serviceChargeAmount > 0 ? (
        <Row
          label={`Service charge (${(venue.serviceCharge / 100).toFixed(0)}%)`}
          value={formatMoney(totals.serviceChargeAmount, venue.currency)}
        />
      ) : null}
      {totals.taxAmount > 0 ? (
        <Row label="GST (5%)" value={formatMoney(totals.taxAmount, venue.currency)} />
      ) : null}
      <div className="flex items-baseline justify-between border-t border-paper-edge pt-3">
        <dt className="text-body font-medium">Total</dt>
        <dd className="font-serif text-[1.5rem] leading-none tabular-nums">
          {formatMoney(totals.total, venue.currency)}
        </dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-caption text-ink-500">{label}</dt>
      <dd className="text-caption tabular-nums text-ink-700">{value}</dd>
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] border-t border-paper-edge bg-paper px-5 pb-8 pt-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full text-ink-500 hover:bg-paper-sunken"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Confirmation({
  venue,
  table,
  orderNumber,
  total,
  onDone,
}: {
  venue: PublicVenue;
  table: { id: string; label: string } | null;
  orderNumber: number;
  total: number;
  onDone: () => void;
}) {
  const upiLink =
    venue.paymentMode === "upi" && venue.upiId
      ? `upi://pay?pa=${encodeURIComponent(venue.upiId)}&pn=${encodeURIComponent(
          venue.name,
        )}&am=${(total / 100).toFixed(2)}&cu=${venue.currency}&tn=${encodeURIComponent(
          `Order ${orderNumber}`,
        )}`
      : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      </div>
      <h1 className="mt-8 font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Order #{orderNumber} is with the kitchen
      </h1>
      <p className="mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
        {table ? `Table ${table.label} · ` : ""}
        {venue.name} has received your order.
      </p>
      <p className="mt-6 font-serif text-[2.5rem] leading-none tabular-nums">
        {formatMoney(total, venue.currency)}
      </p>

      {upiLink ? (
        <a
          href={upiLink}
          className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-7 text-caption font-medium text-white"
        >
          Pay by UPI
        </a>
      ) : (
        <p className="mt-8 text-caption text-ink-500">
          {venue.paymentMode === "cash"
            ? "Please pay at the counter."
            : "Your server will bring the bill."}
        </p>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-4 text-caption text-ink-500 underline underline-offset-4"
      >
        Order something else
      </button>
    </div>
  );
}

function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
        veg ? "border-[#3E8E5A]" : "border-[#B4462F]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-[#3E8E5A]" : "bg-[#B4462F]"}`}
      />
    </span>
  );
}
