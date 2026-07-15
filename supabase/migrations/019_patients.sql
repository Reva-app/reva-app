-- 019_patients.sql
-- REVA v2 — Fase 1: patiënt als aparte entiteit, los van auth.users
-- (masterplan §22 besluit 2, §13.3). Een patiëntdossier kan bestaan vóórdat
-- een patiënt portal-toegang heeft — user_id is daarom nullable.
--
-- Puur additief: raakt geen bestaande tabel, kolom of policy.

create table if not exists public.patients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id     uuid references public.locations(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  status          text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

create index if not exists patients_organization_id_idx on public.patients(organization_id);
create index if not exists patients_location_id_idx on public.patients(location_id);
create index if not exists patients_user_id_idx on public.patients(user_id);

create trigger set_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

alter table public.patients enable row level security;

-- Patiënt beheert eigen patiëntrecord (zodra user_id gezet is).
create policy "Patiënt beheert eigen patiëntrecord"
  on public.patients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Organisatieleden zien patiënten binnen hun eigen organisatie (verdere
-- rol-verfijning, bv. alleen eigen caseload voor een therapeut, volgt in
-- Fase 3 met patient_assignments — dit is de basis).
create policy "Organisatielid leest patiënten van eigen organisatie"
  on public.patients
  for select
  using (public.is_org_member(organization_id));

-- Platform admin ziet en beheert alles.
create policy "Platform admin beheert patiënten"
  on public.patients
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
