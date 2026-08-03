import { Arrow, Button, Container } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";
import { GuestMenu } from "@/components/product/GuestMenu";
import { order } from "@/lib/demo-restaurant";

/**
 * §1 · HERO — ground: paper, height: 100vh (min 780)
 *
 * Centered symmetrical column. Type block occupies the upper 45%; the device
 * enters at 58% and is cropped by the fold, just below the third dish, so the
 * order bar is the reward for the first scroll. That crop is why there is no
 * scroll indicator.
 *
 * Nothing sits beside the device. No cards, no callouts, no annotations.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[780px] flex-col overflow-hidden h-screen">
      {/* Single soft pool of light. Stands in for PHOTO SLOT A until real
          photography exists — a dining room at extreme blur, low opacity. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[720px] w-[1200px] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(244,241,234,0) 70%)",
        }}
      />

      <Container className="relative pt-[150px]">
        <div className="text-center">
          <Reveal>
            {/*
              Display 96. The spec calls for one line, but this headline is
              ~1690px at 96 against an 1180 content width — so the break is
              authored here rather than left to the browser, exactly as the
              spec's own mobile rule does. Flagged for review.
            */}
            <h1 className="font-serif text-display text-balance">
              <span className="text-accent">One system</span> runs
              <br />
              your entire restaurant.
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mx-auto mt-[42px] max-w-[620px] text-lede text-ink-500">
              Menu, ordering, kitchen, payments and guest messaging — in one
              place, on your brand.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-[52px] flex flex-wrap items-center justify-center gap-3">
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

      {/* Product enters at 58% and is cropped by the fold. */}
      <Container className="relative mt-[70px] flex flex-1 justify-center overflow-hidden">
        <Reveal delay={340}>
          {/* selection={false}: §1's single accent is spent on the headline. */}
          <GuestMenu
            width={360}
            cart={[...order.lines]}
            selection={false}
            className="max-w-full"
          />
        </Reveal>
      </Container>
    </section>
  );
}
