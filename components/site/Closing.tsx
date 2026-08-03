import { Arrow, Button, Container, Eyebrow } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * The only inverted section on the page.
 *
 * Ink arrives once, at the end, so the invitation carries weight the rest of
 * the page deliberately gave away.
 */
export function Closing() {
  return (
    <section id="contact" className="grain relative overflow-hidden bg-ink py-36 sm:py-48">
      <span aria-hidden="true" className="grain-overlay" />

      <Container width="text" className="relative text-center">
        <Reveal>
          <Eyebrow tone="paper">Now taking partners</Eyebrow>
        </Reveal>

        <Reveal delay={100}>
          <h2 className="mt-8 font-serif text-headline text-paper">
            Run tonight&apos;s service
            <br />
            on something better.
          </h2>
        </Reveal>

        <Reveal delay={200}>
          <p className="mx-auto mt-7 max-w-[480px] text-lede text-paper/60">
            We onboard a small number of restaurants at a time, and we set the first
            menu up with you. Tell us about your room.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
            <Button href="mailto:hello@trogix.com" variant="inverted" size="lg">
              Request access
              <Arrow />
            </Button>
            <Button
              href="mailto:hello@trogix.com"
              size="lg"
              className="border border-white/20 text-paper hover:bg-white/10"
            >
              Talk to us
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
