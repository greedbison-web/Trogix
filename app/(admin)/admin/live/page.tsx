import { getLiveFeed } from "@/lib/queries/admin";
import { formatMoney } from "@/lib/format";
import { PageHeader, Panel, TableShell, Pill, EmptyRow } from "../ui";
import { AutoRefresh } from "../AutoRefresh";

export const metadata = { title: "Live" };
export const dynamic = "force-dynamic";

function ago(date: Date | string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function LivePage() {
  let feed: Awaited<ReturnType<typeof getLiveFeed>> | null = null;
  try {
    feed = await getLiveFeed();
  } catch {
    feed = null;
  }

  if (!feed) {
    return (
      <div className="space-y-8">
        <PageHeader title="Live monitoring" />
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          The database is unreachable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={10} />
      <PageHeader
        title="Live monitoring"
        subtitle="Refreshes every 10 seconds. Nothing here is cached."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Incoming orders">
          {feed.orders.length === 0 ? (
            <EmptyRow>No orders yet.</EmptyRow>
          ) : (
            <TableShell head={["Order", "Restaurant", "Status", "Total", "When"]}>
              {feed.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    #{order.orderNumber}
                  </td>
                  <td className="px-5 py-3 text-caption text-ink-700">
                    {order.businessName}
                  </td>
                  <td className="px-5 py-3">
                    <Pill value={order.status} />
                  </td>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {ago(order.placedAt ?? order.createdAt)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel title="Payments">
          {feed.payments.length === 0 ? (
            <EmptyRow>No payments yet.</EmptyRow>
          ) : (
            <TableShell head={["Restaurant", "Status", "Method", "Amount", "When"]}>
              {feed.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-3 text-caption text-ink-700">
                    {payment.businessName}
                  </td>
                  <td className="px-5 py-3">
                    <Pill value={payment.status} />
                  </td>
                  <td className="px-5 py-3 text-micro capitalize text-ink-500">
                    {payment.method ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    {formatMoney(payment.amount, payment.currency)}
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {ago(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel title="QR scans">
          {feed.scans.length === 0 ? (
            <EmptyRow>No scans recorded.</EmptyRow>
          ) : (
            <TableShell head={["Restaurant", "Table", "When"]}>
              {feed.scans.map((scan) => (
                <tr key={scan.id}>
                  <td className="px-5 py-3 text-caption text-ink-700">
                    {scan.businessName}
                  </td>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    {scan.tableLabel ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {ago(scan.createdAt)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel title="Online restaurants">
          {feed.online.length === 0 ? (
            <EmptyRow>Nobody is trading right now.</EmptyRow>
          ) : (
            <TableShell head={["Restaurant", "Active orders", "Last activity"]}>
              {feed.online.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-caption text-ink">{row.name}</td>
                  <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                    {row.activeOrders}
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {ago(row.lastActivity)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel title="Failed payments">
          {feed.failures.length === 0 ? (
            <EmptyRow>No failures.</EmptyRow>
          ) : (
            <TableShell head={["Restaurant", "Amount", "Reason", "When"]}>
              {feed.failures.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-caption text-ink-700">
                    {row.businessName}
                  </td>
                  <td className="px-5 py-3 text-caption tabular-nums">
                    {formatMoney(row.amount, row.currency)}
                  </td>
                  <td className="px-5 py-3 text-micro text-[var(--color-state-late)]">
                    {row.failureReason ?? "Unknown"}
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {ago(row.createdAt)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel title="Error log">
          {feed.errors.length === 0 ? (
            <EmptyRow>No errors recorded.</EmptyRow>
          ) : (
            <TableShell head={["Level", "Source", "Message", "When"]}>
              {feed.errors.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3">
                    <Pill value={row.level} />
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-700">{row.source}</td>
                  <td className="px-5 py-3 text-micro text-ink-500">{row.message}</td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {ago(row.createdAt)}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>
      </div>
    </div>
  );
}
