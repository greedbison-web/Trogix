"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/primitives";

const links = [
  { label: "Product", href: "#one-order" },
  { label: "Demo", href: "#demo" },
  { label: "System", href: "#what-you-keep" },
];

/** Sections rendered on an ink ground — the nav inverts while over them. */
const INK_SECTIONS = ["saturday"];

export function Nav() {
  const [lifted, setLifted] = useState(false);
  const [onInk, setOnInk] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setLifted(window.scrollY > 24);

      // Invert while the nav band overlaps an ink section.
      const band = 68;
      setOnInk(
        INK_SECTIONS.some((id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top <= band && rect.bottom >= 0;
        }),
      );
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ground = onInk
    ? "border-white/10 bg-ink/70 backdrop-blur-xl"
    : lifted
      ? "border-paper-edge/60 bg-paper/70 backdrop-blur-xl"
      : "border-transparent";

  const wordmark = onInk ? "text-paper" : "text-ink";
  const link = onInk
    ? "text-paper/60 hover:text-paper"
    : "text-ink-500 hover:text-ink";
  const ghost = onInk
    ? "text-paper/70 hover:bg-white/10 hover:text-paper"
    : "text-ink-700 hover:bg-paper-sunken hover:text-ink";
  const primary = onInk
    ? "bg-paper text-ink hover:bg-white"
    : "bg-ink text-paper hover:bg-ink-700";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${ground}`}
    >
      <Container className="flex h-[68px] items-center justify-between">
        <a
          href="#"
          className={`font-serif text-[1.4rem] leading-none tracking-[-0.02em] transition-colors duration-500 ${wordmark}`}
        >
          Trogix
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-caption transition-colors duration-300 ${link}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <a
              href="mailto:hello@trogix.co.in"
              className={`inline-flex h-11 items-center rounded-full px-5 text-caption font-medium transition-colors duration-300 ${ghost}`}
            >
              Sign in
            </a>
          </span>
          <a
            href="#demo"
            className={`inline-flex h-11 items-center rounded-full px-5 text-caption font-medium shadow-[0_1px_2px_rgba(17,17,17,0.2)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${primary}`}
          >
            See the demo
          </a>
        </div>
      </Container>
    </header>
  );
}
