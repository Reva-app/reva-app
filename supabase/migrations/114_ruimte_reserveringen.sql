-- 114_ruimte_reserveringen.sql
-- Tijdvak-reserveringen per ruimte. De exclude-constraint voorkomt op
-- databaseniveau dat dezelfde ruimte twee overlappende reserveringen
-- krijgt (geen race conditions, geen losse app-side check nodig voor de
-- kern van de garantie — een vriendelijke foutmelding bij conflict blijft
-- wel nodig, zelfde patroon als de FK-violation-afvang bij
-- deleteOrgExercise/deleteScheduleLibraryItem).

create extension if not exists btree_gist;

create table if not exists public.room_reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.location_rooms(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'ai_suggested')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_reservations_valid_range check (ends_at > starts_at),
  exclude using gist (room_id with =, tstzrange(starts_at, ends_at) with &&)
);

alter table public.room_reservations enable row level security;

create policy "Organisatielid leest reserveringen van eigen locaties"
  on public.room_reservations for select
  using (
    exists (
      select 1 from public.location_rooms r
      join public.locations l on l.id = r.location_id
      where r.id = room_id and public.is_org_member(l.organization_id)
    )
  );

create policy "Organisatielid beheert reserveringen van eigen locaties"
  on public.room_reservations for all
  using (
    exists (
      select 1 from public.location_rooms r
      join public.locations l on l.id = r.location_id
      where r.id = room_id and public.is_org_member(l.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.location_rooms r
      join public.locations l on l.id = r.location_id
      where r.id = room_id and public.is_org_member(l.organization_id)
    )
  );

create trigger set_room_reservations_updated_at
  before update on public.room_reservations
  for each row execute function public.set_updated_at();

create index if not exists room_reservations_room_time_idx on public.room_reservations (room_id, starts_at);

notify pgrst, 'reload schema';
