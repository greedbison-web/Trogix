/**
 * Preview mode.
 *
 * Set TROGIX_PREVIEW=1 in .env.local and every owner-side screen opens with no
 * account, no database and no Supabase project: the guards return a stand-in
 * user and each query returns the demo restaurant in lib/preview/data.ts.
 *
 * It is deliberately hard to switch on by accident:
 *   - the variable is unset everywhere except a developer's own machine, and
 *   - it is ignored outright on a Vercel production deployment.
 *
 * Nothing in preview mode writes: the server actions still run against the
 * real database, so buttons that save will fail unless one is configured.
 */
export function isPreview(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.TROGIX_PREVIEW === "1";
}

/** The same check for the browser, where only NEXT_PUBLIC_ vars exist. */
export function isPreviewClient(): boolean {
  return process.env.NEXT_PUBLIC_TROGIX_PREVIEW === "1";
}
