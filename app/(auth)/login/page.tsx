import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Sign in
      </h1>
      <p className="mt-3 text-caption text-ink-500">
        Manage your menu, orders and service.
      </p>

      {error ? (
        <p role="alert" className="mt-5 text-caption text-[var(--color-state-late)]">
          Could not sign you in. Please try again.
        </p>
      ) : null}

      <div className="mt-8">
        <AuthForm mode="signin" next={next ?? "/dashboard"} />
      </div>

      <p className="mt-8 text-caption text-ink-500">
        New to Trogix?{" "}
        <Link href="/signup" className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
