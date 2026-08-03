import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getAnalytics, type Analytics } from "@/lib/queries/analytics";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const EMPTY: Analytics = {
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          Analytics
        </h1>
        <p className="mt-2 text-caption text-ink-500">
          Completed orders over the last {data.days} days.
        </p>
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
