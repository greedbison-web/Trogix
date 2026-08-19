import type { ReactNode } from "react";
import Link from "next/link";
import { AppIcon, Chevron, type IconName } from "./icons";

/* -------------------------------------------------------------------------
   The store's building blocks
   ------------------------------------------------------------------------- */

/** Page gutter. The store keeps 20pt on phones, and centres a column on desktop. */
export function Gutter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[720px] px-5 sm:px-6 ${className}`}>{children}</div>
  );
}

/** The blue capsule. Uppercase, tight, and always the same width class. */
export function GetButton({
  href,
  label = "Get",
  sub,
  className = "",
}: {
  href: string;
  label?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <span className={`flex flex-col items-center gap-1 ${className}`}>
      <Link
        href={href}
        className="inline-flex h-8 min-w-[74px] items-center justify-center rounded-full bg-as-fill px-5 text-[0.9375rem] font-bold uppercase tracking-[0.02em] text-as-blue transition-colors duration-200 hover:bg-as-fill-strong active:bg-as-fill-strong"
      >
        {label}
      </Link>
      {sub ? (
        <span className="text-[0.5625rem] uppercase tracking-[0.03em] text-as-label-2">{sub}</span>
      ) : null}
    </span>
  );
}

/** The solid blue capsule used on story cards over artwork. */
export function GetButtonSolid({
  href,
  label = "Get",
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-8 min-w-[74px] items-center justify-center rounded-full bg-as-blue px-5 text-[0.9375rem] font-bold uppercase tracking-[0.02em] text-white transition-colors duration-200 hover:bg-as-blue-press ${className}`}
    >
      {label}
    </Link>
  );
}

/** A section header: title on the left, "See All" on the right. */
export function SectionHeader({
  title,
  eyebrow,
  href,
  action = "See All",
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-t border-as-separator pt-4">
      <div>
        {eyebrow ? (
          <p className="text-as-cap font-semibold uppercase text-as-label-2">{eyebrow}</p>
        ) : null}
        <h2 className="text-as-title font-bold text-as-label">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="shrink-0 pb-0.5 text-as-body text-as-blue transition-opacity hover:opacity-70"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   App rows — the list that sits under every store shelf
   ------------------------------------------------------------------------- */

export type AppEntry = {
  icon: IconName;
  name: string;
  tagline: string;
  href: string;
  cta?: string;
  note?: string;
};

export function AppRow({ app, divider = true }: { app: AppEntry; divider?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link href={app.href} className="shrink-0">
        <AppIcon name={app.icon} size={60} />
      </Link>
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 py-1.5 ${
          divider ? "border-b border-as-separator" : ""
        }`}
      >
        <Link href={app.href} className="min-w-0 flex-1">
          <p className="truncate text-as-body font-medium text-as-label">{app.name}</p>
          <p className="truncate text-as-sub text-as-label-2">{app.tagline}</p>
        </Link>
        <GetButton href={app.href} label={app.cta ?? "Get"} sub={app.note} />
      </div>
    </div>
  );
}

export function AppList({ apps }: { apps: AppEntry[] }) {
  return (
    <div>
      {apps.map((app, i) => (
        <AppRow key={app.name} app={app} divider={i < apps.length - 1} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Cards
   ------------------------------------------------------------------------- */

/** A plain grouped card — white on light, elevated grey on dark. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-as-card)] border border-as-separator/40 bg-as-card as-card-shadow ${className}`}
    >
      {children}
    </div>
  );
}

/** The grouped list used for Information / What's New. */
export function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: ReactNode;
  href?: string;
}) {
  const body = (
    <div className="flex items-center justify-between gap-6 py-3">
      <span className="shrink-0 text-as-body text-as-label-2">{label}</span>
      <span className="flex min-w-0 items-center gap-1 text-right text-as-body text-as-label">
        <span className="truncate">{value}</span>
        {href ? <Chevron className="shrink-0 text-as-label-3" /> : null}
      </span>
    </div>
  );
  return (
    <div className="border-b border-as-separator last:border-0">
      {href ? (
        <Link href={href} className="block transition-opacity hover:opacity-70">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
