import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16">
      <Link
        href="/"
        className="font-serif text-[1.6rem] leading-none tracking-[-0.02em]"
      >
        Trogix
      </Link>
      <div className="mt-10 w-full max-w-[400px]">{children}</div>
    </div>
  );
}
