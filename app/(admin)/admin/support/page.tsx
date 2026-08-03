import Link from "next/link";
import {
  listRestaurants,
  getAuditLogs,
  getImpersonationSessions,
} from "@/lib/queries/admin";
import { requireAdmin, can } from "@/lib/admin/auth";
import { PageHeader, Panel, TableShell, Pill, EmptyRow } from "../ui";

export const metadata = { title: "Support" };
export const dynamic = "force-dynamic";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin("restaurants.read");
  const { q } = await searchParams;

  let restaurants: Awaited<ReturnType<typeof listRestaurants>> = [];
  let logs: Awaited<ReturnType<typeof getAuditLogs>> = [];
  let sessions: Awaited<ReturnType<typeof getImpersonationSessions>> = [];
  try {
    [restaurants, logs, sessions] = await Promise.all([
      listRestaurants({ query: q, limit: 20 }),
      getAuditLogs(40),
      getImpersonationSessions(15),
    ]);
  } catch {
    restaurants = [];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customer support"
        subtitle="Find a restaurant, inspect its history, and open a time-boxed session when you need to see what they see."
      />

      <form className="flex flex-wrap gap-3" action="/admin/support">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search restaurants"
          aria-label="Search restaurants"
          className="h-11 min-w-[260px] flex-1 rounded-full border border-paper-edge bg-paper-raised px-4 text-caption outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper"
        >
          Search
        </button>
      </form>

      <Panel title="Restaurants">
        {restaurants.length === 0 ? (
          <EmptyRow>No restaurants match.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Status", "Payments", "Orders", ""]}>
            {restaurants.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3">
                  <p className="text-caption text-ink">{row.name}</p>
                  <p className="mt-0.5 text-micro text-ink-500">
                    {row.ownerName} · +91 {row.phone}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.status ?? "onboarding"} />
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.paymentStatus ?? "disconnected"} />
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                  {row.orderCount}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/restaurants/${row.id}`}
                    className="text-micro font-medium text-accent-deep hover:underline"
                  >
                    {can(admin.role, "impersonate") ? "Open / log in as" : "Open"}
                  </Link>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel title="Recent impersonation sessions">
        {sessions.length === 0 ? (
          <EmptyRow>No sessions have been opened.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Admin", "Reason", "Expires", "State"]}>
            {sessions.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-caption text-ink">{row.businessName}</td>
                <td className="px-5 py-3 text-micro text-ink-500">
                  {row.adminEmail ?? "—"}
                </td>
                <td className="px-5 py-3 text-micro text-ink-700">{row.reason}</td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.expiresAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-3">
                  <Pill
                    value={
                      row.revokedAt
                        ? "revoked"
                        : row.expiresAt < new Date()
                          ? "expired"
                          : "active"
                    }
                  />
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel title="Recent platform activity">
        {logs.length === 0 ? (
          <EmptyRow>No admin actions recorded.</EmptyRow>
        ) : (
          <TableShell head={["Action", "Admin", "Target", "When"]}>
            {logs.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-caption text-ink">{row.action}</td>
                <td className="px-5 py-3 text-micro text-ink-500">
                  {row.adminEmail ?? "—"}
                </td>
                <td className="px-5 py-3 text-micro text-ink-700">
                  {row.businessName ?? row.targetType ?? "—"}
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
