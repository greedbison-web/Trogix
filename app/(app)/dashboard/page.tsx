import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getOwnedBusiness } from "@/app/(onboarding)/actions";
import { BUSINESS_TYPES } from "@/lib/validation/business";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const business = await getOwnedBusiness(user.id);
  if (!business) redirect("/onboarding");

  const typeLabel =
    BUSINESS_TYPES.find((t) => t.value === business.type)?.label ?? business.type;

  return (
    <>
      <div className="flex items-center gap-4">
        {business.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logoUrl}
            alt=""
            className="h-14 w-14 rounded-xl border border-paper-edge object-cover"
          />
        ) : null}
        <div>
          <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
            {business.name}
          </h1>
          <p className="mt-2 text-caption text-ink-500">
            {typeLabel} · {business.city}, {business.state}
          </p>
        </div>
      </div>

      <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-paper-edge bg-paper-edge sm:grid-cols-3">
        <Cell label="Menu link" value={`trogix.co.in/${business.slug}`} />
        <Cell label="Currency" value={business.currency} />
        <Cell label="Timezone" value={business.timezone} />
      </dl>

      <div className="mt-6 rounded-2xl border border-paper-edge bg-paper-raised p-6">
        <p className="text-body text-ink-700">No menu yet.</p>
        <p className="mt-2 text-caption text-ink-500">
          The menu builder is the next feature.
        </p>
      </div>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-raised p-5">
      <dt className="text-micro uppercase tracking-[0.16em] text-ink-300">
        {label}
      </dt>
      <dd className="mt-2 truncate text-body text-ink">{value}</dd>
    </div>
  );
}
