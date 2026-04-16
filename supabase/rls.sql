-- RLS policies for SocialFood (users/donations schema)

drop policy if exists "users_select_self" on public.users;
drop policy if exists "users_select_admin" on public.users;
drop policy if exists "users_insert_self" on public.users;
drop policy if exists "users_update_self" on public.users;
drop policy if exists "users_update_admin" on public.users;

drop policy if exists "donations_select_comercio" on public.donations;
drop policy if exists "donations_select_ong" on public.donations;
drop policy if exists "donations_select_admin" on public.donations;
drop policy if exists "donations_insert_comercio" on public.donations;
drop policy if exists "donations_update_comercio" on public.donations;
drop policy if exists "donations_update_ong_request" on public.donations;
drop policy if exists "donations_update_ong_collect" on public.donations;
drop policy if exists "donations_update_admin" on public.donations;
drop policy if exists "donations_delete_comercio" on public.donations;

drop policy if exists "organizations_select_self" on public.organizations;
drop policy if exists "organizations_select_admin" on public.organizations;
drop policy if exists "organizations_select_ong_requested" on public.organizations;
drop policy if exists "organizations_insert_self" on public.organizations;
drop policy if exists "organizations_update_self" on public.organizations;
drop policy if exists "organizations_update_admin" on public.organizations;

drop policy if exists "org_public_select_all" on public.organizations_public;

drop policy if exists "donation_requests_select_ong" on public.donation_requests;
drop policy if exists "donation_requests_insert_ong" on public.donation_requests;

drop policy if exists "donation_certificates_select_public" on public.donation_certificates;
drop policy if exists "donation_certificates_select_related" on public.donation_certificates;
drop policy if exists "donation_certificates_insert_ong" on public.donation_certificates;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();
drop function if exists public.is_admin();

alter table public.users enable row level security;
alter table public.donations enable row level security;
alter table public.organizations enable row level security;
alter table public.organizations_public enable row level security;
alter table public.donation_requests enable row level security;
alter table public.donation_certificates enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

-- Users
create policy "users_select_self" on public.users
for select
using (id = auth.uid());

create policy "users_select_admin" on public.users
for select
using (public.is_admin());

create policy "users_insert_self" on public.users
for insert
with check (
  id = auth.uid()
  and role in ('comercio', 'ong')
);

create policy "users_update_self" on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "users_update_admin" on public.users
for update
using (public.is_admin())
with check (public.is_admin());

-- Donations
create policy "donations_select_comercio" on public.donations
for select
using (user_id = auth.uid());

create policy "donations_select_ong" on public.donations
for select
using (
  status = 'available'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'ong'
  )
);

create policy "donations_select_ong_requested" on public.donations
for select
using (
  exists (
    select 1
    from public.donation_requests r
    where r.donation_id = donations.id
      and r.ong_user_id = auth.uid()
  )
);

create policy "donations_select_admin" on public.donations
for select
using (public.is_admin());

create policy "donations_insert_comercio" on public.donations
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'comercio'
  )
);

create policy "donations_update_comercio" on public.donations
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "donations_update_ong_request" on public.donations
for update
using (
  status = 'available'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'ong'
  )
)
with check (status = 'pending');

create policy "donations_update_ong_collect" on public.donations
for update
using (
  status = 'pending'
  and exists (
    select 1
    from public.donation_requests r
    where r.donation_id = donations.id
      and r.ong_user_id = auth.uid()
  )
)
with check (
  status = 'collected'
  and collected_at is not null
);

create policy "donations_update_admin" on public.donations
for update
using (public.is_admin())
with check (public.is_admin());

create policy "donations_delete_comercio" on public.donations
for delete
using (user_id = auth.uid() and status = 'available');

-- Organizations (full contact)
create policy "organizations_select_self" on public.organizations
for select
using (user_id = auth.uid());

create policy "organizations_select_admin" on public.organizations
for select
using (public.is_admin());

create policy "organizations_select_ong_requested" on public.organizations
for select
using (
  exists (
    select 1
    from public.donation_requests r
    join public.donations d on d.id = r.donation_id
    where r.ong_user_id = auth.uid()
      and d.user_id = organizations.user_id
  )
);

create policy "organizations_insert_self" on public.organizations
for insert
with check (user_id = auth.uid());

create policy "organizations_update_self" on public.organizations
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "organizations_update_admin" on public.organizations
for update
using (public.is_admin())
with check (public.is_admin());

-- Organizations public (safe fields)
create policy "org_public_select_all" on public.organizations_public
for select
using (auth.uid() is not null);

-- Donation requests
create policy "donation_requests_select_ong" on public.donation_requests
for select
using (ong_user_id = auth.uid());

create policy "donation_requests_insert_ong" on public.donation_requests
for insert
with check (ong_user_id = auth.uid());

-- Donation certificates (verification records)
create policy "donation_certificates_select_related" on public.donation_certificates
for select
using (
  auth.uid() = commerce_user_id
  or auth.uid() = ong_user_id
  or public.is_admin()
);

create policy "donation_certificates_insert_ong" on public.donation_certificates
for insert
with check (
  ong_user_id = auth.uid()
  and exists (
    select 1
    from public.donation_requests r
    where r.donation_id = donation_certificates.donation_id
      and r.ong_user_id = auth.uid()
  )
);

-- Storage: signatures bucket (owner-only)
drop policy if exists "signatures_insert_own" on storage.objects;
drop policy if exists "signatures_select_own" on storage.objects;
drop policy if exists "signatures_update_own" on storage.objects;
drop policy if exists "signatures_delete_own" on storage.objects;

create policy "signatures_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'signatures' and owner = auth.uid());

create policy "signatures_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'signatures' and owner = auth.uid());

create policy "signatures_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'signatures' and owner = auth.uid())
with check (bucket_id = 'signatures' and owner = auth.uid());

create policy "signatures_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'signatures' and owner = auth.uid());

-- Auto-create profile from auth.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  user_role := new.raw_user_meta_data->>'role';
  if user_role not in ('comercio', 'ong', 'admin') then
    user_role := 'comercio';
  end if;

  insert into public.users (id, email, role, name, plan_tier)
  values (
    new.id,
    new.email,
    user_role,
    new.raw_user_meta_data->>'name',
    'free'
  )
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        name = excluded.name;

  insert into public.organizations (user_id, role, name, contact_email)
  values (
    new.id,
    user_role,
    new.raw_user_meta_data->>'name',
    new.email
  )
  on conflict (user_id) do update
    set role = excluded.role,
        name = excluded.name,
        contact_email = excluded.contact_email,
        updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
