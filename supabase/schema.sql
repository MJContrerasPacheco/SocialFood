-- Schema additions for organizations and donation requests

create table if not exists public.organizations (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text check (role in ('comercio', 'ong', 'admin')),
  name text,
  contact_email text,
  telefono text,
  whatsapp text,
  address text,
  city text,
  region text,
  postal_code text,
  lat double precision,
  lng double precision,
  updated_at timestamp default now()
);

alter table public.organizations
  add column if not exists postal_code text;

create table if not exists public.organizations_public (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text,
  name text,
  city text,
  region text,
  lat double precision,
  lng double precision,
  updated_at timestamp default now()
);

create table if not exists public.donation_requests (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references public.donations(id) on delete cascade,
  ong_user_id uuid references public.users(id) on delete cascade,
  status text default 'requested',
  created_at timestamp default now(),
  unique (donation_id, ong_user_id)
);

create index if not exists donations_user_id_idx on public.donations (user_id);
create index if not exists organizations_role_idx on public.organizations (role);
create index if not exists donation_requests_ong_idx on public.donation_requests (ong_user_id);
create index if not exists donation_requests_donation_idx on public.donation_requests (donation_id);

create or replace function public.sync_organizations_public()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organizations_public (user_id, role, name, city, region, lat, lng, updated_at)
  values (
    new.user_id,
    new.role,
    new.name,
    new.city,
    new.region,
    new.lat,
    new.lng,
    now()
  )
  on conflict (user_id) do update
    set role = excluded.role,
        name = excluded.name,
        city = excluded.city,
        region = excluded.region,
        lat = excluded.lat,
        lng = excluded.lng,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_organizations_change on public.organizations;
create trigger on_organizations_change
after insert or update on public.organizations
for each row execute function public.sync_organizations_public();
