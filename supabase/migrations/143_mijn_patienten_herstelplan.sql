-- 143: "Mijn patiënten" op het portal-dashboard toont ook het herstelplan
-- en de huidige fase (bv. "ACL-reconstructie · fase 2 van 5").
--
-- Zelfde functie als migratie 132, met vier extra kolommen. Het
-- returntype verandert, dus eerst droppen. SECURITY INVOKER: alle RLS
-- (can_access_patient, aal2) blijft gelden.

drop function if exists public.portal_my_patients_summary(uuid);

create function public.portal_my_patients_summary(p_organization_id uuid)
returns table(
  patient_id        uuid,
  full_name         text,
  created_at        timestamptz,
  last_checkin_date date,
  last_pain_score   integer,
  last_swelling     boolean,
  last_day_score    integer,
  checkins_last_7d  integer,
  plan_name         text,
  phase_name        text,
  phase_number      integer,
  phase_count       integer
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    p.id,
    coalesce(pr.full_name, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')),
    p.created_at,
    lc.date,
    lc.pain_score,
    lc.swelling,
    lc.day_score,
    (select count(*)::int from public.checkins c7
      where c7.patient_id = p.id and c7.date >= current_date - 6),
    pp.name,
    ph.name,
    ph.number,
    (select count(*)::int from public.patient_protocol_phases x where x.patient_protocol_id = pp.id)
  from public.patients p
  left join public.profiles pr on pr.id = p.user_id
  left join lateral (
    select c.date, c.pain_score, c.swelling, c.day_score
    from public.checkins c
    where c.patient_id = p.id
    order by c.date desc
    limit 1
  ) lc on true
  left join public.patient_protocols pp
    on pp.patient_id = p.id and pp.status in ('active', 'paused')
  left join lateral (
    select a.name,
      (select count(*)::int from public.patient_protocol_phases b
        where b.patient_protocol_id = pp.id and b.sort_order <= a.sort_order) as number
    from public.patient_protocol_phases a
    where a.patient_protocol_id = pp.id and a.status = 'active'
    limit 1
  ) ph on true
  where p.organization_id = p_organization_id
    and p.assigned_therapist_id = auth.uid()
    and p.status = 'active';
$$;

revoke execute on function public.portal_my_patients_summary(uuid) from public, anon;
grant execute on function public.portal_my_patients_summary(uuid) to authenticated;

notify pgrst, 'reload schema';
