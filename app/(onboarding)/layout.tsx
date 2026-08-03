export const dynamic = "force-dynamic";

import Link from "next/link";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[560px]">
        <Link
          href="/"
          className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]"
        >
          Trogix
        </Link>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
