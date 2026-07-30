-- 064_analytics_rpc.sql
-- Analytics ("Analyse"-pagina) was tot nu toe alleen aan de voorkant
-- afgeschermd voor niet-eigenaren (VIEW_ANALYTICS_ROLES in
-- lib/services/portalService.ts) — de onderliggende leesacties draaiden op
-- de gewone RLS-gebonden client tegen tabellen die voor elk actief
-- organisatielid leesbaar zijn (is_org_member, rolblind). Een fysiotherapeut
-- kon dus in theorie via de browser-console dezelfde praktijkbrede cijfers
-- opvragen. Deze migratie verplaatst de drie analytics-queries naar
-- security-definer RPC's die zelf de eigenaar-only-check doen, zodat de
-- afscherming ook echt op databaseniveau geldt.

create or replace function public.can_view_org_analytics(org_id uuid)
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
        and r.key = 'organization_owner'
    );
$$;

grant execute on function public.can_view_org_analytics(uuid) to authenticated;

-- ── portal_org_usage_stats ───────────────────────────────────────────────
-- Vervangt loadOrgUsageStats(): dag-voor-dag trend van check-ins en
-- afgeronde trainingen over de gekozen periode, plus totalen.

create or replace function public.portal_org_usage_stats(p_organization_id uuid, p_period_days int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_patient_ids uuid[];
  v_total_patients int;
  v_result jsonb;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object(
      'periodDays', p_period_days, 'trend', '[]'::jsonb,
      'totalCheckins', 0, 'totalTrainingsCompleted', 0,
      'activePatientCount', 0, 'totalPatientCount', 0
    );
  end if;

  select coalesce(array_agg(id), array[]::uuid[]), count(*)
    into v_patient_ids, v_total_patients
  from public.patients
  where organization_id = p_organization_id;

  with days as (
    select (current_date - i)::date as d
    from generate_series(0, p_period_days - 1) as i
  ),
  daily_checkins as (
    select date, count(*) as cnt
    from public.checkins
    where patient_id = any(v_patient_ids)
      and date >= (current_date - (p_period_days - 1))
    group by date
  ),
  daily_trainings as (
    select date, count(*) as cnt
    from public.training_logs
    where patient_id = any(v_patient_ids)
      and completed = true
      and date >= (current_date - (p_period_days - 1))
    group by date
  )
  select jsonb_build_object(
    'periodDays', p_period_days,
    'trend', coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(days.d, 'YYYY-MM-DD'),
        'checkins', coalesce(dc.cnt, 0),
        'trainingsCompleted', coalesce(dt.cnt, 0)
      ) order by days.d), '[]'::jsonb),
    'totalCheckins', coalesce(sum(dc.cnt), 0),
    'totalTrainingsCompleted', coalesce(sum(dt.cnt), 0),
    'activePatientCount', (
      select count(distinct patient_id) from public.checkins
      where patient_id = any(v_patient_ids) and date >= (current_date - (p_period_days - 1))
    ),
    'totalPatientCount', v_total_patients
  ) into v_result
  from days
  left join daily_checkins dc on dc.date = days.d
  left join daily_trainings dt on dt.date = days.d;

  return v_result;
end;
$$;

grant execute on function public.portal_org_usage_stats(uuid, int) to authenticated;

-- ── portal_therapist_workload ────────────────────────────────────────────
-- Vervangt de tel-logica in loadTherapistWorkload(): alleen de aantallen per
-- behandelaar (user_id) + niet-toegewezen patiënten. Namen/rol blijven aan
-- de kant van de client komen uit loadPortalStaffOverview() (al voor
-- iedereen zichtbaar) — deze functie geeft dus bewust geen namen terug.

create or replace function public.portal_therapist_workload(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_unassigned int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object('rows', '[]'::jsonb, 'unassignedCount', 0);
  end if;

  select count(*) into v_unassigned
  from public.patients
  where organization_id = p_organization_id
    and status = 'active'
    and assigned_therapist_id is null;

  select coalesce(jsonb_agg(jsonb_build_object('userId', assigned_therapist_id, 'patientCount', cnt)), '[]'::jsonb)
    into v_result
  from (
    select assigned_therapist_id, count(*) as cnt
    from public.patients
    where organization_id = p_organization_id
      and status = 'active'
      and assigned_therapist_id is not null
    group by assigned_therapist_id
  ) t;

  return jsonb_build_object('rows', v_result, 'unassignedCount', v_unassigned);
end;
$$;

grant execute on function public.portal_therapist_workload(uuid) to authenticated;

-- ── portal_org_activity_summary ──────────────────────────────────────────
-- Vervangt loadOrgActivitySummary(). Drempels hardgecodeerd (30/14 dagen) —
-- moeten in sync blijven met PATIENT_INACTIVITY_THRESHOLD_DAYS /
-- STAFF_INACTIVITY_THRESHOLD_DAYS in lib/services/portalService.ts.
-- Het auth.users-join volgt hetzelfde patroon als portal_list_org_members
-- (migratie 042).

create or replace function public.portal_org_activity_summary(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inactive_patients int;
  v_inactive_staff int;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object('inactivePatientCount', 0, 'inactiveStaffCount', 0);
  end if;

  select count(*) into v_inactive_patients
  from public.patients p
  where p.organization_id = p_organization_id
    and p.status = 'active'
    and coalesce(
      (select max(c.date) from public.checkins c where c.patient_id = p.id),
      p.created_at::date
    ) < (current_date - 30);

  select count(*) into v_inactive_staff
  from public.memberships m
  left join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and (u.last_sign_in_at is null or u.last_sign_in_at < (now() - interval '14 days'));

  return jsonb_build_object('inactivePatientCount', v_inactive_patients, 'inactiveStaffCount', v_inactive_staff);
end;
$$;

grant execute on function public.portal_org_activity_summary(uuid) to authenticated;
