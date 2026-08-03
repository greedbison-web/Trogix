import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getPendingUser } from "./pending";

export type PendingAccount = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  /** True when a session exists, false when only the signed cookie identifies them. */
  hasSession: boolean;
};

/**
 * Resolves who the verification screen is for.
 *
 * A session is preferred. When a project requires email confirmation the
 * session may not exist yet, so the signed pending cookie names the account
 * instead — it authorises nothing beyond proving a code for that one account.
 */
export async function resolveAccount(): Promise<PendingAccount | null> {
  const user = await getUser();
  const userId = user?.id ?? (await getPendingUser());
  if (!userId) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        phone: schema.users.phone,
        emailVerifiedAt: schema.users.emailVerifiedAt,
        phoneVerifiedAt: schema.users.phoneVerifiedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!row) return null;
    return { ...row, hasSession: Boolean(user) };
  } catch {
    return null;
  }
}
