# Trogix

The operating system for modern restaurants.

Trogix is not a QR-menu tool. It is one system that runs the whole evening —
arrival, menu, ordering, kitchen, payment, messaging, receipt, and the return
visit — so a restaurant does not have to stitch six products together.

This repository currently contains the **marketing website**. The other modules
(dashboard, ordering, kitchen display, payments, messaging, analytics, reviews,
loyalty) will be added alongside it and are expected to inherit the design
system defined here.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- Deployed on Vercel

PostgreSQL + Drizzle ORM arrive with the first product module; the marketing
site is fully static and needs no database.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

## Design system

Everything visual is derived from tokens in `app/globals.css` under `@theme`.
Nothing should hardcode a hex value — add a token instead, so every future
module stays in the same language.

| Token | Value | Role |
| --- | --- | --- |
| `--color-paper` | `#F4F1EA` | Page ground |
| `--color-ink` | `#111111` | Primary ink |
| `--color-accent` | `#449EB9` | Intent, one accent only |

Supporting scales (`paper-raised`, `paper-sunken`, `paper-edge`, `ink-700`
through `ink-100`, `accent-soft`, `accent-deep`) exist so surfaces can be
layered without introducing new hues.

**Type.** Instrument Serif for headings, Geist for body. The display scale
(`text-display`, `text-headline`, `text-title`, `text-lede`, `text-eyebrow`) is
fluid via `clamp()`, so headlines never need per-breakpoint overrides.

**Surfaces.** Cards are warm printed paper — `Paper` in
`components/primitives.tsx` — lit from a single source above via the
`shadow-paper` / `shadow-lift` / `shadow-float` ladder. Liquid glass is used in
exactly two places (the sticky nav and the guest order bar), where blur aids
legibility over moving content rather than acting as decoration.

**Motion.** One primitive: `components/Reveal.tsx`. Content settles once on
first approach and is never re-animated. No parallax, no scroll-jacking. All
motion uses the iOS easing curve and is fully disabled under
`prefers-reduced-motion`.

## Homepage architecture

The section order is an argument, not a layout — desire first, explanation
second:

| Section | Job |
| --- | --- |
| `Hero` | One sentence and one beautiful object. No feature list. |
| `Manifesto` | A pause, and a belief. |
| `Journey` | What Trogix actually is: one evening, eight moments, end to end. |
| `Surfaces` | Proof of craft — guest, kitchen and owner screens at full size. |
| `Principles` | Three commitments, set as display figures. |
| `OneSystem` | Nine modules presented as a contents page, not a pricing matrix. |
| `Closing` | The only inverted section on the page, so the invitation carries weight. |

## Product mocks

The screens in `components/mocks/` are real DOM, not screenshots. They stay
crisp at any density, inherit the brand tokens automatically, and cannot drift
from the product's visual language. Figures shown in them are illustrative.

## Conventions

- Server Components by default; `"use client"` only where interaction demands
  it (currently `Nav` and `Reveal`).
- Layout via `Container` / `Section`; avoid ad-hoc max-widths.
- Careful with Tailwind display utilities on `Button` — pass responsive
  visibility on a wrapper, since a `hidden` class on the component collides
  with its own `inline-flex` base.
