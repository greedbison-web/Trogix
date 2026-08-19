import Link from "next/link";
import { TopBar } from "@/components/appstore/TopBar";
import { TabBar } from "@/components/appstore/TabBar";
import { TodayHeader } from "@/components/appstore/TodayHeader";
import { Screenshots } from "@/components/appstore/Mocks";
import { AppIcon, Stars } from "@/components/appstore/icons";
import {
  ArtKitchen,
  ArtMenu,
  ArtMoney,
  ArtService,
  StoryCard,
  StoryFooter,
} from "@/components/appstore/StoryCard";
import {
  AppList,
  Card,
  Gutter,
  GetButtonSolid,
  InfoRow,
  SectionHeader,
  type AppEntry,
} from "@/components/appstore/ui";

/**
 * Homepage — the App Store "Today" tab, rendered for Trogix.
 *
 *   large title  →  story cards  →  module list  →  screenshots
 *   →  ratings and editors' notes  →  plans  →  information
 *
 * Every module of the product is presented the way the store presents an app:
 * squircle icon, one-line tagline, blue Get.
 */

const modules: AppEntry[] = [
  {
    icon: "menu",
    name: "Menu",
    tagline: "Your card, live in seconds — photos, sections, sold-out",
    href: "/signup",
  },
  {
    icon: "orders",
    name: "Ordering",
    tagline: "Guests order from the table. No app to install.",
    href: "/signup",
  },
  {
    icon: "kitchen",
    name: "Kitchen Display",
    tagline: "One pass, ticket ages, nothing printed twice",
    href: "/signup",
  },
  {
    icon: "payments",
    name: "Payments",
    tagline: "Razorpay to your own account. Settlement is yours.",
    href: "/signup",
    note: "Optional",
  },
  {
    icon: "analytics",
    name: "Analytics",
    tagline: "Covers, ticket size, prep time — by night",
    href: "/signup",
  },
  {
    icon: "tables",
    name: "Tables & QR",
    tagline: "Print-ready codes for every table in the room",
    href: "/signup",
  },
];

const plans = [
  ["Starter — monthly", "₹0"],
  ["Pro — monthly", "₹2,499"],
  ["Pro — yearly", "₹24,990"],
  ["Multi-outlet — monthly", "₹5,999"],
];

