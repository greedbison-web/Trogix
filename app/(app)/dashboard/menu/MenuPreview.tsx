"use client";

import type { MenuCategory } from "@/lib/queries/menu";
import { formatMoney } from "@/lib/format";
import { VegMark } from "./MenuBuilder";

/** Live guest-side rendering of exactly what is on screen. */
export function MenuPreview({
  categories,
  currency,
  businessName,
}: {
  categories: MenuCategory[];
  currency: string;
  businessName: string;
}) {
  const visible = categories.filter(
    (c) => c.isActive && c.items.some((i) => i.isAvailable),
  );

  return (
    <div>
      <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
        Guest preview
      </h2>

      <div className="mt-3 aspect-[9/19] w-full max-w-[300px] rounded-[42px] border border-paper-edge bg-ink p-[9px] shadow-float">
        <div className="h-full w-full overflow-y-auto rounded-[34px] bg-paper px-5 pb-6 pt-6">
          <p className="font-serif text-[24px] leading-none tracking-[-0.02em]">
            {businessName}
          </p>

          {visible.length === 0 ? (
            <p className="mt-8 text-[12px] text-ink-300">
              Nothing is published yet.
            </p>
          ) : (
            visible.map((category) => (
              <section key={category.id} className="mt-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">
                  {category.name}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {category.items
                    .filter((item) => item.isAvailable)
                    .map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-paper-edge/70 bg-paper-raised p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <VegMark veg={item.isVegetarian} />
                              <span className="truncate text-[12px] font-medium leading-tight">
                                {item.name}
                              </span>
                            </span>
                            {item.description ? (
                              <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-ink-500">
                                {item.description}
                              </p>
                            ) : null}
                            {item.variants.length > 0 ? (
                              <p className="mt-1 text-[10px] text-ink-300">
                                {item.variants.map((v) => v.name).join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[11px] tabular-nums text-ink-700">
                            {formatMoney(item.price, currency)}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
