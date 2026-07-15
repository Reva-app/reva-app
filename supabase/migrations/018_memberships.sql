-- 018_memberships.sql
-- REVA v2 — Fase 0: koppelt gebruikers aan organisaties (+ optioneel
-- vestiging) met een rol. Eén gebruiker kan meerdere memberships hebben
-- (bv. een therapeut die bij twee praktijken werkt). Zie
-- docs/REVA-V2-MASTERPLAN.md §4/§5.
--
-- Laatste migratie van Fase 0: voegt ook de organisatieleden-select-policies
-- toe aan `organizations`/`locations` (migratie 017) als aanvullende,
-- niet-vervangende policies.
--
-- Puur additief: raakt geen bestaande tabel, kolom of policy.

create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id     uuid references public.locations(id) on delete set null,
  role_id         uuid not null references public.roles(id) on delete restrict,
  status          text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_organization_id_idx on public.memberships(organization_id);
create index if not exists memberships_location_id_idx on public.memberships(location_id);

create trigger set_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- Herbruikbare RLS-helper: heeft de huidige gebruiker een actieve membership
-- bij deze organisatie? security definer om dezelfde reden als
-- is_platform_admin() in migratie 015.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.memberships enable row level security;

-- Gebruiker leest/beheert zijn eigen memberships (bv. een uitnodiging
-- accepteren zet status van 'invited' naar 'active'); platform admin ziet
-- alles. Uitnodigen (insert van een membership voor een ándere gebruiker)
-- door een Organization Owner/Admin is functionaliteit van Fase 3 — daar komt
-- dan een aanvullende policy bij; deze migratie regelt alleen de basis.
create policy "Gebruiker beheert eigen memberships"
  on public.memberships
  for all
  using (auth.uid() = user_id or public.is_platform_admin())
  with check (auth.uid() = user_id or public.is_platform_admin());

-- Aanvullende select-policies op organizations/locations (migratie 017):
-- organisatieleden mogen hun eigen organisatie en de vestigingen daarbinnen
-- zien. Additief naast de platform-admin-policy uit 017 — Postgres OR't
-- meerdere permissive policies voor dezelfde command.
create policy "Organisatielid leest eigen organisatie"
  on public.organizations
  for select
  using (public.is_org_member(id));

create policy "Organisatielid leest vestigingen van eigen organisatie"
  on public.locations
  for select
  using (public.is_org_member(organization_id));

notify pgrst, 'reload schema';
