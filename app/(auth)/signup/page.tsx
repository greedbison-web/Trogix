import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Create account
      </h1>
      <p className="mt-3 text-caption text-ink-500">
        Start with your menu. Takes a few minutes.
      </p>

      <div className="mt-8">
        <AuthForm mode="signup" next="/onboarding" />
      </div>

      <p className="mt-8 text-caption text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
