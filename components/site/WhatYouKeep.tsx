import { Container, Eyebrow } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * §3 · WHAT YOU KEEP — ground: paper, pad 180
 *
 * The page's breathing rest, positioned between two heavy product sections.
 * No product is shown here, deliberately.
 *
 * ZERO accent — the only section on the page with none. Rows are separated by
 * hairlines, never cards, and have no hover state: they are not interactive
 * and must not pretend to be.
 */

const guarantees = [
  {
    title: "The guest",
    body: "Names, visits and order history stay in your restaurant's account — not in a marketplace between you and the people who came to see you.",
  },
  {
    title: "The money",
    body: "Guests pay the restaurant directly. Settlement goes to your account, not into a wallet you have to claim back from.",
  },
  {
    title: "Your brand",
    body: "The guest sees your name, your typography and your menu. Trogix does not put its logo on your table.",
  },
  {
    title: "The menu",
    body: "Change a price, mark a dish sold out or add tonight's special yourself, at 4pm, without raising a support ticket.",
  },
];

export function WhatYouKeep() {
  return (
    <section id="what-you-keep" className="bg-paper py-[180px]">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
          {/* Sticky editorial — cols 1–4 */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <Eyebrow>Ownership</Eyebrow>
              <h2 className="mt-6 font-serif text-headline">What you keep.</h2>
              <p className="mt-8 max-w-[380px] text-body text-ink-500">
                Trogix sits behind your restaurant, not between you and your
                guests.
              </p>
            </Reveal>
          </div>

          {/* Rows — cols 6–12 */}
          <div className="lg:col-span-7 lg:col-start-6">
            <div className="border-t border-paper-edge">
              {guarantees.map((item, index) => (
                <Reveal
                  key={item.title}
                  delay={Math.min(index, 2) * 100}
                  className="flex items-baseline gap-6 border-b border-paper-edge py-8 sm:gap-10"
                >
                  <span className="w-[40px] shrink-0 text-micro tabular-nums text-ink-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-serif text-title">{item.title}</h3>
                    <p className="mt-3 max-w-[420px] text-body text-ink-500">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
