import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getBusinessForOwner } from "@/lib/queries/business";
import { getDashboardData, emptyDashboard } from "@/lib/queries/dashboard";
import { BUSINESS_TYPES } from "@/lib/validation/business";
import { formatDate } from "@/lib/format";
import {
  StatGrid,
  QuickActions,
  RecentOrders,
  MenuStatus,
  BusinessProfile,
} from "./components";

export const metadata: Metadata = { title: "Dashboard" };

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getBusinessForOwner(user.id);
  if (!record) redirect("/onboarding");

  const { business, settings } = record;
  const timezone = business.timezone;
  const currency = business.currency;

  let data = emptyDashboard;
  try {
    data = await getDashboardData(business.id, timezone);
  } catch {
    // Database unreachable — render the shell with zeroes rather than a 500.
  }

  const typeLabel =
    BUSINESS_TYPES.find((t) => t.value === business.type)?.label ?? business.type;

  const profileRows = [
    { label: "Business name", value: business.name },
    { label: "Type", value: typeLabel },
    { label: "Phone", value: `+91 ${business.phone}` },
    {
      label: "Address",
      value: `${business.addressLine}, ${business.city}, ${business.state} ${business.pincode}`,
    },
    { label: "GST", value: business.gst ?? "Not provided" },
    {
      label: "Plan",
      value: PLAN_LABELS[settings?.subscriptionPlan ?? "trial"] ?? "Trial",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl border border-paper-edge object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-paper-edge bg-paper-raised font-serif text-[1.5rem] text-ink"
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
              {business.name}
            </h1>
            <p className="mt-2 text-caption text-ink-500">
              {formatDate(new Date(), timezone)}
            </p>
          </div>
        </div>

        <QuickActions />
      </header>

      {/* Restaurant overview */}
      <StatGrid counts={data.counts} />

      {/* Recent orders + side panels */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <h2 className="text-micro font-medium uppercase tracking-[0.16em] text-ink-300">
            Recent orders
          </h2>
          <div className="mt-3">
            <RecentOrders
              orders={data.recentOrders}
              currency={currency}
              timezone={timezone}
            />
          </div>
        </section>

        <div className="space-y-6">
          <MenuStatus menu={data.menu} timezone={timezone} />
          <BusinessProfile rows={profileRows} />
        </div>
      </div>
    </div>
  );
}
