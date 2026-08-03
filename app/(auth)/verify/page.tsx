export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveAccount } from "@/lib/verification/identity";
import { getChallenge } from "@/lib/verification/service";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = { title: "Verify account" };

export default async function VerifyPage() {
  const account = await resolveAccount();
  if (!account) redirect("/login");

  if (account.emailVerifiedAt && account.phoneVerifiedAt) {
    redirect(account.hasSession ? "/onboarding" : "/login?verified=1");
  }

  let challenge: Awaited<ReturnType<typeof getChallenge>> = null;
  try {
    challenge = await getChallenge(account.id);
  } catch {
    challenge = null;
  }

  const blockedMinutes = challenge?.blockedUntil
    ? Math.max(
        1,
        Math.ceil((challenge.blockedUntil.getTime() - Date.now()) / 60_000),
      )
    : 0;

  return (
    <>
      <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Verify your account
      </h1>
      <p className="mt-3 text-caption leading-relaxed text-ink-500">
        We send a 6-digit code to your email. Entering it confirms both the
        email and the phone number on this account.
      </p>

      <div className="mt-8">
        <VerifyForm
          email={account.email}
          phone={challenge?.phone ?? account.phone ?? ""}
          hasLiveCode={Boolean(challenge?.hasLiveCode)}
          cooldownSeconds={challenge?.cooldownSeconds ?? 0}
          resendsLeft={challenge?.resendsLeft ?? 5}
          attemptsLeft={challenge?.attemptsLeft ?? 5}
          blockedMinutes={blockedMinutes}
        />
      </div>

      <p className="mt-8 text-caption text-ink-500">
        Wrong account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in as someone else
        </Link>
      </p>
    </>
  );
}
