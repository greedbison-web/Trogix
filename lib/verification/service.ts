import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { OTP, IP_LIMITS } from "./config";
import { generateCode, hashCode, codeMatches, isCodeShaped } from "./otp";
import { sendVerificationEmail } from "./email";
import { consume, clientIp, clientUserAgent, retryPhrase } from "./rate-limit";

export type VerificationResult =
  | { ok: true }
  | { ok: false; message: string };

export type ChallengeView = {
  email: string;
  phone: string;
  /** Seconds until a resend is permitted; 0 when it is permitted now. */
  cooldownSeconds: number;
  resendsLeft: number;
  attemptsLeft: number;
  blockedUntil: Date | null;
  expiresAt: Date | null;
  hasLiveCode: boolean;
};

const seconds = (from: Date, to: Date) =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 1000));

export async function isVerified(userId: string): Promise<boolean> {
  try {
    const db = getDb();
    const [row] = await db
      .select({
        emailVerifiedAt: schema.users.emailVerifiedAt,
        phoneVerifiedAt: schema.users.phoneVerifiedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return Boolean(row?.emailVerifiedAt && row?.phoneVerifiedAt);
  } catch {
    return false;
  }
}

export async function getChallenge(
  userId: string,
): Promise<ChallengeView | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.verificationChallenges)
    .where(eq(schema.verificationChallenges.userId, userId))
    .limit(1);

  if (!row) return null;

  const now = new Date();
  const cooldownEnds = row.lastSentAt
    ? new Date(row.lastSentAt.getTime() + OTP.resendCooldownSeconds * 1000)
    : now;

  return {
    email: row.email,
    phone: row.phone,
    cooldownSeconds: seconds(now, cooldownEnds),
    resendsLeft: Math.max(0, OTP.maxResends - row.resendCount),
    attemptsLeft: Math.max(0, OTP.maxAttempts - row.attempts),
    blockedUntil:
      row.blockedUntil && row.blockedUntil > now ? row.blockedUntil : null,
    expiresAt: row.expiresAt,
    hasLiveCode: Boolean(row.codeHash) && row.expiresAt > now,
  };
}

/**
 * Issues a code and emails it.
 *
 * The code is delivered before it is stored, so a Resend outage never leaves
 * an account holding a live challenge for a message nobody received — and the
 * resend counter only moves when a message actually went out.
 */
export async function issueChallenge(input: {
  userId: string;
  email: string;
  phone: string;
  isResend: boolean;
}): Promise<VerificationResult> {
  const { userId, email, phone, isResend } = input;
  const db = getDb();
  const now = new Date();

  const ip = await clientIp();
  const ipVerdict = await consume(
    `otp.request:ip:${ip}`,
    IP_LIMITS.request.limit,
    IP_LIMITS.request.windowSeconds,
  );
  if (!ipVerdict.allowed) {
    return {
      ok: false,
      message: `Too many code requests. Try again in ${retryPhrase(ipVerdict.retryAfterSeconds)}.`,
    };
  }

  const [existing] = await db
    .select()
    .from(schema.verificationChallenges)
    .where(eq(schema.verificationChallenges.userId, userId))
    .limit(1);

  if (existing?.consumedAt) {
    return { ok: false, message: "This account is already verified." };
  }

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return {
      ok: false,
      message: `Too many codes requested. Try again in ${retryPhrase(
        seconds(now, existing.blockedUntil),
      )}.`,
    };
  }

  if (existing && isResend) {
    if (existing.lastSentAt) {
      const wait = seconds(
        now,
        new Date(existing.lastSentAt.getTime() + OTP.resendCooldownSeconds * 1000),
      );
      if (wait > 0) {
        return {
          ok: false,
          message: `Wait ${retryPhrase(wait)} before requesting another code.`,
        };
      }
    }

    if (existing.resendCount >= OTP.maxResends) {
      const blockedUntil = new Date(now.getTime() + OTP.blockMinutes * 60_000);
      await db
        .update(schema.verificationChallenges)
        .set({ blockedUntil, codeHash: null })
        .where(eq(schema.verificationChallenges.userId, userId));
      return {
        ok: false,
        message: `You have reached the resend limit. Try again in ${retryPhrase(
          OTP.blockMinutes * 60,
        )}.`,
      };
    }
  }

  const code = generateCode();

  try {
    await sendVerificationEmail(email, code);
  } catch {
    return {
      ok: false,
      message: "Could not send the verification email. Please try again.",
    };
  }

  const values = {
    userId,
    email,
    phone,
    codeHash: hashCode(code, userId),
    expiresAt: new Date(now.getTime() + OTP.ttlSeconds * 1000),
    attempts: 0,
    lastSentAt: now,
    consumedAt: null,
    blockedUntil: null,
    requestIp: ip,
    userAgent: await clientUserAgent(),
  };

  if (existing) {
    await db
      .update(schema.verificationChallenges)
      .set({
        ...values,
        resendCount: isResend ? existing.resendCount + 1 : existing.resendCount,
      })
      .where(eq(schema.verificationChallenges.userId, userId));
  } else {
    await db
      .insert(schema.verificationChallenges)
      .values({ ...values, resendCount: 0 });
  }

  return { ok: true };
}

