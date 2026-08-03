import { Arrow, Button, Container, Eyebrow } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";
import { PhoneMenu } from "@/components/mocks/PhoneMenu";

/**
 * The first seven seconds.
 *
 * No feature list, no logo wall, no screenshot carousel. One sentence that
 * says what Trogix is for, and one object that proves it is beautiful.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[136px] sm:pt-[168px]">
      {/* A single, very soft pool of light. Not a gradient blob — a lit room. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[720px] w-[1200px] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(244,241,234,0) 70%)",
        }}
      />

      <Container className="relative">
        <div className="mx-auto max-w-[1000px] text-center">
          <Reveal>
            <Eyebrow>The restaurant operating system</Eyebrow>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mt-7 font-serif text-display">
              Everything that happens
              <br />
              after <span className="text-accent">good evening.</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mt-8 max-w-[560px] text-lede text-ink-500">
              A guest sits down and taps once. The menu, the order, the kitchen, the
              payment, the message, the receipt, the return visit — Trogix runs the
              entire evening as one system.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
              <Button href="#contact" variant="primary" size="lg">
                Request access
                <Arrow />
              </Button>
              <Button href="#journey" variant="secondary" size="lg">
                See how an evening runs
              </Button>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <p className="mt-7 text-[13px] text-ink-300">
              Built for restaurants that care how things feel.
            </p>
          </Reveal>
        </div>
      </Container>

      {/* The product, presented like an object on a table. */}
      <Container width="wide" className="relative mt-24 sm:mt-28">
        <Reveal delay={200} className="flex justify-center">
          <div className="relative flex w-full max-w-[1000px] items-end justify-center">
            {/* Left fragment: the guest's phone buzzes on the way home */}
            <FloatingCard className="absolute -left-2 bottom-24 hidden w-[248px] lg:block">
              <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-ink-500">
                WhatsApp · 19:52
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-700">
                Your table&apos;s order is with the kitchen. The octopus is about eight
                minutes away.
              </p>
            </FloatingCard>

            <PhoneMenu />

            {/* Right fragment: the same order, already on the pass */}
            <FloatingCard className="absolute -right-2 bottom-40 hidden w-[248px] lg:block">
              <div className="flex items-baseline justify-between">
                <p className="font-serif text-xl leading-none">Table 12</p>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent-deep">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  New
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-700">
                2× Burrata · 1× Agnolotti · 1× Octopus
              </p>
              <p className="mt-3 text-[11px] text-ink-300">Received 0:04 ago</p>
            </FloatingCard>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function FloatingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lift backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
