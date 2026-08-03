-- Custom migration: privilege hardening before the first production deploy.
--
-- RLS decides which ROWS a role may touch; it cannot restrict which COLUMNS.
-- The "Users update themselves" policy therefore let a signed-in client, using
-- nothing but the public anon key against PostgREST, write its own
-- email_verified_at / phone_verified_at and walk straight past verification.
-- Column-level grants are the fix: the client may edit its display fields and
-- nothing else. Every other write to public.users goes through the server.

revoke update on public.users from anon, authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;

-- Server-only tables. RLS with no policy already denies every row to these
-- roles; revoking the table grants as well means a future policy added by
-- mistake cannot expose an OTP hash or a rate-limit counter.
do $$
declare t text;
begin
  foreach t in array array[
    'verification_challenges','rate_limits','platform_admins',
    'admin_audit_logs','impersonation_sessions','webhook_events',
    'error_logs','platform_settings','coupons','qr_scans'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Financial records are read-only to a restaurant session: totals and gateway
-- state are written by the server from verified webhook payloads.
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.receipts from anon, authenticated;

-- Guests are never authenticated, so the anon role needs nothing in public.
-- The guest menu and ordering flow run entirely through server code.
revoke all on all tables in schema public from anon;
