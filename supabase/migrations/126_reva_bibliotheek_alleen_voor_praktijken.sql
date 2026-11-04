-- 126: de REVA-bibliotheek (herstelplannen, oefeningen, schema's) was leesbaar
-- zonder in te loggen: de leespolicies hadden "scope = 'reva' OR ..." zonder
-- enige voorwaarde aan de gebruiker, en de anon-sleutel staat openbaar in de
-- website. Gevonden met een buitentest op 2026-11-04 (41 plannen, 514 oefeningen).
--
-- Voortaan: REVA-inhoud alleen voor actieve medewerkers van een praktijk en
-- platform admins. Patiënten lezen de bibliotheek niet; zij krijgen een eigen
-- kopie (patient_protocols e.d.) en de media via protocol_media_select_patient_assigned.
--
-- De onderliggende tabellen (protocol_phases, protocol_phase_*, schedule_library_exercises)
-- controleren via een subquery op protocols / schedule_library, en die subquery
-- valt zelf onder RLS — die volgen dus automatisch.

create or replace function public.is_staff_member()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select public.is_platform_admin()
    or exists (
      select 1 from public.memberships
      where user_id = auth.uid() and status = 'active'
    );
$$;

drop policy if exists "Organisatielid leest oefeningen (REVA + eigen organisatie)" on public.exercise_library;
create policy "Organisatielid leest oefeningen (REVA + eigen organisatie)"
  on public.exercise_library for select
  using ((scope = 'reva' and public.is_staff_member()) or public.is_org_member(organization_id));

drop policy if exists "Organisatielid leest protocollen (REVA + eigen organisatie)" on public.protocols;
create policy "Organisatielid leest protocollen (REVA + eigen organisatie)"
  on public.protocols for select
  using ((scope = 'reva' and public.is_staff_member()) or public.is_org_member(organization_id));

drop policy if exists "Organisatielid leest schema's (REVA + eigen organisatie)" on public.schedule_library;
create policy "Organisatielid leest schema's (REVA + eigen organisatie)"
  on public.schedule_library for select
  using ((scope = 'reva' and public.is_staff_member()) or public.is_org_member(organization_id));

-- Media van REVA-oefeningen: was leesbaar voor elke ingelogde gebruiker
-- (dus ook iedereen die zich zelf aanmeldt).
drop policy if exists protocol_media_select_reva on storage.objects;
create policy protocol_media_select_reva
  on storage.objects for select
  to authenticated
  using (bucket_id = 'protocol-media' and (storage.foldername(name))[1] = 'reva' and public.is_staff_member());

-- Event-trigger van Supabase zelf; hoeft door niemand via de API aangeroepen te worden.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
