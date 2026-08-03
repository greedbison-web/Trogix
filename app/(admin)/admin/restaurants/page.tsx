import Link from "next/link";
import { listRestaurants, type RestaurantFilter } from "@/lib/queries/admin";
import { formatMoney } from "@/lib/format";
import { PageHeader, Panel, TableShell, Pill, EmptyRow } from "../ui";

export const metadata = { title: "Restaurants" };

const FILTERS: { value: RestaurantFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending review" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "onboarding", label: "Onboarding" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const filter = (FILTERS.find((f) => f.value === params.filter)?.value ??
    "all") as RestaurantFilter;

  let rows: Awaited<ReturnType<typeof listRestaurants>> = [];
  try {
    rows = await listRestaurants({ query, filter });
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Restaurants"
        subtitle="Search, filter and manage every business on the platform."
      />

      <form className="flex flex-wrap gap-3" action="/admin/restaurants">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name, link, city, phone or owner"
          aria-label="Search restaurants"
          className="h-11 min-w-[260px] flex-1 rounded-full border border-paper-edge bg-paper-raised px-4 text-caption outline-none focus:border-accent"
        />
        <input type="hidden" name="filter" value={filter} />
        <button
          type="submit"
          className="h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper"
        >
          Search
        </button>
      </form>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={`/admin/restaurants?filter=${option.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            aria-current={filter === option.value ? "page" : undefined}
            className={`h-8 rounded-full px-3.5 text-micro font-medium leading-8 transition-colors ${
              filter === option.value
                ? "bg-ink text-paper"
                : "border border-paper-edge bg-paper-raised text-ink-500 hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <Panel title={`${rows.length} restaurant${rows.length === 1 ? "" : "s"}`}>
        {rows.length === 0 ? (
          <EmptyRow>No restaurants match.</EmptyRow>
        ) : (
          <TableShell
            head={["Restaurant", "Status", "Plan", "Payments", "Orders", "Revenue", ""]}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-paper-sunken/40">
                <td className="px-5 py-3">
                  <p className="text-caption text-ink">{row.name}</p>
                  <p className="mt-0.5 text-micro text-ink-500">
                    /{row.slug} · {row.city}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.status ?? "onboarding"} />
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.plan ?? "trial"} />
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.paymentStatus ?? "disconnected"} />
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                  {row.orderCount}
                </td>
                <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                  {formatMoney(Number(row.revenue), row.currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/restaurants/${row.id}`}
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
