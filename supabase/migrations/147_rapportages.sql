-- 147: data voor Analyse en Rapporten in het portaal.
--
-- Eén functie levert alle bouwstenen voor de rapporten (per patiënt, per dag,
-- fases en testen) in één keer, al samengevat in de database. De rapporten
-- zelf rekenen in de browser verder (lib/reports).
--
-- Bereik:
--   * praktijkeigenaar (can_view_org_analytics): hele praktijk, of één
--     behandelaar via p_therapist;
--   * behandelaar (can_manage_org_protocols, geen eigenaar): altijd alleen
--     de eigen patiënten, p_therapist wordt genegeerd;
--   * anders: null.
-- Beide hulpfuncties eisen een 2FA-sessie (aal2) en een open organisatie.

create or replace function public.portal_report_data(p_organization_id uuid, p_from date, p_to date, p_therapist uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ther uuid;
  v_from date := greatest(p_from, p_to - 400);
  v_result jsonb;
begin
  if public.can_view_org_analytics(p_organization_id) then
    v_ther := p_therapist;
  elsif public.can_manage_org_protocols(p_organization_id) then
    v_ther := auth.uid();
  else
    return null;
  end if;

  with scope as (
    select p.*
    from public.patients p
    where p.organization_id = p_organization_id
      and (v_ther is null or p.assigned_therapist_id = v_ther)
  ),
  pat as (
    select
      s.id,
      coalesce(nullif(trim(concat_ws(' ', s.first_name, s.last_name)), ''), pr.full_name, 'Onbekend') as name,
      s.status,
      s.created_at::date as created_on,
      s.discharged_at::date as discharged_on,
      s.discharge_outcome,
      s.injury_type,
      l.name as location,
      s.assigned_therapist_id as therapist_id,
      tp.full_name as therapist,
      s.user_id is not null as has_account,
      s.invited_at::date as invited_on,
      (select min(c.date) from public.checkins c where c.patient_id = s.id) as first_checkin,
      (select max(c.date) from public.checkins c where c.patient_id = s.id) as last_checkin,
      (select count(*) from public.checkins c where c.patient_id = s.id and c.date between v_from and p_to)::int as checkins,
      (select round(avg(c.day_score)::numeric, 2) from public.checkins c where c.patient_id = s.id and c.date between v_from and p_to) as avg_day,
      (select c.pain_score from public.checkins c where c.patient_id = s.id and c.pain_score is not null order by c.date asc limit 1) as pain_first,
      (select c.pain_score from public.checkins c where c.patient_id = s.id and c.pain_score is not null and c.date <= p_to order by c.date desc limit 1) as pain_last,
      (select count(*) from public.patient_protocol_session_logs sl where sl.patient_id = s.id and sl.date between v_from and p_to)::int as sessions,
      (select coalesce(sum(least(sc.frequency_per_week, 14)), 0)
         from public.patient_protocols pp
         join public.patient_protocol_phases ph on ph.patient_protocol_id = pp.id and ph.status = 'active'
         join public.patient_protocol_schedules sc on sc.phase_id = ph.id
        where pp.patient_id = s.id and pp.status in ('active', 'paused'))::int as prescribed_per_week,
      (select pp.name from public.patient_protocols pp where pp.patient_id = s.id order by (pp.status in ('active', 'paused')) desc, pp.assigned_at desc limit 1) as plan
    from scope s
    left join public.profiles pr on pr.id = s.user_id
    left join public.profiles tp on tp.id = s.assigned_therapist_id
    left join public.locations l on l.id = s.location_id
  ),
  days as (
    select d::date as day from generate_series(v_from, p_to, interval '1 day') d
  ),
  ck as (
    select c.date as day, count(*)::int as n, round(avg(c.day_score)::numeric, 2) as avg_day,
           round(avg(c.pain_score) filter (where c.pain_score is not null)::numeric, 2) as avg_pain
    from public.checkins c join scope s on s.id = c.patient_id
    where c.date between v_from and p_to
    group by c.date
  ),
  se as (
    select sl.date as day, count(*)::int as n
    from public.patient_protocol_session_logs sl join scope s on s.id = sl.patient_id
    where sl.date between v_from and p_to
    group by sl.date
  ),
  np as (select s.created_at::date as day, count(*)::int as n from scope s group by 1),
  dc as (select s.discharged_at::date as day, count(*)::int as n from scope s where s.discharged_at is not null group by 1),
  daily as (
    select dy.day,
      coalesce(ck.n, 0) as checkins, ck.avg_day, ck.avg_pain,
      coalesce(se.n, 0) as sessions,
      coalesce(np.n, 0) as new_patients,
      coalesce(dc.n, 0) as discharged
    from days dy
    left join ck on ck.day = dy.day
    left join se on se.day = dy.day
    left join np on np.day = dy.day
    left join dc on dc.day = dy.day
  ),
  phases as (
    select pp.patient_id, pp.name as plan, ph.name as phase, ph.sort_order,
           ph.started_at::date as started_on, ph.completed_at::date as completed_on
    from public.patient_protocols pp
    join scope s on s.id = pp.patient_id
    join public.patient_protocol_phases ph on ph.patient_protocol_id = pp.id
    where ph.started_at is not null
  ),
  tests as (
    select t.patient_id, t.name, t.unit, t.category, t.higher_is_better, t.bilateral, t.involved_side,
      (select count(*) from public.patient_test_results r where r.patient_test_id = t.id)::int as results,
      (select jsonb_build_object('on', r.measured_on, 'v', r.value, 'l', r.value_left, 'r', r.value_right)
         from public.patient_test_results r where r.patient_test_id = t.id order by r.measured_on asc limit 1) as first,
      (select jsonb_build_object('on', r.measured_on, 'v', r.value, 'l', r.value_left, 'r', r.value_right)
         from public.patient_test_results r where r.patient_test_id = t.id and r.measured_on <= p_to order by r.measured_on desc limit 1) as last
    from public.patient_tests t
    join scope s on s.id = t.patient_id
    where not t.archived
  )
  select jsonb_build_object(
    'from', v_from,
    'to', p_to,
    'therapist', v_ther,
    'patients', coalesce((select jsonb_agg(to_jsonb(pat)) from pat), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(to_jsonb(daily) order by daily.day) from daily), '[]'::jsonb),
    'phases', coalesce((select jsonb_agg(to_jsonb(phases)) from phases), '[]'::jsonb),
    'tests', coalesce((select jsonb_agg(to_jsonb(tests)) from tests where tests.results > 0), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.portal_report_data(uuid, date, date, uuid) from public, anon;
grant execute on function public.portal_report_data(uuid, date, date, uuid) to authenticated;

notify pgrst, 'reload schema';
