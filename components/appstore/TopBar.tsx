"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The store's navigation bar.
 *
 * At rest it is invisible and the large "Today" title carries the page. Once
 * the title scrolls under it, the bar frosts over and the title shrinks into
 * it — the same collapse iOS does.
 */
export function TopBar({ title = "Today" }: { title?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 96);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? "chrome-blur border-b border-as-separator/60" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-11 w-full max-w-[720px] items-center justify-between px-5 sm:px-6">
        <span
          className={`text-[1.0625rem] font-semibold text-as-label transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            collapsed ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
          }`}
        >
          {title}
        </span>
        <Link
          href="/login"
          aria-label="Account"
          className="grid h-[30px] w-[30px] place-items-center rounded-full bg-as-fill text-as-label-2 transition-colors hover:bg-as-fill-strong"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8" fill="currentColor" />
            <path
              d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4s6.1 1.8 7.2 5.4"
              fill="currentColor"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