/**
 * Checks a submitted code and, on success, marks both contact details verified.
 *
 * Email ownership is proved by receiving the code. Phone ownership is proved by
 * the owner submitting that code against the number they registered — the pair
 * is confirmed together, which is why both flags are set at the same moment.
 */
export async function verifyChallenge(
  userId: string,
  submitted: string,
): Promise<VerificationResult> {
  const code = submitted.replace(/\D/g, "");
  const db = getDb();
  const now = new Date();

  const ip = await clientIp();
  const ipVerdict = await consume(
    `otp.attempt:ip:${ip}`,
    IP_LIMITS.attempt.limit,
    IP_LIMITS.attempt.windowSeconds,
  );
  if (!ipVerdict.allowed) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${retryPhrase(ipVerdict.retryAfterSeconds)}.`,
    };
  }

  const [row] = await db
    .select()
    .from(schema.verificationChallenges)
    .where(eq(schema.verificationChallenges.userId, userId))
    .limit(1);

  if (!row) {
    return { ok: false, message: "Request a verification code first." };
  }
  if (row.consumedAt) {
    return { ok: false, message: "This account is already verified." };
  }
  if (row.blockedUntil && row.blockedUntil > now) {
    return {
      ok: false,
      message: `Verification is temporarily locked. Try again in ${retryPhrase(
        seconds(now, row.blockedUntil),
      )}.`,
    };
  }
  if (!row.codeHash) {
    return { ok: false, message: "That code is no longer valid. Request a new one." };
  }
  if (row.expiresAt <= now) {
    await db
      .update(schema.verificationChallenges)
      .set({ codeHash: null })
      .where(eq(schema.verificationChallenges.userId, userId));
    return { ok: false, message: "That code has expired. Request a new one." };
  }
  if (row.attempts >= OTP.maxAttempts) {
    await db
      .update(schema.verificationChallenges)
      .set({ codeHash: null })
      .where(eq(schema.verificationChallenges.userId, userId));
    return { ok: false, message: "Too many wrong codes. Request a new one." };
  }

  // Shape is checked after the attempt bookkeeping above so a malformed
  // submission still counts against the ceiling.
  const valid = isCodeShaped(code) && codeMatches(code, userId, row.codeHash);

  if (!valid) {
    const attempts = row.attempts + 1;
    const exhausted = attempts >= OTP.maxAttempts;
    await db
      .update(schema.verificationChallenges)
      .set({ attempts, codeHash: exhausted ? null : row.codeHash })
      .where(eq(schema.verificationChallenges.userId, userId));

    return {
      ok: false,
      message: exhausted
        ? "Too many wrong codes. Request a new one."
        : `Incorrect code. ${OTP.maxAttempts - attempts} attempt${
            OTP.maxAttempts - attempts === 1 ? "" : "s"
          } left.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.verificationChallenges)
      .set({ consumedAt: now, codeHash: null, blockedUntil: null })
      .where(eq(schema.verificationChallenges.userId, userId));

    await tx
      .update(schema.users)
      .set({
        phone: row.phone,
        emailVerifiedAt: now,
        phoneVerifiedAt: now,
        verifiedIp: ip,
      })
      .where(eq(schema.users.id, userId));
  });

  return { ok: true };
}
