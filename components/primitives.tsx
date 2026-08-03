import type { ComponentPropsWithoutRef, ReactNode } from "react";

/* -------------------------------------------------------------------------
   Layout
   ------------------------------------------------------------------------- */

export function Container({
  children,
  className = "",
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "text";
}) {
  const widths = {
    default: "max-w-[1180px]",
    wide: "max-w-[1440px]",
    text: "max-w-[760px]",
  };
  return (
    <div className={`mx-auto w-full px-6 sm:px-8 lg:px-12 ${widths[width]} ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-28 sm:py-36 lg:py-48 ${className}`}>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------
   Typography
   ------------------------------------------------------------------------- */

export function Eyebrow({
  children,
  className = "",
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "accent" | "paper";
}) {
  const tones = {
    muted: "text-ink-500",
    accent: "text-accent-deep",
    paper: "text-paper/50",
  };
  return (
    <p
      className={`text-eyebrow font-medium uppercase tracking-[0.16em] ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

/** A hairline rule — the editorial device that separates thoughts. */
export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-paper-edge ${className}`} />;
}

/* -------------------------------------------------------------------------
   Buttons — weight, radius and press behaviour borrowed from iOS
   ------------------------------------------------------------------------- */

type ButtonProps = ComponentPropsWithoutRef<"a"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "inverted";
  size?: "md" | "lg";
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full font-medium " +
    "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
    "active:scale-[0.97] select-none whitespace-nowrap";

  const sizes = {
    md: "h-11 px-5 text-[0.9375rem]",
    lg: "h-[3.25rem] px-7 text-base",
  };

  const variants = {
    primary:
      "bg-ink text-paper shadow-[0_1px_2px_rgba(17,17,17,0.2)] hover:bg-ink-700 hover:shadow-lift",
    secondary:
      "bg-paper-raised text-ink border border-paper-edge hover:border-ink-300 hover:shadow-paper",
    ghost: "text-ink-700 hover:text-ink hover:bg-paper-sunken",
    inverted:
      "bg-paper text-ink hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:shadow-float",
  };

  return (
    <a className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </a>
  );
}

/** The arrow that leans forward on hover. Used sparingly. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`h-[0.875em] w-[0.875em] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 ${className}`}
    >
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Surfaces
   ------------------------------------------------------------------------- */

/** A premium printed-paper panel. Warm, matte, softly lit from above. */
export function Paper({
  children,
  className = "",
  elevation = "lift",
}: {
  children: ReactNode;
  className?: string;
  elevation?: "flat" | "paper" | "lift" | "float";
}) {
  const elevations = {
    flat: "",
    paper: "shadow-paper",
    lift: "shadow-lift",
    float: "shadow-float",
  };
  return (
    <div
      className={`rounded-[20px] border border-paper-edge/70 bg-paper-raised ${elevations[elevation]} ${className}`}
    >
      {children}
    </div>
  );
}
