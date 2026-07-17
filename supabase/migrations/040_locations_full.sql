-- 040_locations_full.sql
-- Fase 4 vervolg: vestigingen groeien van een kale naam+plaats-tabel naar
-- een volwaardige module — adres, contactgegevens, openingstijden, een
-- hoofdvestiging-concept, een abonnement-gedreven limiet, en archiveren
-- (reversibel) vs. verwijderen (alleen zonder gekoppelde data).

-- ── 1. Nieuwe kolommen op locations ──────────────────────────────────────────

alter table public.locations
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists street text,
  add column if not exists house_number text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'Nederland',
  add column if not exists is_main_location boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists opening_hours jsonb not null default '{
    "monday":    {"open": false, "from": "09:00", "to": "17:00"},
    "tuesday":   {"open": false, "from": "09:00", "to": "17:00"},
    "wednesday": {"open": false, "from": "09:00", "to": "17:00"},
    "thursday":  {"open": false, "from": "09:00", "to": "17:00"},
    "friday":    {"open": false, "from": "09:00", "to": "17:00"},
    "saturday":  {"open": false, "from": "09:00", "to": "17:00"},
    "sunday":    {"open": false, "from": "09:00", "to": "17:00"}
  }'::jsonb;

-- ── 2. Hoofdvestiging-invariant: exact één per organisatie ─────────────────

create unique index if not exists locations_one_main_per_org
  on public.locations (organization_id)
  where is_main_location;

-- Backfill: markeer de oudste bestaande vestiging per organisatie als
-- hoofdvestiging (dekt Fysio Cura Plaza's 5 vestigingen en elke andere
-- organisatie in één keer).
with first_per_org as (
  select distinct on (organization_id) id
  from public.locations
  order by organization_id, created_at asc
)
update public.locations
set is_main_location = true
where id in (select id from first_per_org);

-- ── 3. Rolgate: alleen eigenaar/beheerder beheert vestigingen ──────────────
-- Zelfde patroon als can_manage_org_branding (038) — vestigingenbeheer is
-- een organisatiebrede structurele beslissing, geen dagelijkse
-- patiëntenzorg-taak.

create or replace function public.can_manage_org_locations(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.memberships m
      join public.roles r on r.id = m.role_id
      where m.organization_id = org_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and r.key in ('organization_owner', 'organization_admin')
    );
$$;

grant execute on function public.can_manage_org_locations(uuid) to authenticated;

-- ── 4. set_main_location RPC ────────────────────────────────────────────────
-- Twee sequentiële UPDATEs binnen één functie-aanroep — de partial unique
-- index ziet zo nooit twee true-rijen tegelijk.

create or replace function public.set_main_location(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from public.locations
  where id = p_location_id and not archived;

  if v_org_id is null then
    raise exception 'Vestiging niet gevonden of gearchiveerd';
  end if;

  if not public.can_manage_org_locations(v_org_id) then
    raise exception 'Geen toegang';
  end if;

  update public.locations set is_main_location = false
  where organization_id = v_org_id and is_main_location = true;

  update public.locations set is_main_location = true
  where id = p_location_id;
end;
$$;

grant execute on function public.set_main_location(uuid) to authenticated;

-- ── 5. Eerste vestiging wordt automatisch hoofdvestiging ───────────────────

create or replace function public.set_first_location_as_main()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.locations where organization_id = new.organization_id
  ) then
    new.is_main_location := true;
  end if;
  return new;
end;
$$;

create trigger locations_set_first_as_main
  before insert on public.locations
  for each row
  execute function public.set_first_location_as_main();

-- ── 6. Hoofdvestiging mag niet gearchiveerd/verwijderd worden zolang er ────
--     andere vestigingen bestaan — voorkomt dat de invariant "er is altijd
--     precies één hoofdvestiging" stilzwijgend geschonden wordt.

create or replace function public.block_archive_main_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived = true and old.is_main_location = true then
    raise exception 'Wijs eerst een andere vestiging aan als hoofdvestiging voordat je deze archiveert';
  end if;
  return new;
end;
$$;

create trigger locations_block_archive_main
  before update on public.locations
  for each row
  when (new.archived is distinct from old.archived)
  execute function public.block_archive_main_location();

create or replace function public.block_delete_main_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_main_location = true and exists (
    select 1 from public.locations
    where organization_id = old.organization_id
      and id <> old.id
      and not archived
  ) then
    raise exception 'Wijs eerst een andere vestiging aan als hoofdvestiging voordat je deze verwijdert';
  end if;
  return old;
end;
$$;

create trigger locations_block_delete_main
  before delete on public.locations
  for each row
  execute function public.block_delete_main_location();

-- ── 7. Abonnement-gedreven limiet ───────────────────────────────────────────
-- Ruime standaardwaarde zodat geen bestaande organisatie meteen geblokkeerd
-- raakt; wordt later het echte, platform-admin-beheerde abonnementsveld.

alter table public.organizations
  add column if not exists max_locations integer not null default 10;

create or replace function public.check_location_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_current integer;
begin
  select max_locations into v_max
  from public.organizations where id = new.organization_id;

  select count(*) into v_current
  from public.locations
  where organization_id = new.organization_id and not archived;

  if v_current >= v_max then
    raise exception 'Maximum aantal vestigingen bereikt voor deze organisatie (%)', v_max;
  end if;

  return new;
end;
$$;

create trigger locations_check_capacity
  before insert on public.locations
  for each row
  execute function public.check_location_capacity();

-- ── 8. RLS: bestaande "elk actief lid"-policies vervangen door de nieuwe ───
--     rolgate; SELECT blijft ongewijzigd (elk actief lid ziet vestigingen).
--     Nieuw: een DELETE-policy bestond nog helemaal niet (alleen platform
--     admin kon voorheen verwijderen).

drop policy if exists "Organisatielid maakt vestigingen aan binnen eigen organisatie" on public.locations;
drop policy if exists "Organisatielid werkt vestigingen bij binnen eigen organisatie" on public.locations;

create policy "Eigenaar/beheerder maakt vestigingen aan"
  on public.locations for insert
  with check (public.can_manage_org_locations(organization_id));

create policy "Eigenaar/beheerder werkt vestigingen bij"
  on public.locations for update
  using (public.can_manage_org_locations(organization_id))
  with check (public.can_manage_org_locations(organization_id));

create policy "Eigenaar/beheerder verwijdert vestigingen"
  on public.locations for delete
  using (public.can_manage_org_locations(organization_id));

-- ── 9. Verwijderen alleen zonder gekoppelde medewerkers/patiënten ──────────
-- Van impliciet ON DELETE SET NULL naar ON DELETE RESTRICT — zelfde patroon
-- als memberships.role_id al gebruikt. De app doet daarnaast een pre-check
-- voor een vriendelijke Nederlandse melding i.p.v. een rauwe FK-fout.

alter table public.patients
  drop constraint if exists patients_location_id_fkey,
  add constraint patients_location_id_fkey
    foreign key (location_id) references public.locations(id) on delete restrict;

alter table public.memberships
  drop constraint if exists memberships_location_id_fkey,
  add constraint memberships_location_id_fkey
    foreign key (location_id) references public.locations(id) on delete restrict;

notify pgrst, 'reload schema';
