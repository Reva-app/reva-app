-- 125: opruimen na de live-export van 2026-11-04 (supabase/snapshots/beveiliging-live.sql).
--
-- 1. portal_find_user_by_email: elk actief lid van wélke praktijk dan ook kon
--    voor elk e-mailadres op het hele platform opvragen of er een REVA-account
--    bij hoort, inclusief de naam — ook van patiënten van andere praktijken.
--    Voortaan alleen voor wie in een eigen organisatie medewerkers of patiënten
--    mag beheren, en zonder naam (geen enkele aanroeper gebruikt die; de
--    kolom blijft bestaan zodat de functiesignatuur gelijk blijft).
--
-- 2. Alle RPC's die de app alleen ingelogd aanroept, waren ook voor anon
--    (niet ingelogd) uitvoerbaar. Ze controleren allemaal zelf auth.uid() en
--    gaven anon dus niets terug, maar dichtzetten is de nette standaard.
--    De hulpfuncties die in policies gebruikt worden (can_*, is_org_member,
--    is_platform_admin) blijven bewust uitvoerbaar: anders krijgt een
--    niet-ingelogde query een foutmelding in plaats van een lege lijst.

create or replace function public.portal_find_user_by_email(p_email text)
returns table(id uuid, full_name text)
language sql
stable security definer
set search_path to 'public'
as $$
  select p.id, null::text
  from public.profiles p
  where lower(p.email) = lower(p_email)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and (public.can_manage_org_staff(m.organization_id) or public.can_manage_org_patients(m.organization_id))
    )
  limit 1;
$$;

revoke execute on function public.portal_find_user_by_email(text) from public, anon;
grant execute on function public.portal_find_user_by_email(text) to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_list_org_members(uuid)',
    'public.admin_org_last_activity()',
    'public.admin_recovery_duration_stats()',
    'public.assign_protocol_to_patient(uuid, uuid)',
    'public.load_own_intake_body_side()',
    'public.load_own_intake_summary()',
    'public.log_patients_export(uuid, integer)',
    'public.mark_own_membership_welcomed(uuid)',
    'public.mark_own_patient_welcomed(uuid)',
    'public.patient_care_context()',
    'public.patient_organization_branding()',
    'public.portal_list_org_members(uuid)',
    'public.portal_org_activity_summary(uuid)',
    'public.portal_org_usage_stats(uuid, integer)',
    'public.portal_quality_stats(uuid, integer)',
    'public.portal_recovery_duration_stats(uuid)',
    'public.portal_room_occupancy_stats(uuid, integer)',
    'public.portal_therapist_workload(uuid)',
    'public.set_main_location(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
