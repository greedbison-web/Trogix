"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabGlyph, type TabIcon } from "./icons";

type Tab = { icon: TabIcon; label: string; href: string };

const marketingTabs: Tab[] = [
  { icon: "today", label: "Today", href: "/" },
  { icon: "apps", label: "Modules", href: "/#modules" },
  { icon: "kitchen", label: "Kitchen", href: "/#kitchen" },
  { icon: "arcade", label: "Pricing", href: "/#pricing" },
  { icon: "search", label: "Search", href: "/#search" },
];

/** In preview mode the tabs open the product itself, not the pitch. */
const previewTabs: Tab[] = [
  { icon: "today", label: "Today", href: "/" },
  { icon: "apps", label: "Dashboard", href: "/dashboard" },
  { icon: "kitchen", label: "Kitchen", href: "/kitchen" },
  { icon: "arcade", label: "Menu", href: "/dashboard/menu" },
  { icon: "search", label: "Orders", href: "/dashboard/orders" },
];

/**
 * The five-tab bar, frosted and pinned to the bottom edge — the single most
 * recognisable piece of the store. It stays on desktop too; the store's iPad
 * layout keeps it as well.
 */
export function TabBar({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  const tabs = preview ? previewTabs : marketingTabs;

  return (
    <nav
      aria-label="Sections"
      className="chrome-blur fixed inset-x-0 bottom-0 z-50 border-t border-as-separator/70 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-[720px] items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : false;
          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[49px] flex-col items-center justify-center gap-[2px] transition-colors duration-200 ${
                  active ? "text-as-blue" : "text-as-label-2 hover:text-as-label"
                }`}
              >
                <TabGlyph name={tab.icon} active={active} />
                <span className="text-[0.625rem] font-medium leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
