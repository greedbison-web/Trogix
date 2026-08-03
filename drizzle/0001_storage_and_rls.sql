-- Run in the Supabase SQL editor after the generated migration.

-- Public bucket for business logos.
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Owners may manage only their own folder (path prefix = auth.uid()).
create policy "Owners upload their logo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners update their logo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Logos are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'business-logos');

-- Businesses are owned rows.
alter table businesses enable row level security;

create policy "Owners read their business"
  on businesses for select to authenticated
  using (owner_id = auth.uid());

create policy "Owners insert their business"
  on businesses for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners update their business"
  on businesses for update to authenticated
  using (owner_id = auth.uid());
