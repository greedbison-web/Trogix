# Deploy: Vercel

Do [DEPLOY_SUPABASE.md](./DEPLOY_SUPABASE.md) first — you need the Supabase
URL, anon key and pooled connection string.

Time: about 15 minutes.

---

## 1. Push to GitHub

```bash
git remote -v            # confirm the remote you expect
git push -u origin main
```

Nothing secret is in the repository: `.env` and `.env*.local` are gitignored,
and `.env.example` contains only placeholders. Confirm before pushing:

```bash
git ls-files | grep -E '^\.env' || echo "no env files tracked"
```

---

## 2. Import the project

1. <https://vercel.com/new> → **Import Git Repository** → pick the repo.
2. **Framework Preset**: Next.js (detected automatically).
3. **Root Directory**: `./`
4. **Build Command**, **Output Directory**, **Install Command**: leave as the
   defaults. `vercel.json` already pins the region and the function timeouts.
5. Do **not** click Deploy yet — add the environment variables first, or the
   first build produces a site that cannot reach the database.

---

## 3. Environment variables

Expand **Environment Variables** on the import screen (or
**Settings → Environment Variables** afterwards). Add each of these to
**Production**, **Preview** and **Development** unless noted.

### Required

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **pooled** string, port 6543, ending `?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `APP_ENCRYPTION_KEY` | output of `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://trogix.co.in` — your real domain, no trailing slash |
| `RESEND_API_KEY` | see [RESEND_SETUP.md](./RESEND_SETUP.md) |
| `EMAIL_FROM` | `Trogix <verify@trogix.co.in>` |

### Optional

| Name | Value |
| --- | --- |
| `RAZORPAY_CLIENT_ID` | see [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md) |
| `RAZORPAY_CLIENT_SECRET` | " |
| `RAZORPAY_WEBHOOK_SECRET` | " |
| `WHATSAPP_API_URL` | `https://graph.facebook.com/v21.0` |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token |
| `WHATSAPP_PHONE_ID` | WhatsApp Cloud API phone number id |

Notes that will bite you if ignored:

- **`APP_ENCRYPTION_KEY` must be identical across Production and Preview** if
  you want a preview deployment to read gateway tokens or verification codes
  written by production. In practice, use a *different* key for Preview and
  point Preview at a separate Supabase project — previews should never touch
  live restaurant data.
- **Changing `APP_ENCRYPTION_KEY` later** invalidates every stored Razorpay
  token (restaurants must reconnect) and every live verification code (owners
  request a new one). It does not corrupt anything else.
- **`NEXT_PUBLIC_*` values are baked into the browser bundle at build time.**
  Changing one requires a redeploy, not just a restart.
- Never add a `NEXT_PUBLIC_` prefix to `DATABASE_URL`, `APP_ENCRYPTION_KEY`,
  `RESEND_API_KEY` or any Razorpay value. That publishes them.

---

## 4. Deploy

Click **Deploy**. The first build takes 2–4 minutes.

A successful build ends with a route list where nearly every entry is marked
`ƒ (Dynamic)`. That is expected: the app reads live data on every request. Only
`/`, `/signup`, `/robots.txt`, `/sitemap.xml` and `/icon.svg` are static.

---

## 5. Add the domain

1. **Settings → Domains → Add** → `trogix.co.in`.
2. Add the DNS records Vercel shows at your registrar. For an apex domain that
   is usually an `A` record to `76.76.21.21`; for `www` a `CNAME` to
   `cname.vercel-dns.com`. Vercel displays the exact values — use those.
3. Wait for the certificate to be issued (usually minutes, up to an hour).
4. Set the redirect so one hostname is canonical (`www` → apex or the reverse).
5. Confirm `NEXT_PUBLIC_APP_URL` matches the canonical hostname exactly, then
   **redeploy** so the new value is compiled in.

---

## 6. Verify the deployment

```bash
curl -s https://trogix.co.in/api/health | jq
```

Expected:

```json
{
  "status": "ok",
  "database": "ok",
  "configuration": { "ready": true, "missingRequired": [], "groups": [...] }
}
```

- `"database": "unreachable"` → the connection string is wrong, the password
  is not URL-encoded, or the Supabase project is paused.
- `"missingRequired"` non-empty → those variables are absent from this
  environment. Add them and redeploy.
- `"status": "degraded"` with `"database": "ok"` → configuration only; the
  named groups are missing.

Then check the pages:

| URL | Expect |
| --- | --- |
| `/` | marketing homepage |
| `/signup` | signup form with owner name, email, phone, password |
| `/login` | sign-in form |
| `/dashboard` | redirect to `/login` |
| `/admin` | redirect to `/login?next=/admin` |
| `/m/anything` | 404 (no approved restaurant with that slug yet) |

Confirm the security headers are present:

```bash
curl -sI https://trogix.co.in/ | grep -i -E 'content-security-policy|strict-transport'
```

---

## 7. Region and function limits

`vercel.json` pins:

- **Region** `bom1` (Mumbai) — same region as the Supabase project, so
  database round trips stay in single-digit milliseconds.
- **Timeouts**: 30s for the Razorpay webhook, 60s for the QR PDF and the
  analytics export. These exceed the 10s default on Hobby plans; on Hobby the
  cap is enforced regardless, so PDF generation for a large restaurant may
  time out. Use Pro for production.

If you deploy to a different region, change it in `vercel.json` **and** create
the Supabase project in the matching region. Splitting them adds 100–200 ms to
every query.

---

## 8. After the first deploy

1. [RESEND_SETUP.md](./RESEND_SETUP.md) — required before anyone can sign up.
2. [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md) — grant yourself `/admin`.
3. [RAZORPAY_SETUP.md](./RAZORPAY_SETUP.md) — when you are ready to take
   payments.

---

## Redeploying

Pushing to the default branch deploys automatically. Environment variable
changes do **not** redeploy on their own — after editing one, go to
**Deployments → ⋯ → Redeploy**.
