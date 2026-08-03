"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { resolveAccount } from "@/lib/verification/identity";
import { issueChallenge, verifyChallenge } from "@/lib/verification/service";
import { clearPendingUser } from "@/lib/verification/pending";
import { normalizePhone, PHONE_REGEX, otpSchema } from "@/lib/validation/auth";

export type VerifyState = { error: string | null; notice: string | null };

const fail = (error: string): VerifyState => ({ error, notice: null });
const done = (notice: string): VerifyState => ({ error: null, notice });

/** Sends a code to the account's email, taking the phone number if not yet set. */
export async function sendCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const account = await resolveAccount();
  if (!account) redirect("/login");

  if (account.emailVerifiedAt && account.phoneVerifiedAt) {
    redirect("/onboarding");
  }

  const submitted = String(formData.get("phone") ?? "").trim();
  const phone = submitted ? normalizePhone(submitted) : (account.phone ?? "");

  if (!PHONE_REGEX.test(phone)) {
    return fail("Enter a valid 10-digit Indian mobile number.");
  }

  // The number must still be free — an owner can correct a typo here, but not
  // onto a number another account already proved.
  try {
    const db = getDb();
    const [taken] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.phone, phone), ne(schema.users.id, account.id)))
      .limit(1);
    if (taken) return fail("An account already uses this phone number.");

    if (phone !== account.phone) {
      await db
        .update(schema.users)
        .set({ phone })
        .where(eq(schema.users.id, account.id));
    }
  } catch {
    return fail("Could not save your phone number. Try again.");
  }

  const isResend = String(formData.get("resend") ?? "") === "1";
  const result = await issueChallenge({
    userId: account.id,
    email: account.email,
    phone,
    isResend,
  });

  if (!result.ok) return fail(result.message);

  revalidatePath("/verify");
  return done(`We sent a code to ${account.email}.`);
}

export async function submitCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const account = await resolveAccount();
  if (!account) redirect("/login");

  const parsed = otpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.");
  }

  const result = await verifyChallenge(account.id, parsed.data.code);
  if (!result.ok) {
    revalidatePath("/verify");
    return fail(result.message);
  }

  await clearPendingUser();
  revalidatePath("/", "layout");
  redirect(account.hasSession ? "/onboarding" : "/login?verified=1");
}
