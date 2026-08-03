# Trogix — Project Status

The operating system for modern restaurants. Next.js 15 (App Router), React 19,
TypeScript, Tailwind v4, PostgreSQL via Drizzle, Supabase Auth + Storage.

---

## Surfaces

| Surface | Route | Who |
| --- | --- | --- |
| Marketing site | `/` | Public |
| Guest menu & ordering | `/m/[slug]?t=<table token>` | Guests |
| Restaurant dashboard | `/dashboard/*` | Restaurant owners |
| Kitchen display | `/kitchen` | Kitchen staff |
| Admin platform | `/admin/*` | Trogix staff |

---

## Shipped

### Marketing website — frozen
Six sections: Hero, One Order, What You Keep, Saturday 8PM, Interactive Demo,
Final CTA. Built to an approved design review. Not to be modified without an
explicit request.

### Authentication
Supabase Auth — email/password and Google OAuth. Session refresh in middleware,
protected route groups, sign-out route.

### Business onboarding
Four steps (Business, Owner, Location, Brand) with Zod validation, logo upload,
slug generation and uniqueness. Ends on a fifth step where the restaurant
connects its own Razorpay account. Creates business + settings + owner staff row
in one transaction.

### Menu builder
Categories and items CRUD, variants, veg/spice/prep time, availability,
recommended and bestseller flags, image upload, drag-and-drop ordering for both
categories and items, search, filters, bulk availability, bulk delete, and a
live guest preview.

### QR table management
Tables CRUD, bulk creation with prefix/numbering, per-table QR tokens, QR
preview, PNG download, token regeneration, print sheet.

### Guest ordering
Category rail, variants, cart, checkout, Razorpay handover, webhook-confirmed
order state. **Orders are priced server-side** — the client sends only item ids
and quantities.

### Payments — restaurant-owned accounts
Trogix never receives or holds customer funds. Each restaurant connects its own
Razorpay merchant account via OAuth; charges are created on that account and
settle from Razorpay to the restaurant's bank.

- Tokens encrypted at rest (AES-256-GCM), auto-refreshed before expiry
- OAuth state is an HMAC bound to the business id — a callback cannot be
  replayed against another tenant
- The webhook is the **only** thing that marks an order paid; the browser
  callback is a UI hint
- Capture auto-confirms the order to the pass, seats the table, issues a
  numbered receipt — once, idempotently

### Orders, kitchen display, analytics
Live orders board with status transitions, full-bleed kitchen display with
ticket ageing, restaurant analytics over completed orders.

### Restaurant settings
Profile, branding (logo, colours, receipt footer), GST and service charge,
operating hours per weekday, payment status, staff management and a role
permission matrix.

### QR management
Per-table selection, bulk token regeneration, and server-rendered PDF export in
three layouts (table tents 6-up, stickers 12-up, posters 1-up).

### Menu experience
Add-ons per item, and an availability scheduler with a weekday bitmask and time
window (midnight-wrapping supported), honoured on the guest menu in the
restaurant's timezone.

### Order timeline
Append-only `order_events` records every status transition. Kitchen notes are
staff-only and never shown to guests.

### Guest messaging
Durable `outbound_messages` queue with WhatsApp and email adapters. Rows are
written before delivery, so an unconfigured provider queues rather than drops.
The kitchen display raises a browser notification and chime on new tickets;
permission is requested on click only.

### Admin platform
Separate route group at `/admin`, gated by `platform_admins` membership.

| Module | Route |
| --- | --- |
| Dashboard | `/admin` |
| Restaurant management | `/admin/restaurants`, `/admin/restaurants/[id]` |
| Live monitoring | `/admin/live` |
| Subscriptions & coupons | `/admin/subscriptions` |
| Payment monitoring | `/admin/payments` |
| Analytics (MRR/ARR/growth/retention) | `/admin/analytics` |
| Customer support | `/admin/support` |
| Notification centre | `/admin/notifications` |
| Platform settings | `/admin/settings` |
| Security | `/admin/security` |
| Usage & risk | `/admin/usage` |

**Capability model.** Every privileged action names a capability, not a role.
Roles: `owner`, `admin`, `support`, `readonly`. The matrix is rendered in the
Security screen and enforced in `lib/admin/auth.ts`.

**Impersonation.** Time-boxed (30 min), reason-required, revocable, audited. The
cookie alone grants nothing — the session row is re-validated on every request,
so revocation is instant. Both the admin shell and the restaurant shell show a
persistent banner while a session is live.

**Audit.** Every privileged action appends to `admin_audit_logs` with admin
email, target, metadata and IP. Auditing never blocks the action it describes.

---

## Database

