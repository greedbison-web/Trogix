"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { uniqueConstraintName } from "@/lib/db/errors";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, signInSchema } from "@/lib/validation/auth";
import { IP_LIMITS } from "@/lib/verification/config";
import { consume, clientIp, retryPhrase } from "@/lib/verification/rate-limit";
import { issueChallenge, isVerified } from "@/lib/verification/service";
import { setPendingUser, clearPendingUser } from "@/lib/verification/pending";

export type AuthState = {
  error: string | null;
  fields?: Record<string, string>;
};

const fail = (error: string, fields?: Record<string, string>): AuthState => ({
  error,
  fields,
});

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const next = String(formData.get("next") ?? "/dashboard");
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error.issues));
  }

  let userId: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      return fail(error?.message ?? "Could not sign you in.");
    }
    userId = data.user.id;
  } catch {
    return fail("Authentication is not configured yet.");
  }

  // Unverified accounts get no further than the verification screen.
  if (!(await isVerified(userId))) {
    await setPendingUser(userId);
    redirect("/verify");
  }

  await clearPendingUser();
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIp();
  const verdict = await consume(
    `signup:ip:${ip}`,
    IP_LIMITS.signup.limit,
    IP_LIMITS.signup.windowSeconds,
  );
  if (!verdict.allowed) {
    return fail(
      `Too many accounts created from this network. Try again in ${retryPhrase(
        verdict.retryAfterSeconds,
      )}.`,
    );
  }

  const parsed = signUpSchema.safeParse({
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail(
      "Please fix the highlighted fields.",
      fieldErrors(parsed.error.issues),
    );
  }

  const { ownerName, email, phone, password } = parsed.data;

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return fail("The database is not configured yet.");
  }

  // Friendly duplicate messages. The unique indexes are what actually enforce
  // this — two simultaneous signups cannot both pass the check below.
  const clashes = await db
    .select({
      email: schema.users.email,
      phone: schema.users.phone,
    })
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.phone, phone)));

  if (clashes.some((row) => row.email === email)) {
    return fail("Please fix the highlighted fields.", {
      email: "An account already uses this email.",
    });
  }
  if (clashes.some((row) => row.phone === phone)) {
    return fail("Please fix the highlighted fields.", {
      phone: "An account already uses this phone number.",
    });
  }

  let userId: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: ownerName, phone } },
    });
    if (error || !data.user) {
      return fail(error?.message ?? "Could not create your account.");
    }
    userId = data.user.id;
  } catch {
    return fail("Authentication is not configured yet.");
  }

  try {
    await db
      .insert(schema.users)
      .values({ id: userId, email, fullName: ownerName, phone })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: { email, fullName: ownerName, phone },
      });
  } catch (error) {
    const constraint = uniqueConstraintName(error);
    if (constraint === "users_phone_key") {
      return fail("Please fix the highlighted fields.", {
        phone: "An account already uses this phone number.",
      });
    }
    if (constraint === "users_email_key") {
      return fail("Please fix the highlighted fields.", {
        email: "An account already uses this email.",
      });
    }
    return fail("Could not create your account. Try again.");
  }

  // Establish the session now so verification and onboarding continue without
  // a second sign-in. Harmless if the project requires email confirmation —
  // the pending cookie still identifies the account on /verify.
  try {
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password });
  } catch {
    // The session can come later; verification does not depend on it.
  }

  await setPendingUser(userId);
  await issueChallenge({ userId, email, phone, isResend: false });

  revalidatePath("/", "layout");
  redirect("/verify");
}

export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get("next") ?? "/dashboard");
  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Already signed out or unconfigured.
  }
  await clearPendingUser();
  revalidatePath("/", "layout");
  redirect("/login");
}