export default function HomePage() {
  return (
    <div data-appstore className="min-h-screen bg-as-bg font-sf">
      <TopBar />

      <main id="main" className="pb-[calc(49px+env(safe-area-inset-bottom)+2rem)] pt-11">
        <Gutter>
          <TodayHeader />

          <div className="space-y-8 pt-2">
            {/* ---- Featured ---- */}
            <StoryCard
              eyebrow="Featured · Our pick"
              title="Run the whole evening from one app"
              subtitle="Arrival, menu, ordering, kitchen, payment and the receipt — one system instead of six."
              href="/signup"
              art={<ArtService />}
              footer={
                <StoryFooter
                  icon="trogix"
                  name="Trogix"
                  line="The operating system for restaurants"
                  href="/signup"
                />
              }
            />

            {/* ---- App of the day ---- */}
            <StoryCard
              eyebrow="App of the day"
              title="A menu your guests never download"
              subtitle="Scan the code on the table and the card opens on your brand — priced, photographed, always current."
              href="/m/demo"
              art={<ArtMenu />}
              footer={
                <StoryFooter
                  icon="menu"
                  name="Trogix Menu"
                  line="Guest ordering, no install"
                  href="/m/demo"
                  cta="Open"
                />
              }
            />

            {/* ---- Module list ---- */}
            <section id="modules" className="scroll-mt-16 space-y-3">
              <SectionHeader eyebrow="What's inside" title="The Trogix suite" href="/signup" />
              <AppList apps={modules} />
            </section>

            {/* ---- Screenshots ---- */}
            <section className="space-y-3">
              <SectionHeader eyebrow="Preview" title="See it working" />
              <Screenshots />
            </section>

            {/* ---- Kitchen story ---- */}
            <section id="kitchen" className="scroll-mt-16">
              <StoryCard
                eyebrow="Behind the pass"
                title="Saturday, 8PM, and nothing is lost"
                subtitle="Tickets land in order, age in colour, and clear with one tap. The room stays quiet."
                href="/signup"
                art={<ArtKitchen />}
                footer={
                  <StoryFooter
                    icon="kitchen"
                    name="Kitchen Display"
                    line="Built for the busiest hour"
                    href="/signup"
                  />
                }
              />
            </section>

            {/* ---- Ratings + editors' notes ---- */}
            <section className="space-y-3">
              <SectionHeader eyebrow="Ratings & reviews" title="What owners say" />
              <Card className="p-4">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="text-[3rem] font-bold leading-none text-as-label">4.9</p>
                    <p className="text-as-foot text-as-label-2">out of 5</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-as-blue">
                    <Stars value={4.9} />
                    <p className="text-as-foot text-as-label-2">128 Ratings</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 border-t border-as-separator pt-4">
                  {[
                    [
                      "Six tabs became one",
                      "We ran a QR menu, a POS, a printer and a spreadsheet. Now the evening is in one place and the pass never stalls.",
                      "Anay · Bandra",
                    ],
                    [
                      "The money lands with us",
                      "Payments go to our own Razorpay account. No one holds our settlement for a week.",
                      "Meera · Indiranagar",
                    ],
                  ].map(([title, body, who]) => (
                    <figure key={title}>
                      <figcaption className="flex items-center justify-between gap-3">
                        <span className="text-as-sub font-semibold text-as-label">{title}</span>
                        <span className="shrink-0 text-as-blue">
                          <Stars value={5} />
                        </span>
                      </figcaption>
                      <blockquote className="mt-1 text-as-sub text-as-label-2">{body}</blockquote>
                      <p className="mt-1 text-as-foot text-as-label-3">{who}</p>
                    </figure>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-as-cap font-bold uppercase text-as-label-2">Editors&apos; notes</p>
                <p className="mt-1.5 text-as-body text-as-label">
                  Most restaurant software asks the room to change shape around it. Trogix does the
                  opposite: it takes the evening a restaurant already runs — the walk-in, the card,
                  the order, the pass, the bill — and gives each step one place to live.
                </p>
              </Card>
            </section>

            {/* ---- Plans, as in-app purchases ---- */}
            <section id="pricing" className="scroll-mt-16 space-y-3">
              <SectionHeader eyebrow="In-app purchases" title="Plans" />
              <Card className="px-4">
                {plans.map(([name, price]) => (
                  <InfoRow key={name} label={name} value={price} />
                ))}
              </Card>
              <p className="px-1 text-as-foot text-as-label-2">
                Starter is free for one outlet, one kitchen screen and unlimited menu items.
                Payments are settled to your own Razorpay account; Trogix never holds them.
              </p>
            </section>

            {/* ---- Information ---- */}
            <section className="space-y-3">
              <SectionHeader eyebrow="Information" title="About Trogix" />
              <Card className="px-4">
                <InfoRow label="Seller" value="Trogix" />
                <InfoRow label="Category" value="Business · Food & Drink" />
                <InfoRow label="Works on" value="Any phone browser, iPad, desktop" />
                <InfoRow label="Payments" value="Razorpay Connect" />
                <InfoRow label="Languages" value="English" />
                <InfoRow label="Support" value="trogix.co.in" href="/#search" />
                <InfoRow label="Privacy" value="Data stays in your account" />
              </Card>
            </section>

            {/* ---- Close ---- */}
            <section className="flex flex-col items-center gap-3 py-6 text-center">
              <AppIcon name="trogix" size={76} />
              <div>
                <p className="text-as-title font-bold text-as-label">Trogix</p>
                <p className="text-as-sub text-as-label-2">
                  The operating system for modern restaurants
                </p>
              </div>
              <GetButtonSolid href="/signup" label="Get" />
              <p className="text-as-foot text-as-label-2">
                Already running Trogix?{" "}
                <Link href="/login" className="text-as-blue hover:opacity-70">
                  Sign in
                </Link>
              </p>
            </section>

            <footer className="border-t border-as-separator pt-4 text-as-foot text-as-label-3">
              <p>© {new Date().getFullYear()} Trogix. Made for restaurants in India.</p>
            </footer>
          </div>
        </Gutter>
      </main>

      <TabBar />
    </div>
  );
}
