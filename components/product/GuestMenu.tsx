import {
  courses,
  menu,
  restaurant,
  withCurrency,
  type Dish,
} from "@/lib/demo-restaurant";

/**
 * The guest surface — real product UI, built in DOM.
 *
 * Presentational only. §1 renders it at rest, §2 renders it with the canonical
 * order already in the bar, §5 drives it with live state. Page-level typography
 * never leaks in here: inside the frame, product typography governs.
 */

export type CartLine = { id: string; quantity: number };

export function GuestMenu({
  width = 360,
  cart = [],
  onAdd,
  onPlace,
  placed = false,
  selection = true,
  className = "",
}: {
  width?: number;
  cart?: CartLine[];
  onAdd?: (dish: Dish) => void;
  onPlace?: () => void;
  placed?: boolean;
  /**
   * Row-level selection styling. Disabled in §1, where the accent budget is
   * already spent on the headline — the order bar alone carries the cart.
   */
  selection?: boolean;
  className?: string;
}) {
  const count = cart.reduce((n, line) => n + line.quantity, 0);
  const total = cart.reduce((sum, line) => {
    const dish = menu.find((d) => d.id === line.id);
    return sum + (dish ? dish.price * line.quantity : 0);
  }, 0);

  const interactive = Boolean(onAdd);
  const visible = menu.filter((dish) => dish.course === "Small Plates");

  return (
    <div
      aria-hidden={interactive ? undefined : "true"}
      style={{ width }}
      className={`relative aspect-[9/19] shrink-0 rounded-[42px] border border-paper-edge bg-ink p-[9px] shadow-float ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-paper">
        <div className="flex items-center justify-between px-6 pt-4 text-[10px] font-semibold text-ink">
          <span>9:41</span>
          <span className="h-[9px] w-[15px] rounded-[3px] border border-ink/40" />
        </div>

        <div className="px-6 pt-7">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">
            Table {restaurant.table}
          </p>
          <p className="mt-2 font-serif text-[27px] leading-none tracking-[-0.02em]">
            {restaurant.name}
          </p>
        </div>

        <div className="mt-6 flex gap-2 overflow-hidden px-6">
          {courses.map((course, i) => (
            <span
              key={course}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                i === 0
                  ? "bg-ink text-paper"
                  : "border border-paper-edge bg-paper-raised text-ink-500"
              }`}
            >
              {course}
            </span>
          ))}
        </div>

        <div className="mt-5 space-y-2.5 px-6">
          {visible.map((dish) => {
            const line = cart.find((l) => l.id === dish.id);
            const Row = interactive ? "button" : "div";
            return (
              <Row
                key={dish.id}
                {...(interactive
                  ? {
                      type: "button" as const,
                      onClick: () => onAdd?.(dish),
                      "aria-label": `Add ${dish.name}, ${withCurrency(dish.price)}`,
                    }
                  : {})}
                className={`w-full rounded-2xl border p-3.5 text-left shadow-paper transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  line && selection
                    ? "border-accent/40 bg-accent-soft"
                    : "border-paper-edge/70 bg-paper-raised"
                } ${interactive ? "cursor-pointer active:scale-[0.98] hover:border-ink-300" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium leading-tight">
                      {dish.name}
                    </p>
                    <p className="mt-1 truncate text-[11px] leading-tight text-ink-500">
                      {dish.note}
                    </p>
                  </div>
                  <p className="shrink-0 text-[12px] tabular-nums text-ink-700">
                    {line ? (
                      <span className={selection ? "text-accent-deep" : "text-ink-500"}>
                        {line.quantity}×
                      </span>
                    ) : null}{" "}
                    {withCurrency(dish.price)}
                  </p>
                </div>
              </Row>
            );
          })}
        </div>

        {/* Liquid glass order bar — one of only two uses of the effect on the site. */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div
            className={`flex items-center justify-between rounded-full border border-white/50 bg-white/60 py-2 pl-5 pr-2 shadow-lift backdrop-blur-xl transition-opacity duration-300 ${
              count === 0 ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="text-[12px] font-medium tabular-nums">
              {count} {count === 1 ? "item" : "items"} · {withCurrency(total)}
            </span>
            {onPlace ? (
              <button
                type="button"
                onClick={onPlace}
                disabled={placed}
                className={`rounded-full px-3.5 py-2 text-[11px] font-medium text-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
                  placed ? "bg-ink-300" : "bg-accent hover:bg-accent-deep"
                }`}
              >
                {placed ? "Sent to kitchen" : "Place order"}
              </button>
            ) : (
              <span
                className={`rounded-full px-3.5 py-2 text-[11px] font-medium text-white ${
                  placed ? "bg-ink-300" : "bg-accent"
                }`}
              >
                {placed ? "Sent to kitchen" : "Place order"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
