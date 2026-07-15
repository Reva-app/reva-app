-- 017_organizations_and_locations.sql
-- REVA v2 — Fase 0: kern van de multi-tenant hiërarchie
-- (Platform → Organization → Location). Zie docs/REVA-V2-MASTERPLAN.md §4 en §13.
--
-- RLS in dit bestand geeft alleen platform admins toegang. Zodra `memberships`
-- bestaat (migratie 018) komt daar een tweede, additieve select-policy bij
-- voor organisatieleden — Postgres OR't meerdere permissive policies voor
-- dezelfde command, dus dit is geen vervanging maar een uitbreiding.
--
-- Puur additief: raakt geen bestaande tabel, kolom of policy.

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.locations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  status          text not null default 'active' check (status in ('active', 'suspended')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists locations_organization_id_idx on public.locations(organization_id);

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_locations_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.locations enable row level security;

create policy "Platform admin beheert organisaties"
  on public.organizations
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admin beheert vestigingen"
  on public.locations
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
