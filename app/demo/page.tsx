const features = [
  {
    title: "Frosted surfaces",
    body: "Every panel is a sheet of glass, not a box. Backdrop blur carries the slate beneath it through the surface, so depth is inherited rather than drawn.",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <path d="M3.5 14.5 14.5 3.5M9 20.5 20.5 9" />
      </>
    ),
  },
  {
    title: "Considered motion",
    body: "Light pools drift across the background on cycles long enough that you notice the room has changed, never the moment it moved. Nothing bounces.",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 6.5v5.5l3.5 2.5" />
      </>
    ),
  },
  {
    title: "Restraint by default",
    body: "One warm accent, spent only on the things you can press. Everything else lives in soft grey, and the hierarchy does the work colour would have done.",
    icon: (
      <>
        <path d="M4 12h16" />
        <circle cx="9" cy="12" r="3" />
      </>
    ),
  },
];

const stats = [
  { value: "24px", label: "Corner radius" },
  { value: "8%", label: "Surface opacity" },
  { value: "28px", label: "Backdrop blur" },
  { value: "1", label: "Accent colour" },
];

export default function LiquidGlassDemo() {
  return (
    <main id="main" className="mx-auto max-w-[1120px] px-6 pb-28 pt-24 sm:pt-32">
      {/* ---- Hero ---- */}
      <section className="max-w-[760px]">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--text-quiet)]">
          Liquid glass · Interface study
        </p>

        <h1 className="glass-display mt-7 text-[clamp(2.75rem,7.2vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.042em]">
          {/* Breaks by sentence once there is width for it; wraps naturally below */}
          <span className="sm:block">Depth you can feel.</span>{" "}
          <span className="sm:block">Surfaces you can see through.</span>
        </h1>

        <p className="mt-8 max-w-[540px] text-[1.0625rem] leading-[1.65] text-[var(--text-body)]">
          A front-end study in frosted panels floating over deep slate. No data,
          no chrome, no second colour — just the material, lit from one side and
          left to hold the light.
        </p>

        <div className="mt-11 flex flex-wrap items-center gap-3">
          <a
            href="#features"
            className="glass-btn-amber rounded-full px-7 py-3.5 text-[0.9375rem] font-medium tracking-[-0.01em]"
          >
            Explore the surface
          </a>
          <a
            href="#metrics"
            className="glass-btn-ghost rounded-full px-7 py-3.5 text-[0.9375rem] font-medium tracking-[-0.01em]"
          >
            See the numbers
          </a>
        </div>
      </section>

      {/* ---- Feature cards ---- */}
      <section
        id="features"
        className="mt-24 grid gap-5 sm:mt-28 md:grid-cols-3"
      >
        {features.map((feature) => (
          <article
            key={feature.title}
            className="glass-panel glass-lift p-8 sm:p-9"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-6 w-6 text-[var(--text-quiet)]"
            >
              {feature.icon}
            </svg>

            <h2 className="mt-7 text-[1.3125rem] font-semibold tracking-[-0.025em] text-[var(--text-head)]">
              {feature.title}
            </h2>

            <p className="mt-3.5 text-[0.9375rem] leading-[1.65] text-[var(--text-body)]">
              {feature.body}
            </p>
          </article>
        ))}
      </section>

      {/* ---- Stats bar ---- */}
      <section
        id="metrics"
        className="glass-panel glass-lift mt-5 px-8 py-10 sm:px-10"
      >
        <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={
                i > 0
                  ? "lg:border-l lg:border-white/[0.08] lg:pl-10"
                  : undefined
              }
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-[var(--text-head)]">
                  {stat.value}
                </span>
                <span className="mt-3 block text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--text-quiet)]">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="glass-hairline mt-24 h-px" aria-hidden="true" />

      <p className="mt-8 text-center text-[0.8125rem] tracking-[-0.005em] text-[var(--text-quiet)]">
        Visual demo — no backend, no data.
      </p>
    </main>
  );
}
