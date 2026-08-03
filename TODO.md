# TODO

- [ ] §4 `SaturdayEight.tsx` — commitment `straight-to-the-pass` is a
      placeholder for the unverified "Works offline" claim. Replace once the
      offline guarantee is confirmed. No uptime/latency figures without data.
- [ ] `lib/demo-restaurant.ts` — confirm Sundara / Bandra / ₹ as the permanent
      demo restaurant, or swap the fixture (single file, no other changes).
- [ ] §5 "Open the full demo" links to mailto. Point at the standalone guest
      demo route once it exists.
- [ ] Photography: PHOTO SLOT A (hero, behind device) and PHOTO SLOT B (§4,
      behind the pass) are reserved and currently render as designed negative
      space.
- [ ] `Sign in` links to mailto until auth exists.
- [ ] Dashboard quick actions link to /dashboard/menu, /dashboard/tables and
      /dashboard/orders — these routes 404 until those features ship.
- [ ] Register the Razorpay partner app, set RAZORPAY_CLIENT_ID/SECRET,
      RAZORPAY_WEBHOOK_SECRET, APP_ENCRYPTION_KEY and NEXT_PUBLIC_APP_URL, and
      point the webhook at /api/webhooks/razorpay (payment.captured,
      payment.failed).
- [ ] business_settings.payment_mode and upi_id are now unused by the app;
      drop them in a later migration once nothing reads them.
- [ ] WhatsApp order updates: needs a BSP account before wiring.
- [ ] Grant the first platform admin by SQL (see PROJECT_STATUS.md); there is
      no self-service path into /admin by design.
