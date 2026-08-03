import { getPlatformOverview } from "@/lib/queries/admin";
import { formatMoney } from "@/lib/format";
import { PageHeader, StatGrid, Panel, TableShell, Pill, EmptyRow, LinkButton } from "./ui";
import { getLiveFeed } from "@/lib/queries/admin";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  let overview = null;
  let live = null;
  try {
    [overview, live] = await Promise.all([getPlatformOverview(), getLiveFeed()]);
  } catch {
    overview = null;
  }

  if (!overview) {
    return (
      <div className="space-y-8">
        <PageHeader title="Overview" subtitle="Platform-wide health." />
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          The database is unreachable. Figures will appear once it is back.
        </p>
      </div>
    );
  }

  const stats = [
    { label: "Restaurants", value: String(overview.restaurants.total) },
    {
      label: "Active",
      value: String(overview.restaurants.active),
      hint: `${overview.restaurants.suspended} suspended`,
    },
    { label: "On trial", value: String(overview.restaurants.trial) },
    {
      label: "Revenue",
      value: formatMoney(overview.payments.revenueTotal),
      hint: `${formatMoney(overview.payments.revenueToday)} today`,
    },
    {
      label: "Orders today",
      value: String(overview.orders.today),
      hint: `${overview.orders.total} all time`,
    },
    {
      label: "Payment volume",
      value: formatMoney(overview.payments.revenueTotal),
      hint:
        overview.payments.successRate === null
          ? "No payments yet"
          : `${overview.payments.successRate}% success`,
    },
    {
      label: "New signups",
      value: String(overview.signups.today),
      hint: `${overview.signups.last30} in 30 days`,
    },
    {
      label: "Active tables",
      value: String(overview.tables.seated),
      hint: `${overview.tables.total} total`,
    },
    { label: "Online now", value: String(overview.onlineRestaurants) },
    {
      label: "Failed today",
      value: String(overview.payments.failedToday),
      alert: overview.payments.failedToday > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        subtitle="Every figure is read live from the platform database."
        action={<LinkButton href="/admin/live" variant="primary">Live monitoring</LinkButton>}
      />

      {denied ? (
        <p role="alert" className="text-caption text-[var(--color-state-late)]">
          Your role does not permit that action.
        </p>
      ) : null}

      <StatGrid stats={stats} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Latest orders"
          action={<LinkButton href="/admin/live">View all</LinkButton>}
        >
          {!live || live.orders.length === 0 ? (
            <EmptyRow>No orders yet.</EmptyRow>
          ) : (
            <TableShell head={["Order", "Restaurant", "Status", "Total"]}>
              {live.orders.slice(0, 8).map((order) => (
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
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>

        <Panel
          title="Online restaurants"
          action={<LinkButton href="/admin/restaurants">All restaurants</LinkButton>}
        >
          {!live || live.online.length === 0 ? (
            <EmptyRow>Nobody is trading right now.</EmptyRow>
          ) : (
            <TableShell head={["Restaurant", "Active orders"]}>
              {live.online.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-caption text-ink">{row.name}</td>
                  <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                    {row.activeOrders}
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
