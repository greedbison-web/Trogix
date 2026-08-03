# Troubleshooting

Start every investigation here:

```bash
curl -s https://trogix.co.in/api/health | jq
```

It reports database reachability and which configuration groups are present,
without printing any value. `"status": "degraded"` plus a non-empty
`missingRequired` array names the exact variables to add.

---

## Build and deploy

### The Vercel build fails on `Module not found` or a type error

Reproduce locally — the same code fails the same way:

```bash
npm ci
npm run typecheck
npm run build
```

`npm ci` matters: `npm install` may resolve different versions than the
lockfile Vercel uses.

### The build succeeds but every page 500s

Almost always `DATABASE_URL`. Check `/api/health`; if `database` is
`unreachable`, see the next section.

### Environment variable changes had no effect

Vercel does not redeploy when you edit a variable.
**Deployments → ⋯ → Redeploy.** `NEXT_PUBLIC_*` values in particular are
compiled into the browser bundle at build time — a restart is not enough.

---

## Database

### `"database": "unreachable"`

1. **Paused project.** Free Supabase projects pause after 7 days idle. Open
   the Supabase dashboard; it offers to restore.
2. **Wrong password, or an unencoded one.** If the password contains `@`, `:`,
   `/` or `?`, percent-encode it (`@` → `%40`).
3. **Direct connection instead of the pooler.** `DATABASE_URL` must use port
   `6543` with `?pgbouncer=true`. Port `5432` runs out of connections under
   serverless load and starts refusing new ones.

### `sorry, too many clients already`

You are on the direct port. Switch to the pooled string and redeploy.

### `prepared statement "s1" already exists`

PgBouncer in transaction mode with prepared statements. The app already sets
`prepare: false`; if you see this, something is connecting outside
`lib/db/index.ts`, or `?pgbouncer=true` is missing from the URL.

### A page hangs forever instead of erroring

A query issued through the pool from *inside* a transaction. The transaction
holds a connection and the nested read waits on it. Every read must be hoisted
out of the transaction that needs it. This bit the menu builder once and was
fixed by raising the pool above one connection and moving the read out.

### `relation "…" does not exist`

A migration did not run. Re-check the count:

```sql
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';   -- expect 28
```

Run the missing files in numeric order. See
[DEPLOY_SUPABASE.md](./DEPLOY_SUPABASE.md).

---

## Signup and verification

### No verification email arrives

1. Check **Resend → Logs**. A rejected send names the reason there.
2. Domain not verified in Resend → every send is rejected. See
   [RESEND_SETUP.md](./RESEND_SETUP.md).
3. `EMAIL_FROM` is not on the verified domain.
4. Check spam. Add a DMARC record if codes routinely land there.
5. `curl /api/health | jq '.configuration.groups'` — is the `email` group
   `configured`?

### "Could not send the verification email"

Resend rejected the request. Trogix deliberately does **not** advance the
resend counter in this case, so the owner has not burned an attempt. Fix the
Resend configuration and they can retry immediately.

### "Too many codes requested. Try again in 60 minutes."

The account hit 5 resends. To clear it for a specific owner:

```sql
update public.verification_challenges
set blocked_until = null, resend_count = 0, attempts = 0
where user_id = (select id from public.users where email = 'owner@example.com');
```

### "Too many code requests. Try again in 15 minutes."

The **per-IP** ceiling, not the per-account one. Expected when several owners
sign up from one restaurant's Wi-Fi, or during testing. To clear:

```sql
delete from public.rate_limits where key like 'otp.request:ip:%';
```

### An owner is stuck on `/verify` in a loop

Their account is not fully verified. Check:

```sql
select email, email_verified_at, phone_verified_at
from public.users where email = 'owner@example.com';
```

Both must be non-null. If they are and the loop continues, the session cookie
is stale — sign out and back in.

Never set these columns by hand to unblock someone. That is exactly the bypass
the whole flow exists to prevent; have them enter a real code.

### "An account already uses this phone number"

Phone numbers are unique across the platform. Find the holder:

```sql
select id, email, created_at from public.users where phone = '9876543210';
```

If it is an abandoned signup, delete that auth user from **Supabase →
Authentication → Users**; the profile row cascades.

### Signup succeeds but the owner is not signed in

