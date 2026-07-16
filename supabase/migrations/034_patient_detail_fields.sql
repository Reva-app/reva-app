-- 034_patient_detail_fields.sql
-- Fase 3 vervolg: uitgebreide patiëntintake vanuit de Practice Portal
-- (basisgegevens, behandeltraject) + rolgebonden rechten op wie patiënten
-- mag beheren.
--
-- Rolgebonden beheerrecht: tot nu toe mocht ELK actief organisatielid
-- patiënten aanmaken/bijwerken (migratie 031). De praktijk wil dit nu
-- expliciet vasthangen aan een rol. Bewust geen generieke, database-
-- configureerbare role_permissions-koppeling (dat systeem staat nog
-- helemaal leeg) — in plaats daarvan een hardcoded allowlist in één
-- SECURITY DEFINER-functie. Reden: dat is precies voldoende voor wat nu
-- gevraagd wordt, blijft eenvoudig te lezen, en is op elk gewenst moment
-- te vervangen door een echte role_permissions-lookup zonder dat
-- aanroepende code (RLS-policies, frontend) hoeft te veranderen.
--
-- Gekozen rollen die patiënten mogen beheren: organization_owner,
-- organization_admin, location_manager, therapist, reception (front-
-- desk doet doorgaans de intake). Uitgesloten: assistant, finance — geen
-- voor de hand liggende reden voor die rollen om patiëntdossiers te
-- beheren. Dit is een pragmatische keuze, makkelijk aan te passen.

create or replace function public.can_manage_org_patients(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and r.key in ('organization_owner', 'organization_admin', 'location_manager', 'therapist', 'reception')
  );
$$;

-- ── Protocollen (lichte catalogus, geen volledige Protocol Engine — dat is
--    Fase 5). Elke organisatie beheert haar eigen lijstje protocolnamen. ────

create table if not exists public.protocols (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists protocols_organization_id_idx on public.protocols(organization_id);

alter table public.protocols enable row level security;

create policy "Organisatielid leest protocollen van eigen organisatie"
  on public.protocols for select
  using (public.is_org_member(organization_id));

create policy "Bevoegd organisatielid beheert protocollen"
  on public.protocols for all
  using (public.can_manage_org_patients(organization_id))
  with check (public.can_manage_org_patients(organization_id));

-- ── Uitgebreide patiëntgegevens ─────────────────────────────────────────────

alter table public.patients
  add column if not exists gender text,
  add column if not exists assigned_therapist_id uuid references auth.users(id) on delete set null,
  add column if not exists protocol_id uuid references public.protocols(id) on delete set null,
  add column if not exists treatment_start_date date,
  add column if not exists surgery_date date;

alter table public.patients drop constraint if exists patients_gender_check;
alter table public.patients
  add constraint patients_gender_check check (gender is null or gender in ('man', 'vrouw', 'anders'));

-- ── RLS: schrijfrechten patients gaan van "elk organisatielid" naar
--    "bevoegd organisatielid" (rolgebonden) ─────────────────────────────────

drop policy if exists "Organisatielid maakt patiënten aan binnen eigen organisatie" on public.patients;
drop policy if exists "Organisatielid werkt patiënten bij binnen eigen organisatie" on public.patients;

create policy "Bevoegd organisatielid maakt patiënten aan"
  on public.patients for insert
  with check (public.can_manage_org_patients(organization_id));

create policy "Bevoegd organisatielid werkt patiënten bij"
  on public.patients for update
  using (public.can_manage_org_patients(organization_id))
  with check (public.can_manage_org_patients(organization_id));

create policy "Bevoegd organisatielid verwijdert patiënten"
  on public.patients for delete
  using (public.can_manage_org_patients(organization_id));
