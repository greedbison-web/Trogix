import { Container, Eyebrow, Section } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * One evening, told as a sequence.
 *
 * This is the section that explains the whole company. Everything else on the
 * page is evidence for it, so it gets time on the clock and room to breathe.
 */

const moments = [
  {
    time: "19:38",
    title: "The guest arrives",
    body: "A tap on the NFC disc, or a glance at the QR. No app, no download, no account. The menu opens in under a second.",
  },
  {
    time: "19:41",
    title: "The menu earns the order",
    body: "Photography, allergens, pairings and the day's specials — typeset properly, priced clearly, and never out of date.",
  },
  {
    time: "19:46",
    title: "The order is placed",
    body: "The guest orders from the table when they are ready, not when someone is free. Modifiers, courses and notes travel with it.",
  },
  {
    time: "19:46",
    title: "The kitchen already knows",
    body: "The ticket lands on the pass the same second it is placed. No handwriting, no walk to the terminal, no lost round.",
  },
  {
    time: "19:52",
    title: "The guest is kept informed",
    body: "A WhatsApp update when the order is fired, when a course is delayed, when the table is ready. Sent by the restaurant, in its own voice.",
  },
  {
    time: "21:14",
    title: "Payment, at the table",
    body: "The bill is split, tipped and settled from the phone. The money goes directly to the restaurant. Nobody waits for the card machine.",
  },
  {
    time: "21:15",
    title: "The receipt is digital",
    body: "Itemised, archived, and quietly the beginning of a relationship rather than the end of a transaction.",
  },
  {
    time: "Thursday",
    title: "The guest comes back",
    body: "Trogix knows what they ordered, what they avoided and when they last visited — so the invitation to return is worth reading.",
  },
];

export function Journey() {
  return (
    <Section id="journey" className="border-t border-paper-edge/70">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-24">
          {/* Sticky thesis */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <Eyebrow>One evening</Eyebrow>
              <h2 className="mt-6 font-serif text-headline">
                Eight moments.
                <br />
                One system.
              </h2>
              <p className="mt-7 max-w-[380px] text-lede text-ink-500">
                Most restaurants run these on six different tools that don&apos;t speak
                to each other. Trogix runs them as a single continuous evening.
              </p>
            </Reveal>
          </div>

          {/* The sequence */}
          <ol className="relative">
            {/* The thread that runs through the night */}
            <span
              aria-hidden="true"
              className="absolute left-[5px] top-2 bottom-2 w-px bg-paper-edge"
            />

            {moments.map((moment, index) => (
              <Reveal
                as="li"
                key={moment.title}
                delay={(index % 3) * 80}
                className="relative block pb-12 pl-10 last:pb-0 sm:pl-14"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 border-paper bg-accent"
                />
                <p className="text-eyebrow font-medium uppercase tracking-[0.16em] tabular-nums text-ink-300">
                  {moment.time}
                </p>
                <h3 className="mt-3 font-serif text-title">{moment.title}</h3>
                <p className="mt-3 max-w-[520px] text-[1.0625rem] leading-relaxed text-ink-500">
                  {moment.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
