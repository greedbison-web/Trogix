"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Container, Eyebrow } from "@/components/primitives";
import { GuestMenu, type CartLine } from "@/components/product/GuestMenu";
import { dishById, restaurant, withCurrency, type Dish } from "@/lib/demo-restaurant";

/**
 * §5 · INTERACTIVE DEMO — ground: paper-sunken, pad 180
 *
 * The real shipping UI, fully interactive. No simulation, no video, no fake
 * state. All motion here is user-triggered — the only such section on the
 * page. The demo never demos itself.
 *
 * No primary button: the demo IS the primary action. A filled button beside a
 * live product would admit the product isn't compelling enough.
 */

type Placed = { lines: CartLine[]; at: string };

export function InteractiveDemo() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [travelling, setTravelling] = useState(false);
  const [hint, setHint] = useState(false);
  const touched = useRef(false);

  // Idle affordance: after 8s untouched, one dish lifts 2px and settles. Once.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!touched.current) setHint(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, []);

  const addDish = (dish: Dish) => {
    touched.current = true;
    setHint(false);
    setPlaced(null);
    setCart((current) => {
      const existing = current.find((line) => line.id === dish.id);
      return existing
        ? current.map((line) =>
            line.id === dish.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current, { id: dish.id, quantity: 1 }];
    });
  };

  const placeOrder = () => {
    if (cart.length === 0 || travelling) return;
    touched.current = true;
    setTravelling(true);
    // Dot traverse 600ms, then the ticket lands on the pass.
    window.setTimeout(() => {
      setPlaced({
        lines: cart,
        // The demo restaurant is in Mumbai — the pass clock must read in its
        // own timezone, not the viewer's.
        at: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
      });
      setTravelling(false);
    }, 600);
  };

  const reset = () => {
    setCart([]);
    setPlaced(null);
  };

  return (
    <section id="demo" className="bg-paper-sunken py-[180px]">
      <Container>
        <div className="mx-auto max-w-[620px] text-center">
          <Eyebrow>See it working</Eyebrow>
          <h2 className="mt-6 font-serif text-headline">
            Order from Table {restaurant.table} right now.
          </h2>
          <p className="mx-auto mt-7 max-w-[520px] text-lede text-ink-500">
            This is the real product. Add a dish and watch it reach the kitchen.
          </p>
        </div>

        {/* Both panels sit on one shared surface — they are one object. */}
        <div className="mt-[120px] flex flex-col items-center gap-10 lg:flex-row lg:justify-center lg:gap-0">
          <div className={hint ? "animate-none -translate-y-[2px] transition-transform duration-700" : ""}>
            <GuestMenu
              width={320}
              cart={cart}
              onAdd={addDish}
              onPlace={placeOrder}
              placed={Boolean(placed)}
            />
          </div>

          {/* Connector — accent dot travels left→right on place. */}
          <div className="relative hidden h-px w-[120px] bg-paper-edge lg:block">
            <span
              className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                travelling ? "left-[112px] opacity-100" : "left-0 opacity-0"
              }`}
            />
          </div>
          <div className="relative h-[60px] w-px bg-paper-edge lg:hidden">
            <span
              className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                travelling ? "top-[52px] opacity-100" : "top-0 opacity-0"
              }`}
            />
          </div>

          {/* The pass — live. */}
          <div className="w-full max-w-[480px] rounded-[20px] bg-ink p-6 shadow-float">
            <div className="flex items-baseline justify-between">
              <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-paper/40">
                Pass · {restaurant.service}
              </p>
              <p className="text-micro tabular-nums text-paper/40">
                {placed ? placed.at : "—"}
              </p>
            </div>

            <div className="mt-6 min-h-[220px]">
              {placed ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-opacity duration-[400ms]">
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-2xl leading-none text-paper">
                      T{restaurant.table}
                    </p>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="text-[11px] font-medium text-accent">New</span>
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
                    {placed.lines.map((line) => (
                      <li key={line.id} className="text-[12px] leading-snug text-paper/75">
                        {line.quantity}× {dishName(line.id)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[11px] tabular-nums text-paper/35">
                    Received just now
                  </p>
                </div>
              ) : (
                <p className="pt-16 text-center text-caption text-paper/30">
                  {cart.length === 0
                    ? "Add a dish to begin."
                    : `${withCurrency(cartTotal(cart))} ready — place the order.`}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-[100px] flex justify-center">
          {placed ? (
            <button
              type="button"
              onClick={reset}
              className="group inline-flex items-center gap-2 text-caption text-ink-700 transition-colors duration-300 hover:text-ink"
            >
              Run it again
              <Arrow />
            </button>
          ) : (
            <a
              href="mailto:hello@trogix.co.in"
              className="group inline-flex items-center gap-2 text-caption text-ink-700 transition-colors duration-300 hover:text-ink"
            >
              Open the full demo
              <Arrow />
            </a>
          )}
        </div>
      </Container>
    </section>
  );
}

function dishName(id: string) {
  return dishById[id]?.name ?? id;
}

function cartTotal(cart: CartLine[]) {
  return cart.reduce(
    (sum, line) => sum + (dishById[line.id]?.price ?? 0) * line.quantity,
    0,
  );
}
