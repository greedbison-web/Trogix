import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const IMPERSONATION_COOKIE = "trogix_admin_impersonation";
export const IMPERSONATION_MINUTES = 30;

export type ActiveImpersonation = {
  sessionId: string;
  businessId: string;
  adminEmail: string | null;
  expiresAt: Date;
};

/**
 * Reads the impersonation cookie and re-validates it against the database on
 * every request. The cookie alone grants nothing — the row must still exist,
 * be unexpired and unrevoked, which makes revocation instant.
 */
export async function getActiveImpersonation(): Promise<ActiveImpersonation | null> {
  try {
    const store = await cookies();
    const sessionId = store.get(IMPERSONATION_COOKIE)?.value;
    if (!sessionId) return null;

    const db = getDb();
    const [row] = await db
      .select({
        sessionId: schema.impersonationSessions.id,
        businessId: schema.impersonationSessions.businessId,
        adminEmail: schema.impersonationSessions.adminEmail,
        expiresAt: schema.impersonationSessions.expiresAt,
      })
      .from(schema.impersonationSessions)
      .where(
        and(
          eq(schema.impersonationSessions.id, sessionId),
          isNull(schema.impersonationSessions.revokedAt),
          gt(schema.impersonationSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}
