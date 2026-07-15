-- 016_roles_and_permissions.sql
-- REVA v2 — Fase 0: data-gedreven RBAC-fundament.
--
-- Rollen en permissies zijn data, geen code — nieuwe rollen/permissies kunnen
-- later als rijen worden toegevoegd, zonder schemawijziging. Zie
-- docs/REVA-V2-MASTERPLAN.md §5.
--
-- `permissions` en `role_permissions` blijven bewust leeg tot Fase 3
-- (Practice Portal kern), wanneer echte permissie-checks nodig zijn — een
-- permissiematrix nu al invullen zou giswerk zijn zonder een concrete
-- consument.
--
-- `patient` staat bewust NIET in deze rollenlijst: patiënttoegang loopt niet
-- via `memberships`/`roles`, maar via `patients.user_id` (zie
-- docs/REVA-V2-MASTERPLAN.md §4.4 en §13.3) — dat model komt in Fase 1.
-- `super_admin` staat er wel in als referentie/documentatie, maar wordt in de
-- praktijk niet via `memberships` toegekend — dat loopt via `platform_admins`
-- (migratie 015).
--
-- Puur additief: raakt geen bestaande tabel, kolom of policy.

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  scope       text not null check (scope in ('platform', 'organization', 'location')),
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id            bigserial primary key,
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (role_id, permission_id)
);

create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);

create trigger set_roles_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- RLS: rollen/permissies zijn referentiedata, niet gevoelig — leesbaar voor
-- elke ingelogde gebruiker. Schrijven kan uitsluitend via service_role (geen
-- insert/update/delete-policy voor gewone gebruikers).
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

create policy "Ingelogde gebruikers lezen rollen"
  on public.roles for select
  using (auth.role() = 'authenticated');

create policy "Ingelogde gebruikers lezen permissies"
  on public.permissions for select
  using (auth.role() = 'authenticated');

create policy "Ingelogde gebruikers lezen role_permissions"
  on public.role_permissions for select
  using (auth.role() = 'authenticated');

-- Systeemrollen zaaien (idempotent op basis van de unieke `key`).
insert into public.roles (key, name, scope, is_system) values
  ('super_admin',        'Super Admin',          'platform',     true),
  ('organization_owner', 'Organization Owner',   'organization', true),
  ('organization_admin', 'Organization Admin',   'organization', true),
  ('finance',            'Finance',              'organization', true),
  ('location_manager',   'Location Manager',     'location',     true),
  ('therapist',          'Therapeut',            'location',     true),
  ('assistant',          'Assistant',            'location',     true),
  ('reception',          'Reception',            'location',     true)
on conflict (key) do nothing;
