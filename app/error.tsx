"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-[360px] text-caption leading-relaxed text-ink-500">
        The page could not be loaded. Try again — if it keeps happening, contact
        support.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper"
      >
        Try again
      </button>
    </div>
  );
}
