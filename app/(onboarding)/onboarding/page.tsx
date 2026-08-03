import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getOwnedBusiness } from "../actions";
import { OnboardingForm } from "../OnboardingForm";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");

  const existing = await getOwnedBusiness(user.id);
  if (existing) redirect("/dashboard");

  const defaultOwnerName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";

  return <OnboardingForm defaultOwnerName={defaultOwnerName} />;
}
