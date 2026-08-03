-- Custom migration: auth mirror, updated_at triggers, storage, RLS.

-- ── Mirror auth.users into public.users ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this migration.
insert into public.users (id, email, full_name, avatar_url)
select id,
       email,
       coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
       raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','businesses','business_settings','staff_members','restaurant_tables',
    'categories','menu_items','item_variants','orders','order_items',
    'payments','receipts'
  ]
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── Per-business order numbering ───────────────────────────────────────────
create or replace function public.next_order_number(p_business_id uuid)
returns integer language plpgsql as $$
declare n integer;
begin
  select coalesce(max(order_number), 0) + 1 into n
  from public.orders where business_id = p_business_id;
  return n;
end;
$$;

-- ── Storage ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true),
       ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "Owners write their assets" on storage.objects;
create policy "Owners write their assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('business-logos','menu-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update their assets" on storage.objects;
create policy "Owners update their assets"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('business-logos','menu-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Assets are publicly readable" on storage.objects;
create policy "Assets are publicly readable"
  on storage.objects for select to public
  using (bucket_id in ('business-logos','menu-images'));

-- ── Row level security ─────────────────────────────────────────────────────
-- Membership helper: owner, or active staff of the business.
create or replace function public.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from public.staff_members s
    where s.business_id = p_business_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and s.deleted_at is null
  );
$$;

alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.business_settings enable row level security;
alter table public.staff_members enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;

drop policy if exists "Users read themselves" on public.users;
create policy "Users read themselves" on public.users
  for select to authenticated using (id = auth.uid());

drop policy if exists "Users update themselves" on public.users;
create policy "Users update themselves" on public.users
  for update to authenticated using (id = auth.uid());

drop policy if exists "Owners manage their business" on public.businesses;
create policy "Owners manage their business" on public.businesses
  for all to authenticated
  using (owner_id = auth.uid() or public.is_business_member(id))
  with check (owner_id = auth.uid());

-- Every business-owned table shares the same membership rule.
do $$
declare t text;
begin
  foreach t in array array[
    'business_settings','staff_members','restaurant_tables','categories',
    'menu_items','item_variants','orders','order_items','payments','receipts'
  ]
  loop
    execute format('drop policy if exists "Members manage %1$s" on public.%1$I', t);
    execute format(
      'create policy "Members manage %1$s" on public.%1$I
         for all to authenticated
         using (public.is_business_member(business_id))
         with check (public.is_business_member(business_id))', t);
  end loop;
end $$;
