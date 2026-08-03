/**
 * The owner surface.
 *
 * Restaurant software usually greets an owner with forty numbers. Trogix
 * greets them with four, and the confidence to leave the rest below the fold.
 */

const stats = [
  { label: "Covers tonight", value: "148", delta: "+12%" },
  { label: "Average spend", value: "₹2,140", delta: "+8%" },
  { label: "Table turn", value: "62m", delta: "−6m" },
];

// A calm revenue curve — no axes, no gridlines, no legend.
const points = [4, 18, 12, 30, 26, 44, 38, 58, 52, 74, 68, 92];

export function Dashboard({ className = "" }: { className?: string }) {
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - value;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden rounded-[20px] border border-paper-edge/70 bg-paper-raised p-6 shadow-float sm:p-8 ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-ink-500">
          Maison Verde · Today
        </p>
        <p className="text-[11px] text-ink-300">Updated live</p>
      </div>

      <p className="mt-6 font-serif text-[clamp(2.5rem,6vw,4rem)] leading-none tracking-[-0.03em]">
        ₹3,16,840
      </p>
      <p className="mt-2 text-[13px] text-ink-500">
        <span className="text-accent-deep">+18.4%</span> against last Friday
      </p>

      {/* Revenue curve */}
      <div className="mt-7 h-24 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="trogix-curve-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L100,100 L0,100 Z`} fill="url(#trogix-curve-fill)" />
          <path
            d={path}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-4 border-t border-paper-edge pt-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-[11px] leading-tight text-ink-500">{stat.label}</p>
            <p className="mt-1.5 font-serif text-2xl leading-none tracking-[-0.02em]">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-accent-deep">{stat.delta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
