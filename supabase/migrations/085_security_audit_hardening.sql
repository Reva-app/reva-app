-- 085_security_audit_hardening.sql
-- Naar aanleiding van een grondig veiligheidsonderzoek vóór de eerste
-- betalende praktijk. Vier gerichte fixes, elk hieronder toegelicht.

-- ══════════════════════════════════════════════════════════════════════════
-- 1. Expliciete REVOKE op de drie service-role-only functies
-- ══════════════════════════════════════════════════════════════════════════
-- delete_patient_dossier/delete_own_patient_dossier (066) en
-- ensure_personal_organization (020) hebben GEEN eigen auth.uid()-check in
-- de functie-body — ze vertrouwen volledig op "alleen aanroepbaar door
-- service_role". Nergens in de migratiegeschiedenis staat een expliciete
-- REVOKE die dat ook echt afdwingt; Postgres geeft EXECUTE op nieuwe
-- functies standaard aan PUBLIC (dus impliciet ook aan anon/authenticated)
-- tenzij dat expliciet wordt ingetrokken. Zonder deze REVOKE zou elke
-- ingelogde gebruiker in theorie `supabase.rpc('delete_patient_dossier', ...)`
-- rechtstreeks kunnen aanroepen met een willekeurig patient_id/actor_id —
-- een volledige dossier-verwijdering buiten elke autorisatiecontrole om.
-- Dit is puur defensief: als de bug niet bestond, zijn dit no-ops.

revoke execute on function public.delete_patient_dossier(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_own_patient_dossier(uuid) from public, anon, authenticated;
revoke execute on function public.ensure_personal_organization(uuid) from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. patients: organisatielid-leestoegang alsnog aal2-gated
-- ══════════════════════════════════════════════════════════════════════════
-- Migratie 067 voegde session_has_aal2() toe aan 9 can_manage_*/can_view_*-
-- functies, maar miste de organisatielid-SELECT-policy op patients zelf
-- (019) — die las nog steeds zonder 2FA-eis. Daarmee kon een personeelslid
-- zonder voltooide 2FA alsnog de volledige patiëntenlijst (incl. geboorte-
-- datum, blessuretype, operatiedatum) inzien, precies wat 067 juist wilde
-- voorkomen. De patiënt-eigen leespolicy (070) blijft ongemoeid — een
-- patiënt heeft geen 2FA-eis nodig om het eigen dossier te lezen.

drop policy if exists "Organisatielid leest patiënten van eigen organisatie" on public.patients;

create policy "Organisatielid leest patiënten van eigen organisatie"
  on public.patients for select
  using (public.is_org_member(organization_id) and public.session_has_aal2());

-- ══════════════════════════════════════════════════════════════════════════
-- 3. patient_staff_notes: aal2-eis + audit-logging (ontbrak allebei)
-- ══════════════════════════════════════════════════════════════════════════
-- Deze tabel (076) is 9 migraties ná de MFA-invoering (067) gebouwd en nooit
-- aangesloten op session_has_aal2() — noch op de audit-trigger (066). Van
-- alle patiëntgerelateerde klinische data had dit logboek daardoor de
-- zwakste bescherming: leesbaar/schrijfbaar zonder 2FA, en zonder enig spoor
-- in het activiteitenlog wie een notitie heeft aangemaakt/gewijzigd/
-- verwijderd.

drop policy if exists "Organisatielid leest notities van eigen organisatie" on public.patient_staff_notes;
drop policy if exists "Organisatielid voegt notitie toe" on public.patient_staff_notes;
drop policy if exists "Auteur bewerkt eigen notitie" on public.patient_staff_notes;
drop policy if exists "Auteur verwijdert eigen notitie" on public.patient_staff_notes;

create policy "Organisatielid leest notities van eigen organisatie"
  on public.patient_staff_notes for select
  using ((public.is_org_member(organization_id) and public.session_has_aal2()) or public.is_platform_admin());

create policy "Organisatielid voegt notitie toe"
  on public.patient_staff_notes for insert
  with check (public.is_org_member(organization_id) and public.session_has_aal2() and author_id = auth.uid());

create policy "Auteur bewerkt eigen notitie"
  on public.patient_staff_notes for update
  using (author_id = auth.uid() and public.is_org_member(organization_id) and public.session_has_aal2())
  with check (author_id = auth.uid() and public.is_org_member(organization_id) and public.session_has_aal2());

create policy "Auteur verwijdert eigen notitie"
  on public.patient_staff_notes for delete
  using (author_id = auth.uid() and public.is_org_member(organization_id) and public.session_has_aal2());

create trigger audit_patient_staff_notes
  after insert or update or delete on public.patient_staff_notes
  for each row execute function public.audit_row_change();

notify pgrst, 'reload schema';
