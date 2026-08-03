import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Page not found
      </h1>
      <p className="mt-3 max-w-[340px] text-caption leading-relaxed text-ink-500">
        The link may be out of date, or the restaurant may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-6 text-caption font-medium text-paper"
      >
        Back to Trogix
      </Link>
    </div>
  );
}
