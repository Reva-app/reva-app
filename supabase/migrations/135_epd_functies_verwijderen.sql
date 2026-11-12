-- 135_epd_functies_verwijderen.sql
-- REVA wordt een Recovery Management Platform naast het EPD (november 2026).
--
-- Agenda, ruimtes, reserveringen, werkroosters, verlof en agenda-koppelingen
-- horen in het EPD van de praktijk: dubbel invoeren in REVA kost de praktijk
-- tijd en levert verschillen op. De code die deze tabellen gebruikte is al
-- verwijderd (branch feature/rmp-focus-2fa). Draai deze migratie pas NADAT
-- die code live staat — anders geeft de oude versie foutmeldingen.
--
-- Verdwijnt:
--   - tabellen room_reservations, location_rooms, staff_leave,
--     staff_calendar_feeds, work_schedules (met hun policies en triggers)
--   - kolom locations.opening_hours
--   - RPC's portal_room_occupancy_stats en portal_org_agenda
--   - de receptie-rol als keuze (rij blijft bestaan vanwege een oude,
--     geaccepteerde uitnodiging; toekennen wordt geblokkeerd)
--
-- Blijft: afspraken die de patiënt zelf invoert (appointments) — dat is
-- herstelinformatie van de patiënt, geen praktijkagenda.
--
-- Let op: onomkeerbaar. Live stonden er op 2026-11-12: 7 werkroosters,
-- 3 ruimtes, 3 reserveringen, 1 agenda-koppeling en 0 verlofregels.

begin;

-- ── 1. Veiligheidscheck: geen actieve medewerkers met een vervallen rol ────
do $$
begin
  if exists (
    select 1 from public.memberships m
    join public.roles r on r.id = m.role_id
    where r.key in ('reception', 'practice_staff') and m.status = 'active'
  ) then
    raise exception 'Er zijn nog actieve medewerkers met de rol Receptie/Praktijkmedewerker. Geef hen eerst een andere rol.';
  end if;
end $$;

-- ── 2. portal_quality_stats zonder ruimtereserveringen ──────────────────────
-- Zelfde uitkomst als migratie 115, minus aiRoomSuggestionsTakenCount.
create or replace function public.portal_quality_stats(p_organization_id uuid, p_period_days int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := date_trunc('day', now()) - (p_period_days || ' days')::interval;
  v_patient_ids uuid[];
  v_completed_phases int;
  v_completed_phases_with_checkin int;
  v_ai_intake_count int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object(
      'completedPhasesCount', 0, 'completedPhasesWithCheckinCount', 0, 'aiIntakeCount', 0
    );
  end if;

  select coalesce(array_agg(id), array[]::uuid[]) into v_patient_ids
  from public.patients where organization_id = p_organization_id;

  select
    count(*),
    count(*) filter (
      where pp.transition_pain_score is not null or pp.transition_mobility_score is not null
        or pp.transition_swelling is not null or pp.transition_satisfaction_score is not null
        or pp.transition_progress_vs_expected is not null or pp.transition_note is not null
    )
    into v_completed_phases, v_completed_phases_with_checkin
  from public.patient_protocol_phases pp
  join public.patient_protocols ppr on ppr.id = pp.patient_protocol_id
  where ppr.patient_id = any(v_patient_ids)
    and pp.status = 'completed'
    and pp.completed_at >= v_period_start;

  select count(*) into v_ai_intake_count
  from public.patient_intakes
  where patient_id = any(v_patient_ids) and created_at >= v_period_start;

  return jsonb_build_object(
    'completedPhasesCount', v_completed_phases,
    'completedPhasesWithCheckinCount', v_completed_phases_with_checkin,
    'aiIntakeCount', v_ai_intake_count
  );
end;
$$;

revoke execute on function public.portal_quality_stats(uuid, int) from public, anon;
grant execute on function public.portal_quality_stats(uuid, int) to authenticated;

-- ── 3. RPC's die alleen de agenda/ruimtes bedienden ─────────────────────────
drop function if exists public.portal_room_occupancy_stats(uuid, int);
drop function if exists public.portal_org_agenda(uuid, date, date);

-- ── 4. Tabellen (afhankelijke eerst) ────────────────────────────────────────
-- Bewust zonder CASCADE: hangt er onverwacht nog iets aan, dan stopt de
-- migratie in plaats van stilletjes meer weg te halen.
drop table if exists public.room_reservations;
drop table if exists public.location_rooms;
drop table if exists public.staff_leave;
drop table if exists public.staff_calendar_feeds;
drop table if exists public.work_schedules;

alter table public.locations drop column if exists opening_hours;

-- ── 5. Receptie-rol niet meer toekennen ─────────────────────────────────────
update public.roles set name = 'Receptie (vervallen)' where key = 'reception';

create or replace function public.block_retired_roles()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.roles where id = new.role_id and key in ('reception', 'practice_staff')) then
    raise exception 'Deze rol is vervallen. Kies Fysiotherapeut of Practice Owner.';
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_block_retired_roles on public.memberships;
create trigger memberships_block_retired_roles
  before insert or update of role_id on public.memberships
  for each row execute function public.block_retired_roles();

drop trigger if exists membership_invites_block_retired_roles on public.membership_invites;
create trigger membership_invites_block_retired_roles
  before insert or update of role_id on public.membership_invites
  for each row execute function public.block_retired_roles();

commit;
