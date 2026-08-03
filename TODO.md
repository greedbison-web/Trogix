# TODO

Open items only. Anything not listed here is done — see `PROJECT_STATUS.md`.

## Content

- [ ] §4 `SaturdayEight.tsx` — the commitment `straight-to-the-pass` stands in
      for the unverified "Works offline" claim. Replace once the offline
      guarantee is real. No uptime or latency figures without measurements.
- [ ] `lib/demo-restaurant.ts` — confirm Sundara / Bandra / ₹ as the permanent
      demo fixture for the marketing page, or swap it. Single file, no other
      changes.
- [ ] §5 "Open the full demo" opens a mailto. Point it at a standalone guest
      demo route once one exists.
- [ ] Photography: PHOTO SLOT A (hero) and PHOTO SLOT B (§4) are reserved and
      currently render as designed negative space.

## Product

- [ ] WhatsApp order updates need a BSP account before the adapter can be
      exercised. Messages queue as `skipped` until then.
- [ ] `business_settings.payment_mode` and `upi_id` are no longer read by the
      app. Drop them in a later migration once nothing references them.
- [ ] Rehearse a full Razorpay test-mode payment. The token exchange and order
      creation have never run against live credentials — see
      `RAZORPAY_SETUP.md`.
- [ ] Schedule `purge_expired_verification()` (created in migration 0009) as a
      daily Supabase cron job. Nothing breaks without it; the tables just grow.