26 tables. `business_id` on every tenant-owned table; RLS across all of them
keyed to `is_business_member()`. Platform tables have RLS enabled with **no**
`authenticated` policy, so a restaurant session can never read them.

Tenant: `users`, `businesses`, `business_settings`, `staff_members`,
`restaurant_tables`, `categories`, `menu_items`, `item_variants`, `orders`,
`order_items`, `order_events`, `payments`, `receipts`, `payment_accounts`,
`operating_hours`, `item_addons`, `outbound_messages`

Platform: `platform_admins`, `admin_audit_logs`, `impersonation_sessions`,
`webhook_events`, `qr_scans`, `error_logs`, `platform_notifications`,
`coupons`, `platform_settings`

Money is stored in **integer minor units** (paise) everywhere. Order items
snapshot name, variant and unit price so history survives menu edits.

### Migrations — run in order
```
0000_zippy_jamie_braddock.sql   base schema
0001_platform_policies.sql      auth mirror trigger, updated_at, storage, RLS
0002_menu_flags.sql             spice level, recommended, bestseller
0003_payment_accounts.sql       Razorpay Connect + awaiting_payment status
0004_platform_admin.sql         admin platform tables, RLS, seeded settings
0005_settings_and_addons.sql    operating hours, add-ons, item scheduling
0006_order_timeline.sql         order_events, kitchen notes
0007_messaging.sql              outbound_messages queue
```

---

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
RAZORPAY_CLIENT_ID=
RAZORPAY_CLIENT_SECRET=
RAZORPAY_WEBHOOK_SECRET=
APP_ENCRYPTION_KEY=          # 32-byte secret; rotating it forces reconnects
NEXT_PUBLIC_APP_URL=

# Guest messaging (optional — messages queue when unset)
WHATSAPP_API_URL=https://graph.facebook.com/v21.0
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
RESEND_API_KEY=
EMAIL_FROM=
```

The app builds and runs with none of these set — screens degrade to empty
states rather than crashing.

### Granting the first admin
There is no self-service path into `/admin` by design. Insert the first row
directly, then use Security → Grant access for everyone after:

```sql
insert into platform_admins (user_id, role, status)
select id, 'owner', 'active' from users where email = 'you@trogix.co.in';
```

---

## Verified

Against a real PostgreSQL 16 instance, not mocks:

- All eight migrations apply clean from scratch — 26 tables, RLS on all 9
  platform tables, 11 settings seeded
- Availability scheduler: 10/10 assertions pass, including midnight-wrapping
  windows and weekday masks
- Peak hours, repeat customers and table utilisation return correct figures on
  seeded orders
- Fraud signals fire correctly on seeded data (5 failed payments, 3 of 3
  cancellations)
- Health endpoint, six security headers and the 404 boundary verified on a
  running server
- Admin queries return correct figures on seeded data (overview, search,
  filters, payment monitoring, analytics, live feed, subscriptions)
- Permission matrix: 11/11 assertions pass — readonly cannot delete/suspend/
  impersonate, support cannot delete or manage admins or write settings, admin
  cannot delete or manage admins, owner can everything
- Impersonation: of three sessions (live, expired, revoked) exactly one
  resolves
- All 11 `/admin/*` routes redirect unauthenticated requests to login
- Guest order pricing verified to the paisa: ₹1,480 subtotal → ₹74 service →
  ₹77.70 GST → ₹1,631.70 total
- Webhook: 401 unsigned, 401 bad signature, 200 valid; replay by event id is a
  no-op; `payment.failed` records the reason and leaves the order unconfirmed

---

## Not done

- **Razorpay live paths unverified.** The OAuth token exchange and
  `POST /v1/orders` are written to the documented API but have never run
  against Razorpay — no credentials. Everything downstream of them is verified.
- **No deployment.** Nothing has been deployed; no CI.
- **Rate limiting and structured logging** are not implemented; load testing
  has not been done.
- **Reviews and loyalty** — modules from the original vision, not started.
- **Messaging providers unverified.** The WhatsApp and Resend adapters are
  written to their documented APIs but have never run against them — no
  credentials. Queuing, templating and the failure path are verified.
- **`business_settings.payment_mode` / `upi_id`** are dead columns since the
  Razorpay migration; drop them once nothing reads them.

## Deployment

`vercel.json` pins the Mumbai region and raises the timeout for the webhook and
the two document generators. Security headers (CSP, HSTS, nosniff, frame-deny,
permissions policy) are set in `next.config.ts`. `/api/health` reports liveness
and database reachability for uptime checks. Global error and 404 boundaries
are in place.

Nothing has been deployed. Before a first deploy: set the environment above,
run all eight migrations, and grant the first platform admin.

See `TODO.md` for the working list.
