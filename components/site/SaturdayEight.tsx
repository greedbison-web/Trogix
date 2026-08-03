import { Container, Eyebrow } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";
import { KitchenPass } from "@/components/product/KitchenPass";

/**
 * §4 · BUILT FOR SATURDAY, 8PM. — ground: ink, pad 200/220
 *
 * The single inverted section on the page. The inversion is earned by subject
 * matter — night service, the pass, the hardest hour — not applied for variety.
 * The page returns to paper afterwards so it closes calm rather than loud.
 *
 * No buttons: this section removes objections, it does not sell.
 */

/**
 * ⚠️ COPY REQUIRING SIGN-OFF
 *
 * The design review specified three commitments, one of which — "Works
 * offline" — was marked [TO CONFIRM] and must not ship unverified. It is NOT
 * used here. In its place is a claim that is true by construction of the
 * system (orders are delivered to the pass on placement, which is what §2 and
 * §5 both demonstrate).
 *
 * Replace `straight-to-the-pass` with the real offline guarantee once the
 * behaviour is confirmed. Do not add uptime or latency figures without data.
 */
const commitments = [
  {
    id: "straight-to-the-pass",
    title: "Straight to the pass",
    body: "The order reaches the kitchen the moment the guest places it. No handwriting, no walk to the terminal, no round that quietly goes missing.",
  },
  {
    id: "reads-across-a-hot-line",
    title: "Reads across a hot line",
    body: "Ticket type is sized to be read at arm's length, in steam, under service lights, by someone holding a pan.",
  },
  {
    id: "we-set-you-up",
    title: "We set you up personally",
    body: "We onboard a few restaurants at a time and build your first menu with you. You are not left with a login and a help centre.",
  },
];

export function SaturdayEight() {
  return (
    <section
      id="saturday"
      className="grain relative overflow-hidden bg-ink pb-[220px] pt-[200px]"
    >
      {/* PHOTO SLOT B — a real kitchen pass at service, heavily darkened, ~8%
          opacity behind the display. Deferred until real photography exists;
          the grain overlay carries the surface in the meantime. */}
      <span aria-hidden="true" className="grain-overlay" />

      <Container className="relative">
        <div className="mx-auto max-w-[620px] text-center">
          <Reveal>
            <Eyebrow tone="paper">The hardest hour</Eyebrow>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-8 font-serif text-headline text-paper">
              Built for Saturday, 8PM.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-7 max-w-[520px] text-lede text-paper/60">
              The hour when the room is full, the pass is loud, and nothing is
              allowed to fail.
            </p>
          </Reveal>
        </div>
      </Container>

      {/* Full-bleed product — the only surface on the page presented as
          architecture rather than as an object. */}
      <Container className="relative mt-[100px]">
        <Reveal>
          {/* Wide content scrolls inside its own container; the body never does. */}
          <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
            <div className="min-w-[720px] sm:min-w-0">
              <KitchenPass bare />
            </div>
          </div>
        </Reveal>
      </Container>

      <Container className="relative mt-[120px]">
        <div className="grid gap-12 md:grid-cols-3 md:gap-6">
          {commitments.map((commitment, index) => (
            <Reveal key={commitment.id} delay={Math.min(index, 2) * 100}>
              <h3 className="font-serif text-title text-paper">
                {commitment.title}
              </h3>
              <p className="mt-4 max-w-[320px] text-body text-paper/60">
                {commitment.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
