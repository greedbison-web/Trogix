import { Container, Section } from "@/components/primitives";
import { Reveal } from "@/components/Reveal";

/**
 * The pause after the hero.
 *
 * A page this quiet needs one moment where it stops selling and simply states
 * a belief. Nothing here but a sentence and the space around it.
 */
export function Manifesto() {
  return (
    <Section className="py-32 sm:py-44 lg:py-52">
      <Container width="text">
        <Reveal>
          <p className="text-center font-serif text-headline">
            Great restaurants have always run on{" "}
            <span className="text-ink-300">systems nobody can see.</span> We built the
            one for this century.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
