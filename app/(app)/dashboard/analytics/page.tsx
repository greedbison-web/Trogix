import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getAnalytics, type Analytics } from "@/lib/queries/analytics";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const EMPTY: Analytics = {
  peakHours: [],
  repeat: { guests: 0, repeatGuests: 0, totalVisits: 0 },
  tableUse: [],
  today: { orders: 0, revenue: 0 },
  period: { orders: 0, revenue: 0, average: 0 },
  series: [],
  topItems: [],
  byType: [],
  days: 14,
};

export default async function AnalyticsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getActiveBusiness(user.id);
  if (!record) redirect("/onboarding");

  let data = EMPTY;
  try {
    data = await getAnalytics(record.business.id, record.business.timezone);
  } catch {
    data = EMPTY;
  }

  const currency = record.business.currency;
  const peak = Math.max(1, ...data.series.map((d) => d.revenue));
  const peakHourMax = Math.max(1, ...data.peakHours.map((h) => h.orders));
  const tableMax = Math.max(1, ...data.tableUse.map((t) => t.orders));
  const repeatPct =
    data.repeat.guests > 0
      ? Math.round((data.repeat.repeatGuests / data.repeat.guests) * 100)
      : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
            Analytics
          </h1>
          <p className="mt-2 text-caption text-ink-500">
            Completed orders over the last {data.days} days.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/analytics/export?format=csv"
            className="inline-flex h-11 items-center rounded-full border border-paper-edge bg-paper-raised px-5 text-caption font-medium text-ink hover:border-ink-300"
          >
            Export CSV
          </a>
          <a
            href="/dashboard/analytics/export?format=pdf"
            className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-caption font-medium text-paper"
          >
            Export PDF
          </a>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-paper-edge bg-paper-edge lg:grid-cols-4">
        <Stat label="Revenue today" value={formatMoney(data.today.revenue, currency)} />
        <Stat label="Orders today" value={String(data.today.orders)} />
        <Stat
          label={`Revenue · ${data.days}d`}
          value={formatMoney(data.period.revenue, currency)}
        />
        <Stat
          label="Average order"
          value={formatMoney(data.period.average, currency)}
        />
      </dl>

      {data.series.length === 0 ? (
        <div className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-16 text-center">
          <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
            No completed orders yet
          </p>
          <p className="mx-auto mt-3 max-w-[340px] text-caption leading-relaxed text-ink-500">
            Figures appear here once orders are paid and closed. Nothing is
            estimated.
          </p>
        </div>
      ) : (
        <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
          <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
            Daily revenue
          </h2>
          <ul className="mt-6 flex h-48 items-end gap-1.5">
            {data.series.map((day) => (
              <li key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <span
                  className="w-full rounded-t bg-accent/80"
                  style={{ height: `${Math.max(4, (day.revenue / peak) * 160)}px` }}
                  title={`${day.day}: ${formatMoney(day.revenue, currency)}`}
                />
                <span className="text-[10px] tabular-nums text-ink-300">
                  {day.day.slice(8)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
        <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
          Peak hours
        </h2>
        {data.peakHours.length === 0 ? (
          <p className="mt-4 text-caption text-ink-500">No completed orders yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <ul className="flex h-32 min-w-[560px] items-end gap-1">
              {Array.from({ length: 24 }, (_, hour) => {
                const row = data.peakHours.find((h) => h.hour === hour);
                const orders = row?.orders ?? 0;
                return (
                  <li key={hour} className="flex flex-1 flex-col items-center gap-2">
                    <span
                      className={`w-full rounded-t ${orders > 0 ? "bg-accent/80" : "bg-paper-sunken"}`}
                      style={{ height: `${Math.max(3, (orders / peakHourMax) * 100)}px` }}
                      title={`${String(hour).padStart(2, "0")}:00 — ${orders} orders`}
                    />
                    <span className="text-[10px] tabular-nums text-ink-300">
                      {String(hour).padStart(2, "0")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
          <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
            Repeat customers
          </h2>
          <p className="mt-4 font-serif text-[2.5rem] leading-none tabular-nums">
            {repeatPct === null ? "—" : `${repeatPct}%`}
          </p>
          <p className="mt-2 text-caption text-ink-500">
            {data.repeat.repeatGuests} of {data.repeat.guests} identified guests
            have ordered more than once.
          </p>
          <p className="mt-1 text-micro text-ink-300">
            Counted by mobile number, so guests who order anonymously are not
            included.
          </p>
        </section>

        <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
          <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
            Table utilisation
          </h2>
          {data.tableUse.length === 0 ? (
            <p className="mt-4 text-caption text-ink-500">No tables yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-paper-edge">
              {data.tableUse.slice(0, 8).map((table) => (
                <li key={table.label} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 shrink-0 text-caption text-ink">
                    {table.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${(table.orders / tableMax) * 100}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-micro tabular-nums text-ink-500">
                    {table.orders} orders
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
          <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
            Best sellers
          </h2>
          {data.topItems.length === 0 ? (
            <p className="mt-4 text-caption text-ink-500">No sales yet.</p>
          ) : (
            <ol className="mt-4 divide-y divide-paper-edge">
              {data.topItems.map((item) => (
                <li key={item.name} className="flex items-baseline justify-between py-3">
                  <span className="min-w-0 truncate text-caption text-ink">
                    {item.name}
                  </span>
                  <span className="shrink-0 pl-4 text-caption tabular-nums text-ink-500">
                    {item.quantity} · {formatMoney(item.revenue, currency)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
          <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
            Order type
          </h2>
          {data.byType.length === 0 ? (
            <p className="mt-4 text-caption text-ink-500">No sales yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-paper-edge">
              {data.byType.map((row) => (
                <li key={row.type} className="flex items-baseline justify-between py-3">
                  <span className="text-caption capitalize text-ink">
                    {row.type.replace("_", " ")}
                  </span>
                  <span className="text-caption tabular-nums text-ink-500">
                    {row.orders} · {formatMoney(row.revenue, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-raised p-5">
      <dt className="text-micro uppercase tracking-[0.16em] text-ink-300">{label}</dt>
      <dd className="mt-2 font-serif text-[2rem] leading-none tabular-nums">{value}</dd>
    </div>
  );
}
