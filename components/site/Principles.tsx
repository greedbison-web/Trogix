import { Container, Eyebrow, Section } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * Three product commitments, set as display figures.
 *
 * Deliberately specifications rather than traction numbers — what the product
 * promises, not claims about customers we would have to invent.
 */

const principles = [
  {
    figure: "One tap",
    label: "to the menu",
    body: "NFC or QR, straight into a live menu. No app store, no sign-up, no password a guest will never use again.",
  },
  {
    figure: "Zero",
    label: "walks to the terminal",
    body: "The order reaches the pass at the moment it is placed, so the floor stays with the guests instead of the till.",
  },
  {
    figure: "Direct",
    label: "to your account",
    body: "Guests pay the restaurant, not a marketplace sitting between you and the people who came to see you.",
  },
];

export function Principles() {
  return (
    <Section className="border-t border-paper-edge/70 bg-paper-sunken/40">
      <Container>
        <Reveal>
          <Eyebrow>What we hold to</Eyebrow>
        </Reveal>

        <div className="mt-16 grid gap-14 sm:mt-20 md:grid-cols-3 md:gap-10">
          {principles.map((principle, index) => (
            <Reveal key={principle.figure} delay={index * 100}>
              <p className="font-serif text-[clamp(2.5rem,4.5vw,3.75rem)] leading-none tracking-[-0.03em]">
                {principle.figure}
              </p>
              <p className="mt-3 text-[0.9375rem] text-accent-deep">{principle.label}</p>
              <p className="mt-6 max-w-[340px] border-t border-paper-edge pt-6 text-[0.9375rem] leading-relaxed text-ink-500">
                {principle.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
