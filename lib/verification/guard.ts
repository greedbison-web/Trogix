import "server-only";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isPreview } from "@/lib/preview/mode";
import { isVerified } from "./service";
import { setPendingUser } from "./pending";

/**
 * Every authenticated surface passes through here.
 *
 * An unverified account is bounced to /verify rather than being allowed to
 * onboard, because approval review must never begin on unproven contact
 * details.
 */
export async function requireVerifiedUser() {
  const user = await getUser();
  if (!user) redirect("/login");

  // Preview mode has no verification records to read.
  if (isPreview()) return user;

  if (!(await isVerified(user.id))) {
    await setPendingUser(user.id);
    redirect("/verify");
  }

  return user;
}
