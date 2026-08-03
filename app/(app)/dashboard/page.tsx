import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <>
      <h1 className="font-serif text-[2.25rem] leading-none tracking-[-0.02em]">
        Dashboard
      </h1>
      <p className="mt-3 text-caption text-ink-500">
        Signed in as {user?.email}.
      </p>

      <div className="mt-10 rounded-2xl border border-paper-edge bg-paper-raised p-6">
        <p className="text-body text-ink-700">
          Your restaurant is not set up yet.
        </p>
        <p className="mt-2 text-caption text-ink-500">
          Business onboarding is the next feature.
        </p>
      </div>
    </>
  );
}
