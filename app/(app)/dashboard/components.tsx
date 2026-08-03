import Link from "next/link";
import { formatMoney, formatRelativeDay } from "@/lib/format";
import type { DashboardData } from "@/lib/queries/dashboard";

/* ---------------------------------------------------------------- Overview */

export function StatGrid({
  counts,
}: {
  counts: DashboardData["counts"];
}) {
  const stats = [
    { label: "Categories", value: counts.categories },
    { label: "Menu items", value: counts.menuItems },
    { label: "Tables", value: counts.tables },
    { label: "Orders today", value: counts.todaysOrders },
    {
      label: "Pending",
      value: counts.pendingOrders,
      highlight: counts.pendingOrders > 0,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-paper-edge bg-paper-edge sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-paper-raised p-5">
          <dt className="text-micro uppercase tracking-[0.16em] text-ink-300">
            {stat.label}
          </dt>
          <dd
            className={`mt-2 font-serif text-[2rem] leading-none tabular-nums ${
              stat.highlight ? "text-accent-deep" : "text-ink"
            }`}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------- Quick actions */

const ACTIONS = [
  { label: "Add category", href: "/dashboard/menu/categories/new" },
  { label: "Add menu item", href: "/dashboard/menu/items/new" },
  { label: "Generate QR", href: "/dashboard/tables" },
  { label: "View orders", href: "/dashboard/orders" },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action, index) => (
        <Link
          key={action.href}
          href={action.href}
          className={`inline-flex h-11 items-center rounded-full px-5 text-caption font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
            index === 0
              ? "bg-ink text-paper hover:bg-ink-700"
              : "border border-paper-edge bg-paper-raised text-ink hover:border-ink-300"
          }`}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- Recent orders */

const STATUS_TONE: Record<string, string> = {
  placed: "bg-accent-soft text-accent-deep",
  accepted: "bg-accent-soft text-accent-deep",
  preparing: "bg-accent-soft text-accent-deep",
  ready: "bg-accent-soft text-accent-deep",
  served: "bg-paper-sunken text-ink-700",
  completed: "bg-paper-sunken text-ink-500",
  cancelled: "bg-paper-sunken text-ink-300",
  draft: "bg-paper-sunken text-ink-300",
};

export function RecentOrders({
  orders,
  currency,
  timezone,
}: {
  orders: DashboardData["recentOrders"];
  currency: string;
  timezone: string;
}) {
  if (orders.length === 0) return <NoOrdersYet />;

  return (
    <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper-raised">
      <ul className="divide-y divide-paper-edge">
        {orders.map((order) => {
          const when = order.placedAt ?? order.createdAt;
          return (
            <li
              key={order.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-body text-ink">
                  <span className="tabular-nums">#{order.orderNumber}</span>
                  {order.tableLabel ? (
                    <span className="text-ink-500"> · Table {order.tableLabel}</span>
                  ) : (
                    <span className="text-ink-500">
                      {" "}
                      · {order.type === "takeaway" ? "Takeaway" : "Delivery"}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-micro text-ink-500">
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
                  {formatRelativeDay(new Date(when), timezone)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                    STATUS_TONE[order.status] ?? "bg-paper-sunken text-ink-500"
                  }`}
                >
                  {order.status}
                </span>
                <span className="text-body tabular-nums text-ink">
                  {formatMoney(order.total, currency)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NoOrdersYet() {
  return (
    <div className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-paper-edge bg-paper"
      >
        <span className="h-2 w-2 rounded-full bg-ink-300" />
      </div>
      <p className="mt-6 font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
        No orders yet
      </p>
      <p className="mx-auto mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
        Once a guest scans a table QR and places an order, it appears here the
        moment it reaches the kitchen.
      </p>
      <Link
        href="/dashboard/tables"
        className="mt-7 inline-flex h-11 items-center rounded-full bg-ink px-5 text-caption font-medium text-paper transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
      >
        Set up your first table
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------ Menu status */

export function MenuStatus({
  menu,
  timezone,
}: {
  menu: DashboardData["menu"];
  timezone: string;
}) {
  const rows = [
    { label: "Published", value: String(menu.published) },
    { label: "Draft", value: String(menu.draft) },
    {
      label: "Last updated",
      value: menu.lastUpdated
        ? formatRelativeDay(new Date(menu.lastUpdated), timezone)
        : "Never",
    },
  ];

  return (
    <Panel title="Menu status">
      <dl className="divide-y divide-paper-edge">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between py-3">
            <dt className="text-caption text-ink-500">{row.label}</dt>
            <dd className="text-caption tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* -------------------------------------------------------- Business profile */

export function BusinessProfile({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <Panel title="Business profile">
      <dl className="divide-y divide-paper-edge">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-6 py-3"
          >
            <dt className="shrink-0 text-caption text-ink-500">{row.label}</dt>
            <dd className="min-w-0 truncate text-right text-caption text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-paper-edge bg-paper-raised p-5">
      <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
