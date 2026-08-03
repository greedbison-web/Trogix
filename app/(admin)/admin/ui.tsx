import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-[620px] text-caption leading-relaxed text-ink-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; hint?: string; alert?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-paper-edge bg-paper-edge md:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-paper-raised p-5">
          <dt className="text-micro uppercase tracking-[0.16em] text-ink-300">
            {stat.label}
          </dt>
          <dd
            className={`mt-2 font-serif text-[1.875rem] leading-none tabular-nums ${
              stat.alert ? "text-[var(--color-state-late)]" : "text-ink"
            }`}
          >
            {stat.value}
          </dd>
          {stat.hint ? (
            <p className="mt-1.5 text-micro text-ink-500">{stat.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-paper-edge bg-paper-raised">
      <header className="flex items-center justify-between gap-4 border-b border-paper-edge px-5 py-3.5">
        <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-caption text-ink-300">{children}</p>
  );
}

const TONES: Record<string, string> = {
  active: "bg-accent-soft text-accent-deep",
  connected: "bg-accent-soft text-accent-deep",
  succeeded: "bg-accent-soft text-accent-deep",
  processed: "bg-accent-soft text-accent-deep",
  trial: "bg-paper-sunken text-ink-700",
  onboarding: "bg-paper-sunken text-ink-500",
  pending_review: "bg-[#EFE7D6] text-[#7a6428]",
  "pending review": "bg-[#EFE7D6] text-[#7a6428]",
  pending: "bg-paper-sunken text-ink-500",
  received: "bg-paper-sunken text-ink-500",
  suspended: "bg-[#F5E2D8] text-[var(--color-state-late)]",
  failed: "bg-[#F5E2D8] text-[var(--color-state-late)]",
  rejected: "bg-[#F5E2D8] text-[var(--color-state-late)]",
  expired: "bg-[#F5E2D8] text-[var(--color-state-late)]",
  revoked: "bg-paper-sunken text-ink-300",
  closed: "bg-paper-sunken text-ink-300",
  disconnected: "bg-paper-sunken text-ink-300",
};

export function Pill({ value }: { value: string | null | undefined }) {
  const key = (value ?? "unknown").toLowerCase();
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
        TONES[key] ?? "bg-paper-sunken text-ink-500"
      }`}
    >
      {(value ?? "unknown").replace(/_/g, " ")}
    </span>
  );
}

export function TableShell({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-paper-edge">
            {head.map((label) => (
              <th
                key={label}
                scope="col"
                className="px-5 py-3 text-micro font-medium uppercase tracking-[0.16em] text-ink-300"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-edge">{children}</tbody>
      </table>
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center rounded-full px-4 text-micro font-medium transition-colors ${
        variant === "primary"
          ? "bg-ink text-paper hover:bg-ink-700"
          : "border border-paper-edge bg-paper-raised text-ink-700 hover:border-ink-300"
      }`}
    >
      {children}
    </Link>
  );
}