Supabase's own **Confirm email** setting is on. Turn it off — Trogix runs its
own verification, and Supabase's confirmation blocks the session that signup
establishes. See [DEPLOY_SUPABASE.md](./DEPLOY_SUPABASE.md) §6.

---

## Authentication

### Google sign-in returns `?error=oauth`

1. The redirect URI in Google Cloud must be
   `https://<project-ref>.supabase.co/auth/v1/callback` — the Supabase
   callback, not the Trogix one.
2. `https://trogix.co.in/auth/callback` must be in Supabase's
   **Redirect URLs** allow-list.
3. **Site URL** in Supabase must be the production origin.

### Signed in, but `/dashboard` redirects to `/login`

The session cookie is not reaching the server. Check that
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in the
environment you are testing (Preview and Production are separate), and that
you are on the canonical hostname — cookies set on `www.` are not sent to the
apex domain.

### `/admin` redirects to `/dashboard`

You have a session but no `platform_admins` row, or its `status` is not
`active`. See [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md).

---

## Restaurants and the guest menu

### `/m/<slug>` returns 404 for a restaurant that exists

By design: guests only ever reach an **approved** restaurant. Check the status:

```sql
select b.name, b.slug, s.business_status
from public.businesses b
join public.business_settings s on s.business_id = b.id
where b.slug = 'sundara';
```

- `pending_review` → approve it at **/admin/restaurants**.
- `rejected`, `suspended`, `closed` → intentional.
- `onboarding` → the owner never finished onboarding.

### "Approve restaurant" is refused

The owner's email and phone are not both verified. The admin page shows both
flags under **Account verification**.

### The guest menu is empty

Categories must be **active** and items **available**, and the item must sit in
a category. Check `/dashboard/menu` — unpublished items are marked there.

---

## Payments

### The webhook returns 401

The signature did not verify. Either `RAZORPAY_WEBHOOK_SECRET` does not match
the secret on the webhook in the Razorpay dashboard, or something is rewriting
the request body in transit. The raw body is what gets signed — any proxy that
reformats JSON breaks it.

### A guest paid but the order is still unpaid

1. **/admin/payments** — is the event there?
   - **Not there**: Razorpay never delivered. Check the webhook's delivery log
     in the Razorpay dashboard, and that the URL is exactly
     `https://trogix.co.in/api/webhooks/razorpay`.
   - **`rejected`**: signature failure, see above.
   - **`failed`**: the processor errored. The stored error is shown; retry from
     that page once fixed.
2. Retrying is safe. Events are idempotent by Razorpay event id — a replay is
   recognised and skipped rather than applied twice.

### "Razorpay Connect is not configured on this deployment"

`RAZORPAY_CLIENT_ID`, `RAZORPAY_CLIENT_SECRET` or `NEXT_PUBLIC_APP_URL` is
missing. Check `/api/health`.

### `invalid_redirect_uri` after a restaurant approves

The redirect URL registered on the Razorpay OAuth application must equal
`NEXT_PUBLIC_APP_URL` + `/api/razorpay/callback`, character for character. A
trailing slash or `www.` mismatch is enough to fail.

### A restaurant's connection stopped working

Either the tokens expired or were revoked from their Razorpay dashboard, or
`APP_ENCRYPTION_KEY` changed and the stored tokens can no longer be decrypted.
`/dashboard/payments` shows the status. The fix in both cases is to reconnect.

---

## Performance

### Pages are slow

Check that the Supabase region and the Vercel region (`bom1` in
`vercel.json`) match. A Mumbai function talking to a Virginia database adds
100–200 ms to every query, and a page makes several.

### The QR PDF or analytics export times out

`vercel.json` allows 60s for both. On Hobby plans the platform caps functions
at 10s regardless, which is not enough for a large menu. Use Pro.

---

## Security checks worth re-running

After any migration change, in the Supabase SQL editor:

```sql
-- Every table has RLS. Expect zero rows.
select relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- anon holds nothing. Expect 0.
select count(*) from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';

-- A client can only edit its display fields.
-- Expect exactly full_name and avatar_url.
select column_name from information_schema.column_privileges
where table_name = 'users' and grantee = 'authenticated'
  and privilege_type = 'UPDATE';
```

The third one matters most: RLS restricts rows, never columns. Without the
column grants from migration `0010`, a signed-in client could set its own
`email_verified_at` using the public anon key and skip verification entirely.
