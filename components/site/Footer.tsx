import { Container } from "@/components/primitives";

const groups = [
  {
    title: "Product",
    links: [
      { label: "Ordering", href: "#surfaces" },
      { label: "Kitchen Display", href: "#surfaces" },
      { label: "Payments", href: "#system" },
      { label: "Analytics", href: "#system" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "The journey", href: "#journey" },
      { label: "The system", href: "#system" },
      { label: "Contact", href: "mailto:hello@trogix.com" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-paper-edge/70 bg-paper py-16 sm:py-20">
      <Container>
        <div className="grid gap-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-20">
          <div>
            <p className="font-serif text-[1.75rem] leading-none tracking-[-0.02em]">
              Trogix
            </p>
            <p className="mt-4 max-w-[300px] text-[0.9375rem] leading-relaxed text-ink-500">
              The operating system for modern restaurants.
            </p>
          </div>

          <div className="flex gap-16 sm:gap-20">
            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="text-eyebrow font-medium uppercase tracking-[0.16em] text-ink-300">
                  {group.title}
                </p>
                <ul className="mt-5 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[0.9375rem] text-ink-500 transition-colors duration-300 hover:text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-paper-edge pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink-300">
            © {new Date().getFullYear()} Trogix. All rights reserved.
          </p>
          <p className="text-[13px] text-ink-300">Made for hospitality.</p>
        </div>
      </Container>
    </footer>
  );
}
