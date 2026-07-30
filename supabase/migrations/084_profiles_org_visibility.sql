-- 084_profiles_org_visibility.sql
--
-- Bug gevonden via gebruikersfeedback: de "Behandelaar"-kolom in het
-- patiëntenoverzicht toont altijd "—", ook als assigned_therapist_id wel
-- degelijk gezet is en de behandelaar een profiel heeft met full_name.
-- Grondoorzaak: `profiles` heeft sinds schema.sql alleen
-- `profiles_select_own` ("auth.uid() = id") — een organisatielid mag dus
-- geen enkele ANDERE profiles-rij rechtstreeks lezen, ook niet van een
-- collega binnen dezelfde organisatie. Migratie 032 constateerde dit al
-- expliciet in een comment ("profiles-rij niet rechtstreeks lezen (alleen
-- eigen rij, zie profiles-RLS)") en loste het toen puntueel op met
-- SECURITY DEFINER RPC's (portal_list_org_members, portal_find_user_by_email)
-- — maar elke latere plek die gewoon `.from("profiles").select(...)` deed
-- voor een ANDER account (loadPortalPatients' behandelaar/patiënt-naam,
-- loadPatientStaffNotes' auteursnaam, loadAuditLog's actor/behandelaar-naam,
-- loadOrgProtocols' aanmaker-naam, loadPortalLocationFull's medewerkers)
-- kreeg stilzwijgend 0 rijen terug — geen foutmelding, gewoon een lege
-- lookup, vandaar dat dit pas nu opviel.
--
-- Oplossing: één additieve SELECT-policy i.p.v. losse RPC's voor elk
-- toekomstig geval — een organisatielid mag het profiel lezen van (a) een
-- collega binnen een organisatie waar hij zelf actief lid van is, of (b)
-- een patiënt (via patients.user_id) binnen zo'n organisatie. Dekt daarmee
-- in één keer alle bovenstaande, al langer stilzwijgend kapotte plekken.

create policy "Organisatielid leest profielen van collega's en patiënten in eigen organisatie"
  on public.profiles for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and m.status = 'active'
        and public.is_org_member(m.organization_id)
    )
    or exists (
      select 1 from public.patients p
      where p.user_id = profiles.id
        and public.is_org_member(p.organization_id)
    )
  );

notify pgrst, 'reload schema';
