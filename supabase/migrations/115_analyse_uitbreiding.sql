-- 115_analyse_uitbreiding.sql
-- Twee nieuwe security-definer RPC's voor de uitgebreide Analyse-pagina,
-- zelfde eigenaar-only-patroon als migratie 064:
--
--  1. portal_room_occupancy_stats — ruimtebezetting per locatie over de
--     gekozen periode: gereserveerde minuten (room_reservations) t.o.v.
--     beschikbare minuten (aantal actieve ruimtes × locatie-openingstijden
--     per dag in de periode). Ruimtes zonder eigen openingstijden-model —
--     ze volgen de openingstijden van hun locatie, bewuste vereenvoudiging.
--
--  2. portal_quality_stats — telbare, niet-verzonnen indicatoren voor
--     "hoeveel tijd REVA bespaart" en "hoe goed kwaliteit geborgd wordt":
--     aantal AI-intake-analyses, aantal via AI-suggestie overgenomen
--     ruimtereserveringen, en de documentatiegraad van faseovergang-
--     check-ins (voltooide fases met vs. zonder ingevulde check-in). Geen
--     van deze getallen wordt hier al omgerekend naar "bespaarde uren" —
--     dat gebeurt bewust pas in de UI, met een zichtbaar gelabelde aanname,
--     zodat de aanname nooit verstopt zit in een databasefunctie.

create or replace function public.portal_room_occupancy_stats(p_organization_id uuid, p_period_days int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_start timestamptz := date_trunc('day', now()) - ((p_period_days - 1) || ' days')::interval;
  v_period_end timestamptz := date_trunc('day', now()) + interval '1 day';
  v_result jsonb;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return '[]'::jsonb;
  end if;

  with days as (
    select generate_series(v_period_start, date_trunc('day', now()), interval '1 day')::date as d
  ),
  day_key as (
    select d, (case extract(dow from d)::int
      when 0 then 'sunday' when 1 then 'monday' when 2 then 'tuesday' when 3 then 'wednesday'
      when 4 then 'thursday' when 5 then 'friday' else 'saturday' end) as key
    from days
  ),
  active_rooms as (
    select lr.id as room_id, lr.location_id
    from public.location_rooms lr
    join public.locations l on l.id = lr.location_id
    where l.organization_id = p_organization_id and lr.archived = false and l.archived = false
  ),
  room_days as (
    select ar.room_id, ar.location_id, dk.key
    from active_rooms ar cross join day_key dk
  ),
  capacity as (
    select
      rd.location_id,
      count(distinct rd.room_id) as room_count,
      coalesce(sum(
        case when (l.opening_hours -> rd.key ->> 'open')::boolean is true
        then extract(epoch from (
          (l.opening_hours -> rd.key ->> 'to')::time - (l.opening_hours -> rd.key ->> 'from')::time
        )) / 60
        else 0 end
      ), 0) as available_minutes
    from room_days rd
    join public.locations l on l.id = rd.location_id
    group by rd.location_id
  ),
  reserved as (
    select ar.location_id, coalesce(sum(extract(epoch from (rr.ends_at - rr.starts_at)) / 60), 0) as reserved_minutes
    from public.room_reservations rr
    join active_rooms ar on ar.room_id = rr.room_id
    where rr.starts_at >= v_period_start and rr.starts_at < v_period_end
    group by ar.location_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'locationId', l.id,
      'locationName', l.name,
      'roomCount', coalesce(c.room_count, 0),
      'reservedMinutes', round(coalesce(r.reserved_minutes, 0)),
      'availableMinutes', round(coalesce(c.available_minutes, 0))
    ) order by l.name), '[]'::jsonb)
    into v_result
  from public.locations l
  left join capacity c on c.location_id = l.id
  left join reserved r on r.location_id = l.id
  where l.organization_id = p_organization_id and l.archived = false;

  return v_result;
end;
$$;

grant execute on function public.portal_room_occupancy_stats(uuid, int) to authenticated;

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
  v_ai_room_suggestions_count int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object(
      'completedPhasesCount', 0, 'completedPhasesWithCheckinCount', 0,
      'aiIntakeCount', 0, 'aiRoomSuggestionsTakenCount', 0
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

  select count(*) into v_ai_room_suggestions_count
  from public.room_reservations rr
  join public.location_rooms lr on lr.id = rr.room_id
  join public.locations l on l.id = lr.location_id
  where l.organization_id = p_organization_id
    and rr.source = 'ai_suggested'
    and rr.created_at >= v_period_start;

  return jsonb_build_object(
    'completedPhasesCount', v_completed_phases,
    'completedPhasesWithCheckinCount', v_completed_phases_with_checkin,
    'aiIntakeCount', v_ai_intake_count,
    'aiRoomSuggestionsTakenCount', v_ai_room_suggestions_count
  );
end;
$$;

grant execute on function public.portal_quality_stats(uuid, int) to authenticated;

notify pgrst, 'reload schema';
