"use client";

import { useEffect, useState } from "react";
import { Button, Container } from "@/components/primitives";

const links = [
  { label: "Product", href: "#surfaces" },
  { label: "The journey", href: "#journey" },
  { label: "System", href: "#system" },
];

export function Nav() {
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        lifted
          ? "border-b border-paper-edge/60 bg-paper/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <Container className="flex h-[68px] items-center justify-between">
        <a href="#" className="font-serif text-[1.4rem] leading-none tracking-[-0.02em]">
          Trogix
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.9375rem] text-ink-500 transition-colors duration-300 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Button href="#contact" variant="ghost">
              Sign in
            </Button>
          </span>
          <Button href="#contact" variant="primary">
            Request access
          </Button>
        </div>
      </Container>
    </header>
  );
}
