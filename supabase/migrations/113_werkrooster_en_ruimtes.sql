-- 113_werkrooster_en_ruimtes.sql
-- Fundament voor het ruimtereserveringssysteem.
--
-- Werkrooster: er bestaat al een volledig werkend "Werkuren"-systeem
-- (work_schedules, migratie 041, gebruikt door MedewerkerDetail.tsx) — maar
-- dat is één rooster per medewerker, ongeacht locatie. De gebruiker wil
-- expliciet een rooster per fysio PER locatie (iemand kan op maandag op
-- locatie A werken en op dinsdag op locatie B). In plaats van een tweede,
-- verwarrende "werkrooster"-tabel ernaast te zetten, breidt deze migratie
-- work_schedules uit met location_id: bestaande rijen worden bij de
-- hoofdlocatie van de medewerker gezet (memberships.location_id), nieuwe
-- rijen worden voortaan altijd expliciet per locatie vastgelegd.
--
-- Ruimtes: nieuwe, eenvoudige entiteit per locatie.

alter table public.work_schedules
  add column if not exists location_id uuid references public.locations(id) on delete cascade;

-- Backfill in twee stappen: (1) de hoofdlocatie van de medewerker zelf indien
-- gezet, (2) anders de enige locatie van de organisatie, als die er maar één
-- heeft (de praktische realiteit voor de meeste organisaties nu). Alleen als
-- geen van beide een locatie oplevert (organisatie met 0 of 2+ locaties en
-- geen hoofdlocatie op de medewerker) blijft de rij onopgelost.
with org_single_location as (
  select organization_id, (array_agg(id))[1] as location_id
  from public.locations
  group by organization_id
  having count(*) = 1
)
update public.work_schedules ws
set location_id = coalesce(m.location_id, osl.location_id)
from public.memberships m
left join org_single_location osl on osl.organization_id = m.organization_id
where ws.membership_id = m.id
  and ws.location_id is null;

-- Rijen die na bovenstaande stap nog steeds geen locatie hebben, horen bij
-- een organisatie met meerdere locaties waar nooit is vastgelegd waar de
-- medewerker werkt — die kunnen niet zinvol geraden worden en worden
-- opgeschoond (de medewerker kan het werkrooster opnieuw instellen, nu per
-- locatie).
delete from public.work_schedules where location_id is null;

alter table public.work_schedules
  alter column location_id set not null;

alter table public.work_schedules
  drop constraint if exists work_schedules_membership_id_weekday_key;

alter table public.work_schedules
  add constraint work_schedules_membership_weekday_location_key unique (membership_id, weekday, location_id);

create table if not exists public.location_rooms (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.location_rooms enable row level security;

create policy "Organisatielid leest ruimtes van eigen locaties"
  on public.location_rooms for select
  using (
    exists (
      select 1 from public.locations l
      where l.id = location_id and public.is_org_member(l.organization_id)
    )
  );

create policy "Locatiebeheerder beheert ruimtes"
  on public.location_rooms for all
  using (
    exists (
      select 1 from public.locations l
      where l.id = location_id and public.can_manage_org_locations(l.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.locations l
      where l.id = location_id and public.can_manage_org_locations(l.organization_id)
    )
  );

create trigger set_location_rooms_updated_at
  before update on public.location_rooms
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
