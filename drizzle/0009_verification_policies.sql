-- Custom migration: RLS, triggers and housekeeping for account verification.

-- ── updated_at maintenance ─────────────────────────────────────────────────
drop trigger if exists touch_verification_challenges on public.verification_challenges;
create trigger touch_verification_challenges
  before update on public.verification_challenges
  for each row execute function public.touch_updated_at();

-- ── Row level security ─────────────────────────────────────────────────────
-- Both tables are written exclusively by the server. No policy is granted to
-- `authenticated`, so a leaked anon key cannot read a code hash, reset an
-- attempt counter, or clear a block.
alter table public.verification_challenges enable row level security;
alter table public.rate_limits enable row level security;

drop policy if exists "No client access to verification_challenges" on public.verification_challenges;
drop policy if exists "No client access to rate_limits" on public.rate_limits;

-- ── Housekeeping ───────────────────────────────────────────────────────────
-- Challenges expire by timestamp on read; this reclaims rows for accounts that
-- finished verification long ago, and stale limiter windows.
create or replace function public.purge_expired_verification()
returns void language sql security definer set search_path = public as $$
  delete from public.verification_challenges
   where consumed_at is not null and consumed_at < now() - interval '30 days';
  delete from public.rate_limits
   where window_started_at < now() - interval '1 day';
$$;

-- ── Mirror name and phone from auth metadata on signup ─────────────────────
-- Existing values win, so a verified phone is never overwritten by a later
-- metadata update.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, phone, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name),
        phone = coalesce(public.users.phone, excluded.phone),
        updated_at = now();
  return new;
end;
$$;
