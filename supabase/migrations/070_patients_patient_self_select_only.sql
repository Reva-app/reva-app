-- 070_patients_patient_self_select_only.sql
-- De patiënt-eigen policy op patients (migratie 019) stond "for all" toe
-- (select/insert/update/delete) met alleen auth.uid() = user_id als
-- voorwaarde — een patiënt kon dus in theorie het eigen record wijzigen
-- (status/organization_id/assigned_therapist_id incluis) via een directe
-- Supabase-call. Geen enkel deel van de Patient Portal schrijft ooit naar
-- patients (bevestigd: alleen portalService.ts/adminService.ts doen dat,
-- praktijk-/adminkant) — de patiënt heeft dus geen legitieme reden voor
-- schrijftoegang. Dit sluit dat gat, en is een randvoorwaarde voor de
-- archiverings-gate: anders zou een patiënt de eigen blokkade zelf ongedaan
-- kunnen maken door status weer op 'active' te zetten.

drop policy if exists "Patiënt beheert eigen patiëntrecord" on public.patients;

create policy "Patiënt leest eigen patiëntrecord"
  on public.patients
  for select
  using (auth.uid() = user_id);
