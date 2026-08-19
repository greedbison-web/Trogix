import type { ReactNode } from "react";

/* -------------------------------------------------------------------------
   App icons

   Every product module gets a real icon: a gradient squircle with a single
   white glyph, drawn on a 60-unit grid the way the store's icons are.
   ------------------------------------------------------------------------- */

export type IconName =
  | "trogix"
  | "menu"
  | "orders"
  | "kitchen"
  | "payments"
  | "analytics"
  | "tables";

const gradients: Record<IconName, [string, string]> = {
  trogix: ["#3ba7c4", "#1d5f8f"],
  menu: ["#ff9f43", "#f2622e"],
  orders: ["#34c759", "#0f9d58"],
  kitchen: ["#ff6b6b", "#c9184a"],
  payments: ["#5e5ce6", "#3a2fb0"],
  analytics: ["#0a84ff", "#0047ab"],
  tables: ["#ffd166", "#e08e0b"],
};

function Glyph({ name }: { name: IconName }) {
  const stroke = {
    stroke: "#fff",
    strokeWidth: 3.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  switch (name) {
    case "trogix":
      return (
        <g {...stroke} strokeWidth={3.6}>
          <path d="M18 22h24" />
          <path d="M30 22v20" />
          <path d="M22 42h16" />
        </g>
      );
    case "menu":
      return (
        <g {...stroke}>
          <path d="M20 18v10a4 4 0 0 0 8 0V18" />
          <path d="M24 28v14" />
          <path d="M40 18c-3 3-4 7-4 11s2 5 4 5v8" />
        </g>
      );
    case "orders":
      return (
        <g {...stroke}>
          <rect x="19" y="16" width="22" height="28" rx="4" />
          <path d="M25 25h10M25 32h10" />
        </g>
      );
    case "kitchen":
      return (
        <g {...stroke}>
          <path d="M17 34h26" />
          <path d="M19 34a11 11 0 0 1 22 0" />
          <path d="M22 40h16" />
        </g>
      );
    case "payments":
      return (
        <g {...stroke}>
          <rect x="16" y="20" width="28" height="20" rx="4" />
          <path d="M16 27h28" />
        </g>
      );
    case "analytics":
      return (
        <g {...stroke}>
          <path d="M19 40V30" />
          <path d="M30 40V19" />
          <path d="M41 40v-14" />
        </g>
      );
    case "tables":
      return (
        <g {...stroke}>
          <circle cx="30" cy="27" r="9" />
          <path d="M30 36v7" />
          <path d="M22 43h16" />
        </g>
      );
  }
}

export function AppIcon({
  name,
  size = 60,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const [from, to] = gradients[name];
  const id = `g-${name}`;
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      aria-hidden="true"
      className={`squircle shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill={`url(#${id})`} />
      <Glyph name={name} />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Tab bar and chrome glyphs — SF Symbols in spirit, 24-unit grid
   ------------------------------------------------------------------------- */

export type TabIcon = "today" | "apps" | "arcade" | "search" | "kitchen";

export function TabGlyph({ name, active }: { name: TabIcon; active: boolean }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-[26px] w-[26px]",
    "aria-hidden": true as const,
  };
  const s = {
    stroke: "currentColor",
    strokeWidth: active ? 2 : 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  switch (name) {
    case "today":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" {...s} />
          <path d="M7 9h10M7 13h6" {...s} />
        </svg>
      );
    case "apps":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" {...s} />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" {...s} />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" {...s} />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" {...s} />
        </svg>
      );
    case "arcade":
      return (
        <svg {...common}>
          <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" {...s} />
        </svg>
      );
    case "kitchen":
      return (
        <svg {...common}>
          <path d="M4 13h16" {...s} />
          <path d="M5.5 13a6.5 6.5 0 0 1 13 0" {...s} />
          <path d="M6.5 17h11" {...s} />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" {...s} />
          <path d="M16 16l4 4" {...s} />
        </svg>
      );
  }
}

export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 20" aria-hidden="true" className={`h-3 w-[0.45rem] ${className}`}>
      <path
        d="M2 2l8 8-8 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Stars({ value = 4.9 }: { value?: number }) {
  return (
    <span className="flex items-center gap-[1px]" aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
          <defs>
            <linearGradient id={`s-${i}`}>
              <stop offset={`${Math.max(0, Math.min(1, value - i)) * 100}%`} stopColor="currentColor" />
              <stop offset={`${Math.max(0, Math.min(1, value - i)) * 100}%`} stopColor="currentColor" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#s-${i})`}
            d="M10 1.6l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"
          />
        </svg>
      ))}
    </span>
  );
}

export function IconWrap({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center justify-center">{children}</span>;
}
