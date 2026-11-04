-- 117_verlof_en_weekplanning.sql
-- Verlof/afwezigheid per medewerker (vakantie, vrije dag, ziek, overig) —
-- ontbrak volledig; zonder deze data kan het weekrooster niet "rondkomen"
-- en zou de AI-suggestie (roomSuggestionService.ts) een fysio nog steeds
-- inplannen op een dag dat diegene er niet is. Hele dagen, geen tijdvakken
-- (net als isOff op work_schedules — geen precedent voor halve dagen).
--
-- Ook: een ongebruikte appointment_id-kolom op room_reservations, puur als
-- toekomstvastheid — zodat een latere koppeling tussen een patiëntafspraak
-- en een ruimtereservering geen nieuwe tabel/migratie vereist. Wordt door
-- geen enkele huidige UI gebruikt of ingevuld.

create table if not exists public.staff_leave (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  starts_on     date not null,
  ends_on       date not null,
  leave_type    text not null default 'vakantie' check (leave_type in ('vakantie', 'vrije_dag', 'ziek', 'overig')),
  note          text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists staff_leave_membership_id_idx on public.staff_leave(membership_id);
create index if not exists staff_leave_range_idx on public.staff_leave(starts_on, ends_on);

create trigger set_staff_leave_updated_at
  before update on public.staff_leave
  for each row execute function public.set_updated_at();

alter table public.staff_leave enable row level security;

-- Zelfde SELECT-breedte als work_schedules (migratie 041) — elk org-lid
-- leest verlof van collega's, nodig voor de weekweergave en de
-- AI-suggestie-engine.
create policy "Organisatielid leest verlof van collega's"
  on public.staff_leave for select
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.is_org_member(m.organization_id)
    )
  );

-- Bewust ZONDER de "of de medewerker zelf"-uitzondering die work_schedules
-- wel heeft — verlof is deze keer alleen door de praktijkeigenaar te
-- beheren (expliciete gebruikerskeuze), geen zelf-service door de fysio.
create policy "Practice owner beheert verlof"
  on public.staff_leave for all
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.can_manage_org_staff(m.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.can_manage_org_staff(m.organization_id)
    )
  );

alter table public.room_reservations
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null;

notify pgrst, 'reload schema';
