# Resend setup

Resend is the only email provider Trogix uses, and email is on the critical
path: signup delivers a 6-digit verification code by email, and an account that
cannot receive it cannot onboard. **Do this before announcing the product.**

Time: 15 minutes, plus DNS propagation.

---

## 1. Create the account

1. <https://resend.com> → sign up.
2. Verify your own email address when prompted.

---

## 2. Add and verify your domain

Sending from an unverified domain is rejected, and sending from
`onboarding@resend.dev` (the sandbox address) only reaches your own account —
no restaurant owner will receive anything.

1. **Domains → Add Domain** → `trogix.co.in`.
2. Region: **ap-south-1 (Mumbai)** if offered.
3. Resend shows DNS records to add at your registrar:

   | Type | Purpose |
   | --- | --- |
   | `MX` | receiving for the bounce subdomain |
   | `TXT` (SPF) | authorises Resend to send as your domain |
   | `TXT` (DKIM) | signs your mail so it is not forged |

   Add them exactly as shown, including the subdomain prefix (often `send.`).
   Do not merge Resend's SPF record with an existing one by guessing — if you
   already have an SPF record, combine them into a single record with both
   `include:` directives. Two SPF records is a hard failure.

4. Click **Verify**. This usually completes in minutes; some registrars take
   several hours.
5. Wait for the domain to show **Verified** before continuing.

### DMARC (recommended)

Add a `TXT` record at `_dmarc.trogix.co.in`:

```
v=DMARC1; p=none; rua=mailto:dmarc@trogix.co.in
```

Start with `p=none` and watch the reports for a week before tightening to
`quarantine`. Verification codes landing in spam is the most common cause of
owners abandoning signup.

---

## 3. Create the API key

1. **API Keys → Create API Key**.
2. Name: `trogix-production`.
3. Permission: **Sending access**. Full access is not needed and gives away
   more than the app uses.
4. Domain: restrict it to `trogix.co.in`.
5. Copy the key — it starts with `re_` and is shown once.

---

## 4. Set the environment variables

In Vercel → **Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | the `re_…` key |
| `EMAIL_FROM` | `Trogix <verify@trogix.co.in>` |

`EMAIL_FROM` must be an address **on the verified domain**. The display name is
optional but improves deliverability; both `verify@trogix.co.in` and
`Trogix <verify@trogix.co.in>` are accepted.

Redeploy after adding them — environment changes do not apply to a running
deployment.

---

## 5. Verify

```bash
curl -s https://trogix.co.in/api/health | jq '.configuration.groups[] | select(.name=="email")'
```

Expect `"configured": true`.

Then do the real thing: sign up at `/signup` with an address you control. You
should receive **Restaurant Verification Code** within seconds, containing a
6-digit code and the line "This code expires in 5 minutes."

Check the **Resend → Logs** page. A delivered message appears with status
`delivered`. A failure shows the reason there — that page is the fastest way to
diagnose anything below.

---

## What Trogix sends

| Email | Trigger | Template |
| --- | --- | --- |
| Restaurant Verification Code | signup, and every resend | HTML + plain text |
| Guest order updates | order status changes, when a guest gave an email | plain text |

Both HTML and plain-text bodies are sent for the verification email, so clients
that block HTML still show the code.

---

## Limits and what happens when they are hit

Resend's free tier allows 100 emails/day and 3,000/month. Each signup costs at
least one email, and up to six if the owner uses every resend.

When Resend rejects a send, Trogix **does not** advance the resend counter and
shows "Could not send the verification email. Please try again." — the owner is
not silently burned through their allowance for messages that never went out.
But they also cannot sign up. Move to a paid plan before you have meaningful
signup volume.

---

## Rate limits inside Trogix

These are enforced server-side and are not configurable without a code change:

- 60 seconds between resends
- 5 resends per account, then generation is blocked for an hour
- 5 wrong codes, then the code is destroyed and a new one is required
- 10 code requests and 5 signups per IP address per window

If a legitimate owner is locked out, clear their block in SQL:

```sql
update public.verification_challenges
set blocked_until = null, resend_count = 0, attempts = 0
where user_id = (select id from public.users where email = 'owner@example.com');
```

They can then request a fresh code.
