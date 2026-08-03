import { Arrow, Button, Container } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * §6 · FINAL CTA — ground: paper, pad 240/200
 *
 * Headline is 64, deliberately NOT 96: the page opened loud and closes at
 * conversational volume. Returning to paper after §4's ink means the last
 * impression is calm.
 *
 * Bookends the Hero with the same primary action.
 */
export function FinalCta() {
  return (
    <section id="contact" className="bg-paper pb-[200px] pt-[240px]">
      <Container>
        <div className="mx-auto max-w-[620px] text-center">
          <Reveal>
            <h2 className="font-serif text-headline">Start with your menu.</h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="mx-auto mt-7 max-w-[480px] text-lede text-ink-500">
              We set up your first menu with you, and onboard a few restaurants
              at a time.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
              <Button href="#demo" variant="primary" size="lg">
                See Trogix in Action
                <Arrow />
              </Button>
              <Button href="mailto:hello@trogix.co.in" variant="secondary" size="lg">
                Talk to us
              </Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
