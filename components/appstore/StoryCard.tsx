import type { ReactNode } from "react";
import Link from "next/link";
import { AppIcon, type IconName } from "./icons";
import { GetButtonSolid } from "./ui";

/* -------------------------------------------------------------------------
   Story cards — the Today tab's whole personality.

   One large rounded rectangle, artwork bleeding to its edges, an eyebrow in
   caps, a heavy headline, and (on app cards) a white footer bar carrying the
   icon and the Get button.
   ------------------------------------------------------------------------- */

export function StoryCard({
  eyebrow,
  title,
  subtitle,
  href,
  art,
  tone = "dark",
  footer,
  className = "",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  href: string;
  art: ReactNode;
  /** Text colour over the artwork. */
  tone?: "dark" | "light";
  footer?: ReactNode;
  className?: string;
}) {
  const text = tone === "dark" ? "text-white" : "text-black";
  const muted = tone === "dark" ? "text-white/70" : "text-black/60";

  return (
    <article
      className={`group relative overflow-hidden rounded-[var(--radius-as-card)] bg-as-card as-card-shadow press hover:[transform:scale(0.985)] ${className}`}
    >
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/12]">
          <div className="absolute inset-0">{art}</div>
          <div className="relative flex h-full flex-col justify-between p-5">
            <div>
              <p className={`text-as-cap font-bold uppercase ${muted}`}>{eyebrow}</p>
              <h3 className={`mt-1 max-w-[16ch] text-as-story font-bold ${text}`}>{title}</h3>
            </div>
            {subtitle ? (
              <p className={`max-w-[34ch] text-as-sub font-medium ${muted}`}>{subtitle}</p>
            ) : null}
          </div>
        </div>
      </Link>
      {footer}
    </article>
  );
}

/** The white bar under an app story card: icon, name, one line, Get. */
export function StoryFooter({
  icon,
  name,
  line,
  href,
  cta = "Get",
}: {
  icon: IconName;
  name: string;
  line: string;
  href: string;
  cta?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-as-separator/60 bg-as-card px-4 py-3">
      <AppIcon name={icon} size={52} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-as-body font-medium text-as-label">{name}</p>
        <p className="truncate text-as-sub text-as-label-2">{line}</p>
      </div>
      <GetButtonSolid href={href} label={cta} />
    </div>
  );
}

/* -------------------------------------------------------------------------
   Artwork — drawn, never stock. Each one is a scene from the product.
   ------------------------------------------------------------------------- */

export function ArtService() {
  return (
    <div className="h-full w-full bg-[linear-gradient(160deg,#12263a_0%,#1d5f8f_55%,#3ba7c4_100%)]">
      <svg viewBox="0 0 400 300" className="h-full w-full opacity-90" aria-hidden="true">
        <g stroke="#ffffff" strokeOpacity="0.22" fill="none" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx="330" cy="250" r={30 + i * 34} />
          ))}
        </g>
        <g opacity="0.95">
          <rect x="36" y="150" width="120" height="128" rx="14" fill="#ffffff" fillOpacity="0.14" />
          <rect x="52" y="170" width="88" height="8" rx="4" fill="#ffffff" fillOpacity="0.55" />
          <rect x="52" y="188" width="60" height="8" rx="4" fill="#ffffff" fillOpacity="0.35" />
          <rect x="52" y="212" width="88" height="8" rx="4" fill="#ffffff" fillOpacity="0.35" />
          <rect x="52" y="230" width="44" height="8" rx="4" fill="#ffffff" fillOpacity="0.25" />
        </g>
      </svg>
    </div>
  );
}

export function ArtKitchen() {
  return (
    <div className="h-full w-full bg-[linear-gradient(155deg,#2b0b12_0%,#c9184a_60%,#ff6b6b_100%)]">
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${40 + i * 118} ${86 + i * 14})`}>
            <rect width="98" height="150" rx="12" fill="#ffffff" fillOpacity={0.16 + i * 0.06} />
            <rect x="14" y="18" width="52" height="7" rx="3.5" fill="#fff" fillOpacity="0.7" />
            <rect x="14" y="40" width="70" height="6" rx="3" fill="#fff" fillOpacity="0.4" />
            <rect x="14" y="56" width="58" height="6" rx="3" fill="#fff" fillOpacity="0.4" />
            <rect x="14" y="72" width="64" height="6" rx="3" fill="#fff" fillOpacity="0.4" />
            <rect x="14" y="112" width="70" height="22" rx="11" fill="#fff" fillOpacity="0.28" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ArtMoney() {
  return (
    <div className="h-full w-full bg-[linear-gradient(150deg,#0b1a3a_0%,#3a2fb0_55%,#5e5ce6_100%)]">
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect
              key={i}
              x={40 + i * 46}
              y={250 - (24 + i * 26)}
              width="28"
              height={24 + i * 26}
              rx="8"
              fill="#ffffff"
              fillOpacity={0.2 + i * 0.08}
            />
          ))}
        </g>
        <path
          d="M40 214 L86 196 L132 178 L178 150 L224 128 L270 96 L316 62"
          stroke="#ffffff"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
      </svg>
    </div>
  );
}

export function ArtMenu() {
  return (
    <div className="h-full w-full bg-[linear-gradient(155deg,#40160a_0%,#f2622e_58%,#ff9f43_100%)]">
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        <circle cx="300" cy="120" r="86" fill="#fff" fillOpacity="0.12" />
        <circle cx="300" cy="120" r="56" fill="#fff" fillOpacity="0.16" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(40 ${70 + i * 52})`}>
            <rect width="44" height="40" rx="10" fill="#fff" fillOpacity="0.24" />
            <rect x="58" y="6" width="120" height="8" rx="4" fill="#fff" fillOpacity="0.6" />
            <rect x="58" y="24" width="76" height="7" rx="3.5" fill="#fff" fillOpacity="0.35" />
          </g>
        ))}
      </svg>
    </div>
  );
}
