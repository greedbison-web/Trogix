# Deploy: Supabase

Sets up the database and authentication. Do this **before** Vercel — you need
the connection string and API keys to fill in the Vercel environment.

Time: about 20 minutes.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Organisation: your own. Name: `trogix-production`.
3. **Database Password**: generate one and save it in your password manager
   now. Supabase will not show it again, and you need it in step 3.
4. **Region**: `South Asia (Mumbai) ap-south-1`. Guests, restaurants and the
   Vercel region (`bom1`) are all in India — any other region adds latency to
   every page load.
5. Pricing plan: Free is enough to launch. Note that free projects pause after
   7 days of inactivity, which will take a live restaurant offline. Move to Pro
   before onboarding a paying restaurant.
6. Click **Create new project** and wait for provisioning (about 2 minutes).

---

## 2. Collect the API keys

Go to **Project Settings → API** (Configuration → API on newer dashboards).

| Dashboard field | Environment variable |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Project API keys → `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Copy both into a scratch file — you will paste them into Vercel later.

Do **not** copy the `service_role` key. Trogix does not use it. Nothing in the
codebase reads it, and putting it in Vercel would only widen the blast radius
of a leak.

---

## 3. Collect the connection strings

Go to **Project Settings → Database → Connection string**.

You need **two** different strings.

**a. Pooled — for the application.** Select the **Transaction** pooler (port
`6543`). It looks like:

```
postgresql://postgres.abcdefghijklm:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

Replace `[YOUR-PASSWORD]` with the password from step 1, then append
`?pgbouncer=true`:

```
postgresql://postgres.abcdefghijklm:s3cret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

This is `DATABASE_URL` in Vercel. Serverless functions open many short-lived
connections; pointing them at the direct port exhausts it under load.

**b. Direct — for migrations only.** Port `5432`, host
`db.<project-ref>.supabase.co`. Keep it out of Vercel; you only use it from
your own machine if you run migrations with `psql`.

If your password contains `@`, `:`, `/` or `?`, percent-encode it
(`@` → `%40`) or the URL will not parse.

---

## 4. Run the migrations

There are 11 migration files in `drizzle/`, numbered `0000` to `0010`. They
must run **in filename order**. Running them out of order fails, because later
files alter tables the earlier ones create.

### Option A — Supabase SQL Editor (recommended for the first deploy)

1. Open **SQL Editor → New query**.
2. Open `drizzle/0000_zippy_jamie_braddock.sql` from the repo, paste the whole
   file, click **Run**. Wait for "Success. No rows returned".
3. Repeat for each file in order:

   ```
   0000_zippy_jamie_braddock.sql
   0001_platform_policies.sql
   0002_menu_flags.sql
   0003_payment_accounts.sql
   0004_platform_admin.sql
   0005_settings_and_addons.sql
   0006_order_timeline.sql
   0007_messaging.sql
   0008_account_verification.sql
   0009_verification_policies.sql
   0010_production_hardening.sql
   ```

Run them one file per query. Pasting several at once still works, but if one
fails you will not know which.

### Option B — psql from your machine

```bash
git clone <your-repo> && cd Trogix
export DIRECT_URL='postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres'

for f in drizzle/0*.sql; do
  echo "applying $f"
  psql -v ON_ERROR_STOP=1 "$DIRECT_URL" -f "$f" || break
done
```

`ON_ERROR_STOP=1` matters: without it psql keeps going after a failure and you
end up with a half-migrated database.

### Do not use `drizzle-kit push`

`push` diffs the schema and invents its own DDL. It does not know about the
custom migrations (`0001`, `0009`, `0010`) that create the RLS policies,
triggers and column grants, so a pushed database is missing every security
control. Always run the numbered files.

---

## 5. Verify the migration

In **SQL Editor**, run:

```sql
-- Expect 28
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';

-- Expect zero rows: every table must have RLS on
select relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- Expect zero: the anon role holds no table privileges in public
select count(*) from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';

-- Expect exactly full_name and avatar_url
select column_name from information_schema.column_privileges
where table_name = 'users' and grantee = 'authenticated'
  and privilege_type = 'UPDATE';

-- Expect 11 rows
select namespace, key from platform_settings order by namespace, key;
```

If the fourth query returns more than `full_name` and `avatar_url`, migration
`0010` did not run. Run it — without it a signed-in user can mark their own
account verified using nothing but the public anon key.

---

## 6. Configure authentication

**Authentication → Providers → Email**

- **Enable Email provider**: on.
- **Confirm email**: **off**.

  Trogix runs its own verification: a 6-digit code sent through Resend, which
  proves the email *and* the registered phone number in one step. Leaving
  Supabase's confirmation on sends a second, redundant email and blocks the
  session that signup needs, stranding new owners on the verify screen.

- **Secure email change**: on.
- **Minimum password length**: 8 (matches the app's own validation).

**Authentication → Providers → Google** (optional)

Only if you want "Continue with Google":

1. In Google Cloud Console create an OAuth 2.0 Client ID (Web application).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste the Client ID and Secret into Supabase, enable the provider.

Google accounts arrive without a phone number. Trogix sends them to `/verify`
to supply and confirm one before they can onboard — no extra setup needed.

**Authentication → URL Configuration**

- **Site URL**: `https://trogix.co.in` (your production domain).
- **Redirect URLs**: add both

  ```
  https://trogix.co.in/auth/callback
  https://trogix.co.in/**
  ```

  and, if you use Vercel previews, `https://*.vercel.app/**`.

---

## 7. Storage

Migration `0001` creates the `business-logos` and `menu-images` buckets and
their policies. Confirm under **Storage** that both exist and are marked
**Public**.

If they are missing, `0001` did not complete — re-run it.

---

## 8. Backups

**Project Settings → Database → Backups.** Free projects get no automatic
backups. On Pro, daily backups are on by default. Turn on Point-in-Time
Recovery before the first restaurant takes real payments — order and payment
rows are financial records.

---

## Done

You now have: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`DATABASE_URL`.

Next: [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md).
