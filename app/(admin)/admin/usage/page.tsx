import Link from "next/link";
import { getUsageMonitoring, getFraudSignals } from "@/lib/queries/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { formatMoney } from "@/lib/format";
import { PageHeader, Panel, TableShell, Pill, EmptyRow, StatGrid } from "../ui";

export const metadata = { title: "Usage" };
export const dynamic = "force-dynamic";

export default async function UsagePage() {
  await requireAdmin("restaurants.read");

  let usage: Awaited<ReturnType<typeof getUsageMonitoring>> | null = null;
  let fraud: Awaited<ReturnType<typeof getFraudSignals>> | null = null;
  try {
    [usage, fraud] = await Promise.all([getUsageMonitoring(), getFraudSignals()]);
  } catch {
    usage = null;
  }

  if (!usage || !fraud) {
    return (
      <div className="space-y-8">
        <PageHeader title="Usage & risk" />
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          The database is unreachable.
        </p>
      </div>
    );
  }

  const sent = usage.messages
    .filter((m) => m.status === "sent")
    .reduce((n, m) => n + m.count, 0);
  const failedMessages = usage.messages
    .filter((m) => m.status === "failed")
    .reduce((n, m) => n + m.count, 0);
  const queued = usage.messages
    .filter((m) => m.status === "queued" || m.status === "skipped")
    .reduce((n, m) => n + m.count, 0);

  const signals =
    fraud.failureSpikes.length +
    fraud.cancellations.length +
    fraud.duplicateGuests.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage & risk"
        subtitle="Platform consumption per restaurant, and heuristic signals for a human to review."
      />

      <StatGrid
        stats={[
          { label: "Orders all time", value: String(usage.totals.orders) },
          { label: "QR scans", value: String(usage.totals.scans) },
          { label: "Messages sent", value: String(sent) },
          { label: "Messages queued", value: String(queued) },
          {
            label: "Messages failed",
            value: String(failedMessages),
            alert: failedMessages > 0,
          },
        ]}
      />

      <Panel title={`Risk signals (${signals})`}>
        {signals === 0 ? (
          <EmptyRow>Nothing unusual in the last 24 hours.</EmptyRow>
        ) : (
          <div className="divide-y divide-paper-edge">
            {fraud.failureSpikes.length > 0 ? (
              <div className="p-5">
                <p className="text-caption font-medium text-ink">
                  Repeated payment failures · last 24h
                </p>
                <p className="mt-1 text-micro text-ink-500">
                  Five or more failed payments can indicate card testing.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {fraud.failureSpikes.map((row) => (
                    <li key={row.businessId} className="flex items-center gap-3 text-caption">
                      <Link
                        href={`/admin/restaurants/${row.businessId}`}
                        className="text-accent-deep hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="text-ink-500">
                        {row.failed} failures across {row.distinctOrders} orders
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {fraud.cancellations.length > 0 ? (
              <div className="p-5">
                <p className="text-caption font-medium text-ink">
                  High cancellations · last 7 days
                </p>
                <ul className="mt-3 space-y-1.5">
                  {fraud.cancellations.map((row) => (
                    <li key={row.businessId} className="flex items-center gap-3 text-caption">
                      <Link
                        href={`/admin/restaurants/${row.businessId}`}
                        className="text-accent-deep hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="text-ink-500">
                        {row.cancelled} of {row.total} orders cancelled
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {fraud.duplicateGuests.length > 0 ? (
              <div className="p-5">
                <p className="text-caption font-medium text-ink">
                  One number ordering at many venues · last 24h
                </p>
                <ul className="mt-3 space-y-1.5">
                  {fraud.duplicateGuests.map((row) => (
                    <li key={row.guestPhone} className="flex items-center gap-3 text-caption">
                      <span className="tabular-nums text-ink">{row.guestPhone}</span>
                      <span className="text-ink-500">
                        {row.orders} orders across {row.venues} restaurants
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {fraud.refunds.length > 0 ? (
              <div className="p-5">
                <p className="text-caption font-medium text-ink">Refund volume</p>
                <ul className="mt-3 space-y-1.5">
                  {fraud.refunds.map((row) => (
                    <li key={row.businessId} className="flex items-center gap-3 text-caption">
                      <Link
                        href={`/admin/restaurants/${row.businessId}`}
                        className="text-accent-deep hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="tabular-nums text-ink-500">
                        {formatMoney(row.refunded)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel title="Message delivery">
        {usage.messages.length === 0 ? (
          <EmptyRow>No guest messages yet.</EmptyRow>
        ) : (
          <TableShell head={["Channel", "Status", "Count"]}>
            {usage.messages.map((row) => (
              <tr key={`${row.channel}-${row.status}`}>
                <td className="px-5 py-3 text-caption capitalize text-ink">
                  {row.channel}
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.status} />
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                  {row.count}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel title="Consumption by restaurant · last 30 days">
        {usage.byBusiness.length === 0 ? (
          <EmptyRow>No restaurants yet.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Orders", "Scans", "Menu", "Tables", "Staff", ""]}>
            {usage.byBusiness.map((row) => (
              <tr key={row.businessId}>
                <td className="px-5 py-3 text-caption text-ink">{row.name}</td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                  {row.orders30}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                  {row.scans30}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-500">
                  {row.menuItems}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-500">
                  {row.tables}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-500">
                  {row.staff}
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
  );
}
