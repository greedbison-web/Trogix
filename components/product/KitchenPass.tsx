import { passTickets, restaurant } from "@/lib/demo-restaurant";

/**
 * The kitchen surface.
 *
 * The only product surface that inverts to ink: a pass is hot, loud and bright,
 * so the display recedes and the tickets carry all the contrast.
 *
 * `--color-state-late` is semantic state, not a second brand accent. It appears
 * here and nowhere else on the site.
 */

const stateStyle = {
  new: { dot: "bg-accent", label: "New", text: "text-accent" },
  firing: { dot: "bg-white/70", label: "Firing", text: "text-white/70" },
  late: { dot: "bg-[var(--color-state-late)]", label: "8 min", text: "text-[var(--color-state-late)]" },
};

export function KitchenPass({
  tickets = passTickets,
  className = "",
  bare = false,
}: {
  tickets?: typeof passTickets;
  className?: string;
  /** Renders without its own ink ground, for use on an already-ink section. */
  bare?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${bare ? "" : "rounded-[20px] bg-ink p-6 shadow-float sm:p-8"} ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-paper/40">
          Pass · {restaurant.service}
        </p>
        <p className="font-serif text-lg tabular-nums text-paper/70">19:46</p>
      </div>

      <div
        className={`mt-6 grid gap-3 ${tickets.length > 1 ? "sm:grid-cols-3" : ""}`}
      >
        {tickets.map((ticket) => {
          const style = stateStyle[ticket.state];
          return (
            <div
              key={ticket.table}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-serif text-2xl leading-none text-paper">
                  T{ticket.table}
                </p>
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  <span className={`text-[11px] font-medium ${style.text}`}>
                    {style.label}
                  </span>
                </span>
              </div>

              <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
                {ticket.lines.map((line) => (
                  <li key={line} className="text-[12px] leading-snug text-paper/75">
                    {line}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] tabular-nums text-paper/35">
                {ticket.elapsed} on the pass
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
