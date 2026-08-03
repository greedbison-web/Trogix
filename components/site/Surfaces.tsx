import { Arrow, Container, Eyebrow, Section } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";
import { PhoneMenu } from "@/components/mocks/PhoneMenu";
import { KitchenDisplay } from "@/components/mocks/KitchenDisplay";
import { Dashboard } from "@/components/mocks/Dashboard";

/**
 * Three surfaces, three audiences, one product.
 *
 * Deliberately not a feature grid. Each surface gets a full editorial spread,
 * because the argument here is craft — and craft needs to be seen at size.
 */

const surfaces = [
  {
    id: "guest",
    eyebrow: "For the guest",
    title: "A menu worth reading",
    body: "Your menu is the first thing a guest touches and the last thing most software respects. Trogix typesets it properly — real hierarchy, real photography, real prices — and lets them order the moment they decide.",
    points: ["No app, no download", "Allergens and pairings built in", "Ordering at the table"],
    visual: <PhoneMenu className="mx-auto" />,
  },
  {
    id: "kitchen",
    eyebrow: "For the kitchen",
    title: "The pass, not a printer",
    body: "Orders arrive the second they are placed, grouped by table and aged by the clock. The screen stays quiet until something needs attention, and then it is impossible to miss.",
    points: ["Instant, no walk to the terminal", "Course timing and modifiers", "Built to be read across a hot line"],
    visual: <KitchenDisplay />,
  },
  {
    id: "owner",
    eyebrow: "For the owner",
    title: "Four numbers, not forty",
    body: "Covers, spend, turn, revenue — live, on your phone, at the bar or at home. The rest of the data is there when you want it, and out of the way when you don't.",
    points: ["Live service revenue", "Guest return behaviour", "Reviews, loyalty and payouts in one place"],
    visual: <Dashboard />,
  },
];

export function Surfaces() {
  return (
    <Section id="surfaces" className="border-t border-paper-edge/70 bg-paper-sunken/40">
      <Container>
        <Reveal className="max-w-[640px]">
          <Eyebrow>The product</Eyebrow>
          <h2 className="mt-6 font-serif text-headline">
            Three surfaces.
            <br />
            One operating system.
          </h2>
        </Reveal>

        <div className="mt-24 space-y-28 sm:mt-32 sm:space-y-40">
          {surfaces.map((surface, index) => (
            <div
              key={surface.id}
              className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20"
            >
              <Reveal
                className={
                  index % 2 === 1 ? "lg:order-2 lg:pl-6" : "lg:order-1 lg:pr-6"
                }
              >
                <Eyebrow tone="accent">{surface.eyebrow}</Eyebrow>
                <h3 className="mt-5 font-serif text-title">{surface.title}</h3>
                <p className="mt-5 max-w-[460px] text-[1.0625rem] leading-relaxed text-ink-500">
                  {surface.body}
                </p>
                <ul className="mt-8 space-y-3 border-t border-paper-edge pt-6">
                  {surface.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-baseline gap-3 text-[0.9375rem] text-ink-700"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full bg-accent"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal
                delay={120}
                className={index % 2 === 1 ? "lg:order-1" : "lg:order-2"}
              >
                {surface.visual}
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal className="mt-28 flex justify-center sm:mt-36">
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 text-[0.9375rem] text-ink-700 transition-colors duration-300 hover:text-ink"
          >
            See the whole system in a live walkthrough
            <Arrow />
          </a>
        </Reveal>
      </Container>
    </Section>
  );
}
