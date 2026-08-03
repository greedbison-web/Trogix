import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/queries/business";
import { getOperatingHours, getStaff } from "@/lib/queries/settings";
import { getPaymentAccount } from "@/lib/queries/payment-account";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const record = await getActiveBusiness(user.id);
  if (!record) redirect("/onboarding");

  const { business, settings } = record;

  const [hours, staff, account] = await Promise.all([
    getOperatingHours(business.id),
    getStaff(business.id),
    getPaymentAccount(business.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
          Settings
        </h1>
        <p className="mt-2 text-caption text-ink-500">
          Everything about how {business.name} runs.
        </p>
      </header>

      <SettingsClient
        business={{
          name: business.name,
          ownerName: business.ownerName,
          phone: business.phone,
          addressLine: business.addressLine,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          logoUrl: settings?.logoUrl ?? business.logoUrl,
          currency: business.currency,
        }}
        settings={{
          primaryColor: settings?.primaryColor ?? "#111111",
          secondaryColor: settings?.secondaryColor ?? "#449EB9",
          receiptFooter: settings?.receiptFooter ?? null,
          gstNumber: settings?.gstNumber ?? business.gst,
          serviceCharge: settings?.serviceCharge ?? 0,
          taxEnabled: settings?.taxEnabled ?? true,
          contactEmail: settings?.contactEmail ?? null,
          website: settings?.website ?? null,
        }}
        hours={hours}
        staff={staff}
        paymentStatus={account?.status ?? "disconnected"}
      />
    </div>
  );
}
