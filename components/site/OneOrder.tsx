"use client";

import { useEffect, useRef, useState } from "react";
import { Container, Eyebrow } from "@/components/primitives";
import { GuestMenu } from "@/components/product/GuestMenu";
import { KitchenPass } from "@/components/product/KitchenPass";
import { BillSurface } from "@/components/product/BillSurface";
import { order, passTickets, restaurant } from "@/lib/demo-restaurant";

/**
 * §2 · ONE ORDER. EVERY SURFACE. — ground: paper-sunken, height: 300vh pinned
 *
 * The page's one orchestrated moment. Left column sticky; the right-hand frame
 * is FIXED at 560×620 and never moves — only its contents cross-fade through
 * three states. The unmoving frame is the argument.
 *
 * No CTA in this section: interrupting a proof with a button breaks it.
 */

const states = [
  { key: "guest", label: "Guest", time: order.placedAt },
  { key: "kitchen", label: "Kitchen", time: order.placedAt },
  { key: "bill", label: "Bill", time: order.settledAt },
] as const;

export function OneOrder() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const scrolled = -rect.top;
      const distance = rect.height - window.innerHeight;
      if (distance <= 0) return;
      const progress = Math.min(Math.max(scrolled / distance, 0), 1);
      // Three equal thresholds across the pinned distance.
      setActive(progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="one-order" className="bg-paper-sunken">
      {/* ---------- Desktop: pinned state machine ---------- */}
      <div ref={trackRef} className="relative hidden h-[300vh] lg:block">
        <div className="sticky top-0 flex h-screen items-center">
          <Container>
            <div className="grid grid-cols-12 gap-6">
              {/* Left — cols 1–5 */}
              <div className="col-span-5 flex flex-col justify-center">
                <Eyebrow>One order</Eyebrow>
                <h2 className="mt-6 font-serif text-headline">
                  One order.
                  <br />
                  Every surface.
                </h2>
                <p className="mt-8 max-w-[460px] text-body text-ink-500">
                  A guest orders at Table {restaurant.table}. The kitchen sees it
                  instantly. The bill settles to your account.
                </p>

                {/* State rail */}
                <ol className="mt-[120px] space-y-4">
                  {states.map((state, index) => {
                    const on = index === active;
                    return (
                      <li key={state.key} className="flex items-center gap-4">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-300 ${
                            on ? "bg-accent" : "bg-ink-300"
                          }`}
                        />
                        <span
                          className={`text-micro font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                            on ? "text-ink" : "text-ink-300"
                          }`}
                        >
                          {state.label}
                        </span>
                        <span
                          className={`ml-auto text-micro tabular-nums transition-colors duration-300 ${
                            on ? "text-ink-700" : "text-ink-300"
                          }`}
                        >
                          {state.time}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Right — cols 7–12. The frame never resizes. */}
              <div className="col-span-6 col-start-7 flex justify-center">
                <div className="relative h-[620px] w-[560px]">
                  <Surface show={active === 0}>
                    <GuestMenu width={294} cart={[...order.lines]} />
                  </Surface>
                  <Surface show={active === 1}>
                    <KitchenPass
                      tickets={passTickets.slice(0, 1)}
                      className="rounded-[20px] bg-ink p-7 shadow-float"
                    />
                  </Surface>
                  <Surface show={active === 2}>
                    <BillSurface />
                  </Surface>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* ---------- Mobile: pin disabled, surfaces stack ---------- */}
      <div className="lg:hidden">
        <Container className="py-[120px]">
          <Eyebrow>One order</Eyebrow>
          <h2 className="mt-6 font-serif text-headline">
            One order.
            <br />
            Every surface.
          </h2>
          <p className="mt-8 max-w-[460px] text-body text-ink-500">
            A guest orders at Table {restaurant.table}. The kitchen sees it
            instantly. The bill settles to your account.
          </p>

          <div className="mt-16 space-y-14">
            {states.map((state, index) => (
              <div key={state.key}>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-micro font-medium uppercase tracking-[0.16em] text-ink">
                    {state.label}
                  </span>
                  <span className="ml-auto text-micro tabular-nums text-ink-500">
                    {state.time}
                  </span>
                </div>
                <div className="mt-5 flex justify-center">
                  {index === 0 ? (
                    <GuestMenu width={260} cart={[...order.lines]} />
                  ) : index === 1 ? (
                    <KitchenPass tickets={passTickets.slice(0, 1)} />
                  ) : (
                    <BillSurface />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}

/** Cross-fade only — 300ms. The frame itself must never move. */
function Surface({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={!show}
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
