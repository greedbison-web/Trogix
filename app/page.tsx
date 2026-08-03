import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Manifesto } from "@/components/site/Manifesto";
import { Journey } from "@/components/site/Journey";
import { Surfaces } from "@/components/site/Surfaces";
import { Principles } from "@/components/site/Principles";
import { OneSystem } from "@/components/site/OneSystem";
import { Closing } from "@/components/site/Closing";
import { Footer } from "@/components/site/Footer";

/**
 * Homepage architecture
 * ---------------------
 * The order is an argument, not a layout:
 *
 *   Hero        desire, before explanation
 *   Manifesto   a pause, and a belief
 *   Journey     what Trogix actually is — one evening, end to end
 *   Surfaces    proof of craft, at size
 *   Principles  what we commit to
 *   System      all of it is one product
 *   Closing     the invitation, in ink
 */
export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Manifesto />
        <Journey />
        <Surfaces />
        <Principles />
        <OneSystem />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
