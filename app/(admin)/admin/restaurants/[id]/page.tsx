import { notFound } from "next/navigation";
import Link from "next/link";
import { getRestaurantDetail } from "@/lib/queries/admin";
import { requireAdmin, can } from "@/lib/admin/auth";
import { formatMoney, formatDate, formatTime, formatRelativeDay } from "@/lib/format";
import { PageHeader, Panel, TableShell, Pill, EmptyRow, StatGrid } from "../../ui";
import { RestaurantControls } from "./RestaurantControls";

export const metadata = { title: "Restaurant" };

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin("restaurants.read");
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getRestaurantDetail>> = null;
  try {
    detail = await getRestaurantDetail(id);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  const { business, settings, account, stats, recentOrders, activity, staff, owner } =
    detail;
  const tz = business.timezone;

  return (
    <div className="space-y-8">
      <PageHeader
        title={business.name}
        subtitle={`${business.addressLine}, ${business.city}, ${business.state} ${business.pincode}`}
        action={
          <a
            href={`/m/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-full border border-paper-edge bg-paper-raised px-4 text-micro font-medium text-ink-700 hover:border-ink-300"
          >
            Open guest menu
          </a>
        }
      />

      <StatGrid
        stats={[
          { label: "Status", value: settings?.businessStatus ?? "onboarding" },
          { label: "Plan", value: settings?.subscriptionPlan ?? "trial" },
          { label: "Orders", value: String(stats.orders) },
          { label: "Revenue", value: formatMoney(Number(stats.revenue), business.currency) },
          { label: "Menu items", value: String(stats.menuItems) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Panel title="Recent orders">
            {recentOrders.length === 0 ? (
              <EmptyRow>No orders yet.</EmptyRow>
            ) : (
              <TableShell head={["Order", "Status", "When", "Total"]}>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-3 text-caption tabular-nums">
                      #{order.orderNumber}
                    </td>
                    <td className="px-5 py-3">
                      <Pill value={order.status} />
                    </td>
                    <td className="px-5 py-3 text-micro text-ink-500">
                      {formatRelativeDay(
                        new Date(order.placedAt ?? order.createdAt),
                        tz,
                      )}
                    </td>
                    <td className="px-5 py-3 text-caption tabular-nums">
                      {formatMoney(order.total, business.currency)}
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>

          <Panel title="Admin activity">
            {activity.length === 0 ? (
              <EmptyRow>No admin actions recorded for this restaurant.</EmptyRow>
            ) : (
              <TableShell head={["Action", "Admin", "When"]}>
                {activity.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 text-caption text-ink">{row.action}</td>
                    <td className="px-5 py-3 text-micro text-ink-500">
                      {row.adminEmail ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-micro text-ink-500">
                      {formatRelativeDay(new Date(row.createdAt), tz)}
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>

          <Panel title="Team">
            {staff.length === 0 ? (
              <EmptyRow>No staff recorded.</EmptyRow>
            ) : (
              <TableShell head={["Name", "Email", "Role", "Status"]}>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-3 text-caption text-ink">{member.name}</td>
                    <td className="px-5 py-3 text-micro text-ink-500">
                      {member.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-micro capitalize text-ink-700">
                      {member.role}
                    </td>
                    <td className="px-5 py-3">
                      <Pill value={member.status} />
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Controls">
            <div className="p-5">
              <RestaurantControls
                businessId={business.id}
                businessName={business.name}
                status={settings?.businessStatus ?? "onboarding"}
                plan={settings?.subscriptionPlan ?? "trial"}
                role={admin.role}
                canSuspend={can(admin.role, "restaurants.suspend")}
                canDelete={can(admin.role, "restaurants.delete")}
                canManagePlan={can(admin.role, "subscriptions.manage")}
                canImpersonate={can(admin.role, "impersonate")}
              />
            </div>
          </Panel>

          <Panel title="Account verification">
            <dl className="divide-y divide-paper-edge px-5">
              <Row
                label="Email verified"
                value={owner?.emailVerifiedAt ? "Yes" : "No"}
              />
              <Row
                label="Phone verified"
                value={owner?.phoneVerifiedAt ? "Yes" : "No"}
              />
              <Row label="Email" value={owner?.email ?? "—"} />
              <Row
                label="Phone"
                value={owner?.phone ? `+91 ${owner.phone}` : "—"}
              />
              <Row
                label="Verified at"
                value={
                  owner?.emailVerifiedAt
                    ? `${formatDate(new Date(owner.emailVerifiedAt), tz)}, ${formatTime(
                        new Date(owner.emailVerifiedAt),
                        tz,
                      )}`
                    : "Not verified"
                }
              />
              <Row label="Verification IP" value={owner?.verifiedIp ?? "—"} />
              <Row
                label="Registered"
                value={
                  owner?.registeredAt
                    ? formatDate(new Date(owner.registeredAt), tz)
                    : "—"
                }
              />
            </dl>
          </Panel>

          <Panel title="Approval review">
            <dl className="divide-y divide-paper-edge px-5">
              <Row
                label="Submitted"
                value={
                  settings?.submittedForReviewAt
                    ? formatRelativeDay(new Date(settings.submittedForReviewAt), tz)
                    : "—"
                }
              />
              <Row
                label="Reviewed"
                value={
                  settings?.reviewedAt
                    ? formatRelativeDay(new Date(settings.reviewedAt), tz)
                    : "Pending"
                }
              />
              <Row label="Reviewer" value={settings?.reviewedByEmail ?? "—"} />
              <Row label="Note" value={settings?.reviewNote ?? "—"} />
            </dl>
          </Panel>

          <Panel title="Profile">
            <dl className="divide-y divide-paper-edge px-5">
              <Row label="Owner" value={business.ownerName} />
              <Row label="Phone" value={`+91 ${business.phone}`} />
              <Row label="Type" value={business.type.replace("_", " ")} />
              <Row label="GST" value={business.gst ?? "Not provided"} />
              <Row label="Menu link" value={`/${business.slug}`} />
              <Row label="Currency" value={business.currency} />
              <Row label="Timezone" value={business.timezone} />
              <Row
                label="Joined"
                value={formatRelativeDay(new Date(business.createdAt), tz)}
              />
            </dl>
          </Panel>

          <Panel title="Payments">
            <dl className="divide-y divide-paper-edge px-5">
              <Row label="Gateway" value={account?.status ?? "disconnected"} />
              <Row label="Account" value={account?.accountId ?? "—"} />
              <Row label="Mode" value={account?.liveMode ? "Live" : "Test"} />
              <Row
                label="Connected"
                value={
                  account?.connectedAt
                    ? formatRelativeDay(new Date(account.connectedAt), tz)
                    : "Never"
                }
              />
              {account?.lastError ? (
                <Row label="Last error" value={account.lastError} />
              ) : null}
            </dl>
          </Panel>

          <Panel title="Subscription">
            <dl className="divide-y divide-paper-edge px-5">
              <Row label="Plan" value={settings?.subscriptionPlan ?? "trial"} />
              <Row label="Status" value={settings?.businessStatus ?? "onboarding"} />
              <Row
                label="Trial ends"
                value={
                  settings?.trialEndsAt
                    ? formatRelativeDay(new Date(settings.trialEndsAt), tz)
                    : "—"
                }
              />
              <Row
                label="Plan expires"
                value={
                  settings?.planExpiresAt
                    ? formatRelativeDay(new Date(settings.planExpiresAt), tz)
                    : "—"
                }
              />
            </dl>
          </Panel>

          <Link
            href="/admin/restaurants"
            className="inline-block text-micro text-ink-500 hover:text-ink"
          >
            ← All restaurants
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-micro text-ink-500">{label}</dt>
      <dd className="min-w-0 truncate text-right text-caption capitalize text-ink">
        {value}
      </dd>
    </div>
  );
}
