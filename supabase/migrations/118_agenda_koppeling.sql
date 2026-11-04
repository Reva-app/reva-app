-- 118_agenda_koppeling.sql
-- Alleen-lezen koppeling met de persoonlijke agenda van een fysio (iCal-feed
-- URL, bv. Google Calendar's "geheime adres in iCal-indeling"). De app haalt
-- deze op en leest 'm uit, nooit terugschrijven. Eén feed per medewerker.
--
-- Zelf-service RLS (mirrort work_schedules, migratie 041): dit is een
-- persoonlijke link van de fysio zelf, geen praktijkbrede structuur zoals
-- verlof (migratie 117) — vandaar bewust WEL de "of de medewerker zelf"-
-- uitzondering, in tegenstelling tot staff_leave.

create table if not exists public.staff_calendar_feeds (
  id              uuid primary key default gen_random_uuid(),
  membership_id   uuid not null unique references public.memberships(id) on delete cascade,
  ics_url         text not null,
  last_synced_at  timestamptz,
  last_sync_error text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger set_staff_calendar_feeds_updated_at
  before update on public.staff_calendar_feeds
  for each row execute function public.set_updated_at();

alter table public.staff_calendar_feeds enable row level security;

create policy "Organisatielid leest agenda-koppelingen van collega's"
  on public.staff_calendar_feeds for select
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and public.is_org_member(m.organization_id)
    )
  );

create policy "Practice owner of medewerker zelf beheert agenda-koppeling"
  on public.staff_calendar_feeds for all
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id
        and (public.can_manage_org_staff(m.organization_id) or m.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id
        and (public.can_manage_org_staff(m.organization_id) or m.user_id = auth.uid())
    )
  );

notify pgrst, 'reload schema';
