/**
 * The kitchen surface.
 *
 * The only screen in Trogix that inverts to ink: a pass is loud, hot and
 * bright, so the display has to recede and the tickets have to shout.
 */

const tickets = [
  {
    table: "12",
    elapsed: "0:42",
    state: "new" as const,
    items: ["2× Burrata", "1× Agnolotti", "1× Octopus — no chilli"],
  },
  {
    table: "07",
    elapsed: "4:18",
    state: "firing" as const,
    items: ["3× Dover Sole", "2× Pommes Purée"],
  },
  {
    table: "21",
    elapsed: "8:55",
    state: "late" as const,
    items: ["1× Ribeye — medium rare", "1× Chicory Salad"],
  },
];

const stateStyle = {
  new: { dot: "bg-accent", label: "New", text: "text-accent" },
  firing: { dot: "bg-white/70", label: "Firing", text: "text-white/70" },
  late: { dot: "bg-[#E0793F]", label: "8 min", text: "text-[#E0793F]" },
};

export function KitchenDisplay({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden rounded-[20px] bg-ink p-6 shadow-float sm:p-8 ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-paper/40">
          Pass · Dinner Service
        </p>
        <p className="font-serif text-lg text-paper/70 tabular-nums">19:41</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
                {ticket.items.map((item) => (
                  <li key={item} className="text-[12px] leading-snug text-paper/75">
                    {item}
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
