export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/** Full-bleed shell — the kitchen display owns the whole screen. */
export default async function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
