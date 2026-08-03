import Link from "next/link";
import { getPlatformAnalytics } from "@/lib/queries/admin";
import { formatMoney } from "@/lib/format";
import { PageHeader, Panel, TableShell, EmptyRow, StatGrid } from "../ui";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  let data: Awaited<ReturnType<typeof getPlatformAnalytics>> | null = null;
  try {
    data = await getPlatformAnalytics();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader title="Analytics" />
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          The database is unreachable.
        </p>
      </div>
    );
  }

  // MRR from the trailing 30 days of captured payments; ARR is that annualised.
  const mrr = data.totals.thisMonth;
  const arr = mrr * 12;
  const peak = Math.max(1, ...data.daily.map((d) => d.revenue));
  const retentionPct =
    data.retention.orderedEver > 0
      ? Math.round((data.retention.orderedLast30 / data.retention.orderedEver) * 100)
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Computed from captured payments and completed orders only. Nothing is estimated."
      />

      <StatGrid
        stats={[
          { label: "MRR", value: formatMoney(mrr), hint: "This calendar month" },
          { label: "ARR", value: formatMoney(arr), hint: "MRR × 12" },
          {
            label: "Growth",
            value: data.totals.growth === null ? "—" : `${data.totals.growth}%`,
            hint: "Month over month",
          },
          {
            label: "Retention",
            value: retentionPct === null ? "—" : `${retentionPct}%`,
            hint: "Ordered in last 30d",
          },
          { label: "Accounts", value: String(data.activeUsers) },
        ]}
      />

      <Panel title={`Daily revenue · last ${data.days} days`}>
        {data.daily.length === 0 ? (
          <EmptyRow>No captured payments yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto p-6">
            <ul className="flex h-48 min-w-[560px] items-end gap-1.5">
              {data.daily.map((day) => (
                <li key={day.day} className="flex flex-1 flex-col items-center gap-2">
                  <span
                    className="w-full rounded-t bg-accent/80"
                    style={{ height: `${Math.max(4, (day.revenue / peak) * 160)}px` }}
                    title={`${day.day}: ${formatMoney(day.revenue)}`}
                  />
                  <span className="text-[10px] tabular-nums text-ink-300">
                    {day.day.slice(8)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Monthly revenue">
          {data.monthly.length === 0 ? (
            <EmptyRow>No revenue yet.</EmptyRow>
          ) : (
            <TableShell head={["Month", "Payments", "Revenue"]}>
              {[...data.monthly].reverse().map((row) => (
                <tr key={row.month}>
                  <td className="px-5 py-3 text-caption tabular-nums">{row.month}</td>
                  <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                    {row.payments}
                  </td>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    {formatMoney(row.revenue)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel title="Top restaurants">
          {data.topRestaurants.length === 0 ? (
            <EmptyRow>No revenue yet.</EmptyRow>
          ) : (
            <TableShell head={["Restaurant", "Orders", "Revenue", ""]}>
              {data.topRestaurants.map((row) => (
                <tr key={row.businessId}>
                  <td className="px-5 py-3 text-caption text-ink">{row.name}</td>
                  <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                    {row.orders}
                  </td>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    {formatMoney(row.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/restaurants/${row.businessId}`}
                      className="text-micro font-medium text-accent-deep hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>
      </div>

      <Panel title="Funnel">
        <dl className="grid gap-px bg-paper-edge sm:grid-cols-3">
          <Cell label="Signed up" value={data.retention.signedUp} />
          <Cell label="Took an order" value={data.retention.orderedEver} />
          <Cell label="Ordered in 30 days" value={data.retention.orderedLast30} />
        </dl>
      </Panel>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper-raised p-5">
      <dt className="text-micro uppercase tracking-[0.16em] text-ink-300">{label}</dt>
      <dd className="mt-2 font-serif text-[1.875rem] leading-none tabular-nums">
        {value}
      </dd>
    </div>
  );
}
