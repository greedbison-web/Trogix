# Razorpay setup

Trogix uses **Razorpay Connect**. Each restaurant authorises Trogix to create
orders on *their own* Razorpay merchant account, and customer money settles
directly into *their* bank account.

**Trogix never receives or holds customer funds.** There is no platform escrow,
no settlement account and no payout code, by design. The consequence for you:
you are not a payment aggregator, but you also cannot refund a guest on a
restaurant's behalf — refunds are issued from the restaurant's own Razorpay
dashboard.

Payments are optional. Without this setup the product works end to end as
pay-at-counter; the guest simply does not see an online payment option.

---

## 1. Register the Trogix partner application

1. Sign in at <https://dashboard.razorpay.com> with the **Trogix** business
   account (not a restaurant's).
2. Complete KYC if you have not. Partner applications are not issued to
   unverified accounts.
3. Apply for a **Partner** account: **Account & Settings → Partner** (or
   contact partners@razorpay.com — Connect access is granted per account, not
   self-serve).
4. Once approved, create an **OAuth application**:
   - **Name**: Trogix
   - **Redirect URL**: `https://trogix.co.in/api/razorpay/callback`

     This must match `NEXT_PUBLIC_APP_URL` + `/api/razorpay/callback`
     **exactly** — scheme, host, no trailing slash. A mismatch fails the token
     exchange with `invalid_redirect_uri` after the restaurant has already
     approved, which is a confusing failure to debug.
   - **Scopes**: `read_write`

5. Copy the **Client ID** and **Client Secret**.

---

## 2. Create the webhook

**Account & Settings → Webhooks → Add New Webhook**.

- **Webhook URL**: `https://trogix.co.in/api/webhooks/razorpay`
- **Secret**: generate one with `openssl rand -hex 32` and save it.
- **Active events**: tick exactly these two —
  - `payment.captured`
  - `payment.failed`

  Trogix ignores everything else; subscribing to more only adds noise to the
  webhook log.

---

## 3. Set the environment variables

Vercel → **Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `RAZORPAY_CLIENT_ID` | OAuth application Client ID |
| `RAZORPAY_CLIENT_SECRET` | OAuth application Client Secret |
| `RAZORPAY_WEBHOOK_SECRET` | the webhook secret from step 2 |

`NEXT_PUBLIC_APP_URL` must already be set to the production origin. Redeploy
after adding them.

Verify:

```bash
curl -s https://trogix.co.in/api/health | jq '.configuration.groups[] | select(.name=="razorpay")'
```

Expect `"configured": true`.

---

## 4. Connect a restaurant

From the restaurant owner's account:

1. **/dashboard/payments → Connect Razorpay**.
2. They are sent to Razorpay, sign in with *their* merchant account and
   approve.
3. Razorpay redirects to `/api/razorpay/callback`; Trogix exchanges the code
   for tokens and stores them **encrypted with AES-256-GCM** under
   `APP_ENCRYPTION_KEY`.
4. `/dashboard/payments` shows the account id, live/test mode and connection
   time.

The OAuth `state` is an HMAC of the business id signed with the client secret,
so a callback cannot be replayed against a different restaurant.

Test mode is fine for a rehearsal; the dashboard labels it, and the guest
checkout uses Razorpay's test cards.

---

## 5. Verify the money path

With a connected restaurant and an approved menu:

1. Open the guest menu, add an item, check out, pay with a Razorpay test
   instrument.
2. Razorpay posts `payment.captured` to the webhook.
3. Trogix verifies the signature, records the payment, and moves the order to
   confirmed automatically. There is no manual confirmation step.
4. Check **/admin/payments** — the event appears with `signature valid` and
   status `processed`.

If the order stays unpaid, work through the webhook section of
[TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## How the webhook is protected

- The **raw request body** is HMAC-verified against `RAZORPAY_WEBHOOK_SECRET`
  with a constant-time comparison. An invalid signature returns 401 and is
  recorded as `rejected` — it is never processed.
- Every event is stored before it is applied, keyed by Razorpay's event id.
  A redelivered event is recognised and skipped, so a payment cannot be
  double-applied.
- A failed event stays visible in **/admin/payments** and can be retried by an
  admin. The retry runs the same idempotent processor as live delivery.

---

## Rotating secrets

- **Webhook secret**: create the new webhook first, set
  `RAZORPAY_WEBHOOK_SECRET`, redeploy, then delete the old webhook. Doing it in
  the other order drops events in the gap.
- **Client secret**: invalidates every stored connection. Each restaurant must
  reconnect from `/dashboard/payments`.
- **`APP_ENCRYPTION_KEY`**: the stored tokens can no longer be decrypted.
  Restaurants must reconnect. Nothing else is affected.

---

## Not verified in this environment

The token exchange and order creation are written to Razorpay's documented API
but have never been run against live Razorpay credentials — no partner account
existed while the code was written. Signature verification, idempotency and the
whole database path **are** verified.

Rehearse a full test-mode payment before your first real restaurant goes live.
