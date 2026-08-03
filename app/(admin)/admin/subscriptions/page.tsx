import { getSubscriptions } from "@/lib/queries/admin";
import { requireAdmin, can } from "@/lib/admin/auth";
import { PageHeader, Panel, TableShell, Pill, EmptyRow, StatGrid } from "../ui";
import { CouponControls } from "./CouponControls";
import Link from "next/link";

export const metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const admin = await requireAdmin("restaurants.read");

  let data: Awaited<ReturnType<typeof getSubscriptions>> | null = null;
  try {
    data = await getSubscriptions();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <PageHeader title="Subscriptions" />
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          The database is unreachable.
        </p>
      </div>
    );
  }

  const byPlan = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const row of data.breakdown) {
    byPlan.set(row.plan, (byPlan.get(row.plan) ?? 0) + row.count);
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + row.count);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscriptions"
        subtitle="Plans, trials and coupons across the platform."
      />

      <StatGrid
        stats={[
          { label: "Trial", value: String(byPlan.get("trial") ?? 0) },
          { label: "Starter", value: String(byPlan.get("starter") ?? 0) },
          { label: "Growth", value: String(byPlan.get("growth") ?? 0) },
          { label: "Enterprise", value: String(byPlan.get("enterprise") ?? 0) },
          {
            label: "Suspended",
            value: String(byStatus.get("suspended") ?? 0),
            alert: (byStatus.get("suspended") ?? 0) > 0,
          },
        ]}
      />

      <Panel title="Expiring within 14 days">
        {data.expiring.length === 0 ? (
          <EmptyRow>Nothing expires in the next fortnight.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Plan", "Status", "Trial ends", "Plan ends", ""]}>
            {data.expiring.map((row) => (
              <tr key={row.businessId}>
                <td className="px-5 py-3 text-caption text-ink">{row.name}</td>
                <td className="px-5 py-3">
                  <Pill value={row.plan} />
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.status} />
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.trialEndsAt
                    ? new Date(row.trialEndsAt).toISOString().slice(0, 10)
                    : "—"}
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.planExpiresAt
                    ? new Date(row.planExpiresAt).toISOString().slice(0, 10)
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/restaurants/${row.businessId}`}
                    className="text-micro font-medium text-accent-deep hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <CouponControls
        coupons={data.coupons.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          percentOff: c.percentOffBps / 100,
          redemptions: c.redemptions,
          maxRedemptions: c.maxRedemptions,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          isActive: c.isActive,
        }))}
        canManage={can(admin.role, "coupons.manage")}
      />
    </div>
  );
}
