import Link from "next/link";
import { getPaymentMonitoring } from "@/lib/queries/admin";
import { requireAdmin, can } from "@/lib/admin/auth";
import { formatMoney } from "@/lib/format";
import { PageHeader, Panel, TableShell, Pill, EmptyRow, StatGrid } from "../ui";
import { WebhookControls } from "./WebhookControls";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const admin = await requireAdmin("payments.read");

  let data: Awaited<ReturnType<typeof getPaymentMonitoring>> | null = null;
  try {
    data = await getPaymentMonitoring();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader title="Payment monitoring" />
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          The database is unreachable.
        </p>
      </div>
    );
  }

  const connected = data.accounts.filter((a) => a.status === "connected").length;
  const broken = data.accounts.filter(
    (a) => a.status === "expired" || a.status === "revoked",
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payment monitoring"
        subtitle="Trogix never holds funds. These are the restaurants' own Razorpay accounts."
      />

      <StatGrid
        stats={[
          { label: "Connected", value: String(connected) },
          {
            label: "Needs attention",
            value: String(broken),
            alert: broken > 0,
          },
          {
            label: "Success rate",
            value: data.rate.successRate === null ? "—" : `${data.rate.successRate}%`,
            hint: "Last 30 days",
          },
          {
            label: "Volume",
            value: formatMoney(data.rate.volume),
            hint: "Last 30 days",
          },
          {
            label: "Failed webhooks",
            value: String(data.webhooks.length),
            alert: data.webhooks.length > 0,
          },
        ]}
      />

      <WebhookControls
        webhooks={data.webhooks.map((w) => ({
          id: w.id,
          eventType: w.eventType,
          eventId: w.eventId,
          status: w.status,
          attempts: w.attempts,
          lastError: w.lastError,
          signatureValid: w.signatureValid,
          createdAt: w.createdAt.toISOString(),
        }))}
        canRetry={can(admin.role, "webhooks.retry")}
      />

      <Panel title="Failed payments">
        {data.failed.length === 0 ? (
          <EmptyRow>No failed payments.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Order", "Amount", "Reason", "When"]}>
            {data.failed.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-caption text-ink-700">
                  {row.businessName}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums">
                  #{row.orderNumber}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums">
                  {formatMoney(row.amount, row.currency)}
                </td>
                <td className="px-5 py-3 text-micro text-[var(--color-state-late)]">
                  {row.failureReason ?? "Unknown"}
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel title="Razorpay connections">
        {data.accounts.length === 0 ? (
          <EmptyRow>No restaurants yet.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Status", "Account", "Mode", ""]}>
            {data.accounts.map((row) => (
              <tr key={row.businessId}>
                <td className="px-5 py-3 text-caption text-ink">{row.name}</td>
                <td className="px-5 py-3">
                  <Pill value={row.status ?? "disconnected"} />
                </td>
                <td className="px-5 py-3 text-micro text-ink-500">
                  {row.accountId ?? "—"}
                  {row.lastError ? (
                    <span className="block text-[var(--color-state-late)]">
                      {row.lastError}
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-micro text-ink-500">
                  {row.status === "connected" ? (row.liveMode ? "Live" : "Test") : "—"}
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
