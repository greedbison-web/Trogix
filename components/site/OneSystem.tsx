import { Container, Eyebrow, Section } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * The modules — presented as a contents page, not a pricing matrix.
 *
 * The point of this section is not "look how much we do". It is "all of this
 * is one thing", which is why it is set as a typographic index with hairlines
 * rather than as a grid of cards.
 */

const modules = [
  { name: "Ordering", body: "Table-side ordering from any phone, without an app." },
  { name: "Menu", body: "Live menus, specials and sold-out states in one place." },
  { name: "Kitchen Display", body: "Tickets on the pass the second they are placed." },
  { name: "Payments", body: "Split, tip and settle at the table. Paid directly." },
  { name: "Messaging", body: "WhatsApp updates and receipts in the restaurant's voice." },
  { name: "Analytics", body: "Covers, spend and turn — live, and worth acting on." },
  { name: "Reviews", body: "The ask lands after a good night, not a random Tuesday." },
  { name: "Loyalty", body: "Recognise a returning guest before they reach the host." },
];

export function OneSystem() {
  return (
    <Section id="system" className="border-t border-paper-edge/70">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-24">
          <Reveal className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>The system</Eyebrow>
            <h2 className="mt-6 font-serif text-headline">
              Not nine tools.
              <br />
              One product.
            </h2>
            <p className="mt-7 max-w-[360px] text-lede text-ink-500">
              Every module shares one design language, one data model and one bill.
              Nothing to integrate, nothing to reconcile, nothing that stops working
              when a subscription lapses somewhere else.
            </p>
          </Reveal>

          <div className="border-t border-paper-edge">
            {modules.map((module, index) => (
              <Reveal
                key={module.name}
                delay={(index % 3) * 70}
                className="group flex items-baseline gap-6 border-b border-paper-edge py-6 sm:gap-10 sm:py-7"
              >
                <span className="w-6 shrink-0 text-[0.8125rem] tabular-nums text-ink-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3 className="font-serif text-[1.5rem] leading-tight tracking-[-0.02em] sm:text-[1.75rem]">
                    {module.name}
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                    {module.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
