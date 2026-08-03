import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { OneOrder } from "@/components/site/OneOrder";
import { WhatYouKeep } from "@/components/site/WhatYouKeep";
import { SaturdayEight } from "@/components/site/SaturdayEight";
import { InteractiveDemo } from "@/components/site/InteractiveDemo";
import { FinalCta } from "@/components/site/FinalCta";
import { Footer } from "@/components/site/Footer";

/**
 * Homepage — built to the approved design review, section order fixed.
 *
 *   1  Hero              paper
 *   2  One Order         paper-sunken   ← 300vh pinned set piece
 *   3  What You Keep     paper          ← zero accent, no product
 *   4  Saturday 8PM      INK            ← the single inversion
 *   5  Interactive Demo  paper-sunken   ← real product, user-triggered only
 *   6  Final CTA         paper          ← closes calm, not loud
 */
export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <OneOrder />
        <WhatYouKeep />
        <SaturdayEight />
        <InteractiveDemo />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
