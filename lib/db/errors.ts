/**
 * Postgres error inspection.
 *
 * Drizzle wraps driver errors: the outer `message` is the SQL it tried to run,
 * and the driver's own error — the one carrying the SQLSTATE code and the
 * constraint name — hangs off `cause`. Matching on the outer message therefore
 * never sees "duplicate key", which is why this walks the chain instead.
 */

/** SQLSTATE 23505 — unique_violation. */
const UNIQUE_VIOLATION = "23505";

type PgLike = { code?: unknown; constraint_name?: unknown; cause?: unknown };

function chain(error: unknown): PgLike[] {
  const seen: PgLike[] = [];
  let current: unknown = error;
  // Bounded so a cyclic cause cannot spin forever.
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth++) {
    seen.push(current as PgLike);
    current = (current as PgLike).cause;
  }
  return seen;
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  return chain(error).some(
    (link) =>
      link.code === UNIQUE_VIOLATION &&
      (constraint === undefined || link.constraint_name === constraint),
  );
}

/** Name of the violated unique constraint, when the driver reported one. */
export function uniqueConstraintName(error: unknown): string | null {
  for (const link of chain(error)) {
    if (link.code === UNIQUE_VIOLATION && typeof link.constraint_name === "string") {
      return link.constraint_name;
    }
  }
  return null;
}
