-- 116_herstel_datum.sql
-- "Herstel datum" (UI-label: Afsluitdatum) — de datum waarop een patiënt
-- daadwerkelijk is uitbehandeld, los van patients.status (dat blijft
-- account-/zichtbaarheidsstatus: active/inactive/archived, zie migratie 019
-- — 'inactive' wordt nergens in de app gezet en 'archived' is een generieke
-- zichtbaarheidsschakelaar, geen klinische uitkomst). Met deze datum + een
-- optionele uitkomst-classificatie kan de gemiddelde doorlooptijd per
-- blessure getrackt worden: hoelang duurt behandeling gemiddeld, en met
-- welk resultaat.

alter table public.patients
  add column if not exists discharged_at timestamptz,
  add column if not exists discharge_outcome text check (
    discharge_outcome is null or discharge_outcome in ('fully_recovered', 'partially_recovered', 'stopped_early', 'transferred')
  );

-- ── portal_recovery_duration_stats ───────────────────────────────────────
-- Praktijkbrede doorlooptijd-analyse voor de Analyse-pagina: gemiddelde
-- doorlooptijd (dagen) per blessurecategorie, plus aantal afgesloten
-- patiënten per jaar. Doorlooptijd = discharged_at minus assigned_at van
-- het meest recente herstelplan van die patiënt (patient_protocols.
-- injury_category staat al gedenormaliseerd op de toewijzing zelf, dus
-- geen join naar protocols nodig). Eigenaar-only via can_view_org_analytics
-- (migratie 064), zelfde patroon als portal_room_occupancy_stats (115).

create or replace function public.portal_recovery_duration_stats(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.can_view_org_analytics(p_organization_id) then
    return jsonb_build_object('totalDischarged', 0, 'avgDurationDays', null, 'byInjuryCategory', '[]'::jsonb, 'patientsPerYear', '[]'::jsonb);
  end if;

  with latest_protocol as (
    select distinct on (pp.patient_id) pp.patient_id, pp.injury_category, pp.assigned_at
    from public.patient_protocols pp
    join public.patients p on p.id = pp.patient_id
    where p.organization_id = p_organization_id
    order by pp.patient_id, pp.assigned_at desc
  ),
  discharged as (
    select p.id, p.discharge_outcome, lp.injury_category,
      extract(epoch from (p.discharged_at - lp.assigned_at)) / 86400.0 as duration_days
    from public.patients p
    join latest_protocol lp on lp.patient_id = p.id
    where p.organization_id = p_organization_id and p.discharged_at is not null
  ),
  by_category as (
    select injury_category, count(*) as cnt, avg(duration_days) as avg_days
    from discharged
    where injury_category is not null
    group by injury_category
  ),
  by_year as (
    select extract(year from created_at)::int as yr, count(*) as cnt
    from public.patients
    where organization_id = p_organization_id
    group by 1
    order by 1 desc
    limit 6
  )
  select jsonb_build_object(
    'totalDischarged', (select count(*) from discharged),
    'avgDurationDays', (select round(avg(duration_days), 1) from discharged),
    'byInjuryCategory', coalesce((
      select jsonb_agg(jsonb_build_object('injuryCategory', injury_category, 'count', cnt, 'avgDurationDays', round(avg_days, 1)) order by cnt desc)
      from by_category
    ), '[]'::jsonb),
    'patientsPerYear', coalesce((
      select jsonb_agg(jsonb_build_object('year', yr, 'count', cnt) order by yr desc)
      from by_year
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.portal_recovery_duration_stats(uuid) to authenticated;

-- ── admin_recovery_duration_stats ────────────────────────────────────────
-- Zelfde vorm, maar platformbreed (alle organisaties gebundeld) t.b.v. de
-- overkoepelde /admin-statistiekenpagina — platform-admin-only.

create or replace function public.admin_recovery_duration_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    return jsonb_build_object('totalDischarged', 0, 'avgDurationDays', null, 'byInjuryCategory', '[]'::jsonb, 'patientsPerYear', '[]'::jsonb);
  end if;

  with latest_protocol as (
    select distinct on (pp.patient_id) pp.patient_id, pp.injury_category, pp.assigned_at
    from public.patient_protocols pp
    order by pp.patient_id, pp.assigned_at desc
  ),
  discharged as (
    select p.id, p.discharge_outcome, lp.injury_category,
      extract(epoch from (p.discharged_at - lp.assigned_at)) / 86400.0 as duration_days
    from public.patients p
    join latest_protocol lp on lp.patient_id = p.id
    where p.discharged_at is not null
  ),
  by_category as (
    select injury_category, count(*) as cnt, avg(duration_days) as avg_days
    from discharged
    where injury_category is not null
    group by injury_category
  ),
  by_year as (
    select extract(year from created_at)::int as yr, count(*) as cnt
    from public.patients
    group by 1
    order by 1 desc
    limit 6
  )
  select jsonb_build_object(
    'totalDischarged', (select count(*) from discharged),
    'avgDurationDays', (select round(avg(duration_days), 1) from discharged),
    'byInjuryCategory', coalesce((
      select jsonb_agg(jsonb_build_object('injuryCategory', injury_category, 'count', cnt, 'avgDurationDays', round(avg_days, 1)) order by cnt desc)
      from by_category
    ), '[]'::jsonb),
    'patientsPerYear', coalesce((
      select jsonb_agg(jsonb_build_object('year', yr, 'count', cnt) order by yr desc)
      from by_year
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_recovery_duration_stats() to authenticated;

notify pgrst, 'reload schema';
