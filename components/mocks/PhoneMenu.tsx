/**
 * The guest surface.
 *
 * Built in DOM rather than shipped as a screenshot so it stays crisp at every
 * density, inherits the brand tokens, and can never drift from the real product.
 */

const dishes = [
  { name: "Burrata, Heirloom Tomato", note: "Basil oil, aged balsamic", price: "620" },
  { name: "Charred Octopus", note: "Salsa verde, fingerling potato", price: "980" },
  { name: "Wild Mushroom Agnolotti", note: "Brown butter, sage, pecorino", price: "740" },
  { name: "Cured Hamachi", note: "Yuzu, green chilli, radish", price: "860" },
  { name: "Warm Sourdough", note: "Cultured butter, sea salt", price: "280" },
];

export function PhoneMenu({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative aspect-[9/19] w-full max-w-[300px] rounded-[42px] border border-paper-edge bg-ink p-[9px] shadow-float ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-paper">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-4 text-[10px] font-semibold text-ink">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="h-[9px] w-[15px] rounded-[3px] border border-ink/40" />
          </div>
        </div>

        {/* Restaurant identity */}
        <div className="px-6 pt-7">
          <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-ink-500">
            Table 12
          </p>
          <p className="mt-2 font-serif text-[27px] leading-none tracking-[-0.02em]">
            Maison Verde
          </p>
        </div>

        {/* Course rail */}
        <div className="mt-6 flex gap-2 overflow-hidden px-6">
          {["Small Plates", "Mains", "Wine"].map((course, i) => (
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

        {/* Dishes */}
        <div className="mt-5 space-y-2.5 px-6">
          {dishes.map((dish) => (
            <div
              key={dish.name}
              className="rounded-2xl border border-paper-edge/70 bg-paper-raised p-3.5 shadow-paper"
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
                  ₹{dish.price}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Liquid glass order bar — the one place the effect earns its keep */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center justify-between rounded-full border border-white/50 bg-white/60 py-2 pl-5 pr-2 shadow-lift backdrop-blur-xl">
            <span className="text-[12px] font-medium">3 items · ₹2,340</span>
            <span className="rounded-full bg-accent px-3.5 py-2 text-[11px] font-medium text-white">
              Place order
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
