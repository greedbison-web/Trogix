# Trogix

The operating system for modern restaurants.

Trogix is not a QR-menu tool. It is one system that runs the whole evening —
arrival, menu, ordering, kitchen, payment, messaging, receipt, and the return
visit — so a restaurant does not have to stitch six products together.

## Deploying

Follow these in order:

1. [DEPLOY_SUPABASE.md](./DEPLOY_SUPABASE.md) — database, migrations, auth
2. [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) — hosting, environment, domain
3. [RESEND_SETUP.md](./RESEND_SETUP.md) — email; **required**, signup sends a
   verification code
4. [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md) — grant yourself `/admin`
5. [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md) — payments; optional
6. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — when something is wrong

Current state of every module: [PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Stack

- Next.js 15 (App Router) + React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- PostgreSQL via Drizzle ORM and postgres-js, hosted on Supabase
- Supabase Auth — email/password and Google
- Razorpay Connect for restaurant-owned payment accounts
- Resend for email
- Deployed on Vercel (`bom1`)

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3000
npm run typecheck
npm run build
```

`.env.example` documents every variable and what breaks without it. At
runtime, `GET /api/health` reports which groups are configured — values are
never printed.

### Preview mode

To walk the owner-side screens without a database, a Supabase project or an
account:

```bash
echo "TROGIX_PREVIEW=1" >> .env.local
npm run dev
```

Every guard then returns a stand-in owner and every query returns the demo
cafe in `lib/preview/data.ts` — a full menu, twelve tables, live tickets on
the pass and a fortnight of trading. `/dashboard`, `/kitchen` and the rest
open directly, and the homepage's buttons point at them.

It is read-only by intent: server actions still write to the real database,
so saving fails while preview mode is on. The flag is ignored on a Vercel
production deployment, so it cannot expose a live restaurant's data.

Migrations are the numbered files in `drizzle/`. Run them in filename order;
do not use `drizzle-kit push`, which does not know about the custom migrations
that create the RLS policies and column grants.

## Layout

```
app/(auth)         signup, login, OTP verification
app/(onboarding)   business setup and payment connection
app/(app)          restaurant dashboard
app/(kds)          kitchen display, full-bleed
app/(admin)        Trogix platform console
app/m/[slug]       guest menu and ordering
app/api            health, Razorpay OAuth and webhook
lib/               db schema and queries, auth, verification, payments
components/site    the frozen marketing homepage
```

## Design system

Everything visual derives from tokens in `app/globals.css` under `@theme`.
Nothing hardcodes a hex value — add a token instead, so every module stays in
the same language.

| Token | Value | Role |
| --- | --- | --- |
| `--color-paper` | `#F4F1EA` | Page ground |
| `--color-ink` | `#111111` | Primary ink |
| `--color-accent` | `#449EB9` | Intent, one accent only |

Supporting scales (`paper-raised`, `paper-sunken`, `paper-edge`, `ink-700`
through `ink-100`, `accent-soft`, `accent-deep`) let surfaces layer without
introducing new hues. `--color-state-late` is semantic, not a brand accent.

**Type.** Instrument Serif for headings, Geist for body. The display scale
(`text-display`, `text-headline`, `text-title`, `text-lede`, `text-eyebrow`) is
fluid via `clamp()`, so headlines never need per-breakpoint overrides.

**Motion.** One primitive: `components/Reveal.tsx`. Content settles once on
first approach and is never re-animated. No parallax, no scroll-jacking. All
motion uses the iOS easing curve and is disabled under
`prefers-reduced-motion`.

## Homepage

Frozen. Six sections, built to an approved design review, not to be modified
without an explicit request.

| Section | Job |
| --- | --- |
| `Hero` | One sentence and one beautiful object. No feature list. |
| `OneOrder` | The same order seen from guest, kitchen and owner. |
| `WhatYouKeep` | What the restaurant owns: the guest, the data, the money. |
| `SaturdayEight` | Three commitments, set as display figures. |
| `InteractiveDemo` | A real order placed on the page. |
| `FinalCta` | The only inverted section, so the invitation carries weight. |

The product screens in `components/product/` are real DOM, not screenshots —
they stay crisp at any density and cannot drift from the brand tokens. Their
figures come from `lib/demo-restaurant.ts` and are illustrative.

## Conventions

- Server Components by default; `"use client"` only where interaction demands
  it. All mutations are Server Actions with Zod validation.
- Money is stored and computed in integer minor units (paise). Never floats.
- Every tenant-owned table carries `business_id`, and every query filters on
  it. RLS is defence in depth, not the only boundary.
- Layout via `Container` / `Section`; avoid ad-hoc max-widths.
- Careful with Tailwind display utilities on `Button` — pass responsive
  visibility on a wrapper, since a `hidden` class on the component collides
  with its own `inline-flex` base.
