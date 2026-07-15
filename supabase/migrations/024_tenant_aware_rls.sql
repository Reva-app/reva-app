-- 024_tenant_aware_rls.sql
-- REVA v2 — Fase 1: RLS-omzetting naar het tenant-model (het go/no-go-moment
-- uit docs/REVA-V2-MASTERPLAN.md §20 Fase 1). Vervangt op alle 12
-- patiëntgebonden tabellen de directe `auth.uid() = user_id`-policies door
-- policies die via `patient_id` naar `patients` kijken.
--
-- Bewuste asymmetrie tussen lezen en schrijven:
-- - LEZEN  (SELECT): patiënt zelf, ÓF een actief lid van de organisatie van
--   die patiënt, ÓF platform admin. Dit maakt de Practice Portal (Fase 3)
--   straks mogelijk zonder nóg een RLS-migratie, maar heeft vandaag geen
--   enkel effect: `memberships` is nog leeg, dus `is_org_member()` levert nu
--   voor niemand extra toegang op.
-- - SCHRIJVEN (INSERT/UPDATE/DELETE): uitsluitend de patiënt zelf, ÓF
--   platform admin. Nog GEEN organisatielid-schrijftoegang — welke rol
--   welke schrijfactie mag doen (therapeut wijst protocol toe, reception
--   plant een afspraak, ...) is een permissie-vraag die pas beantwoord wordt
--   zodra `role_permissions` in Fase 3 daadwerkelijk gevuld wordt. Nu al
--   generieke org-brede schrijftoegang geven zou een onnodig ruime policy
--   zijn zonder concrete usecase.
--
-- Kolommen/data blijven ongewijzigd — dit is uitsluitend een policy-omzetting.
-- De oude `user_id`-kolom blijft bestaan (de service-laag gebruikt hem nog
-- steeds); alleen de RLS-policies stoppen met er direct op te filteren.
--
-- appointments had door migratie 007 een overlappende 5e policy naast de 4
-- standaard CRUD-policies ("Users can manage own appointments", FOR ALL) —
-- die technische schuld ruimen we hier meteen op i.p.v. hem te laten
-- voortbestaan naast de nieuwe policies.

-- ── 1. Herbruikbare RLS-helpers ──────────────────────────────────────────────

create or replace function public.can_access_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (
        p.user_id = auth.uid()
        or public.is_org_member(p.organization_id)
        or public.is_platform_admin()
      )
  );
$$;

create or replace function public.can_manage_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (p.user_id = auth.uid() or public.is_platform_admin())
  );
$$;

grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.can_manage_patient(uuid) to authenticated;

-- ── 2. checkins ──────────────────────────────────────────────────────────────
drop policy if exists checkins_select_own on public.checkins;
drop policy if exists checkins_insert_own on public.checkins;
drop policy if exists checkins_update_own on public.checkins;
drop policy if exists checkins_delete_own on public.checkins;
create policy checkins_select_accessible on public.checkins for select using (public.can_access_patient(patient_id));
create policy checkins_insert_own        on public.checkins for insert with check (public.can_manage_patient(patient_id));
create policy checkins_update_own        on public.checkins for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy checkins_delete_own        on public.checkins for delete using (public.can_manage_patient(patient_id));

-- ── 3. appointments (ruimt ook de overlappende migratie-007-policy op) ──────
drop policy if exists "Users can manage own appointments" on public.appointments;
drop policy if exists appointments_select_own on public.appointments;
drop policy if exists appointments_insert_own on public.appointments;
drop policy if exists appointments_update_own on public.appointments;
drop policy if exists appointments_delete_own on public.appointments;
create policy appointments_select_accessible on public.appointments for select using (public.can_access_patient(patient_id));
create policy appointments_insert_own        on public.appointments for insert with check (public.can_manage_patient(patient_id));
create policy appointments_update_own        on public.appointments for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy appointments_delete_own        on public.appointments for delete using (public.can_manage_patient(patient_id));

-- ── 4. training_exercises ────────────────────────────────────────────────────
drop policy if exists training_exercises_select_own on public.training_exercises;
drop policy if exists training_exercises_insert_own on public.training_exercises;
drop policy if exists training_exercises_update_own on public.training_exercises;
drop policy if exists training_exercises_delete_own on public.training_exercises;
create policy training_exercises_select_accessible on public.training_exercises for select using (public.can_access_patient(patient_id));
create policy training_exercises_insert_own        on public.training_exercises for insert with check (public.can_manage_patient(patient_id));
create policy training_exercises_update_own        on public.training_exercises for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy training_exercises_delete_own        on public.training_exercises for delete using (public.can_manage_patient(patient_id));

-- ── 5. training_schemas ───────────────────────────────────────────────────────
drop policy if exists training_schemas_select_own on public.training_schemas;
drop policy if exists training_schemas_insert_own on public.training_schemas;
drop policy if exists training_schemas_update_own on public.training_schemas;
drop policy if exists training_schemas_delete_own on public.training_schemas;
create policy training_schemas_select_accessible on public.training_schemas for select using (public.can_access_patient(patient_id));
create policy training_schemas_insert_own        on public.training_schemas for insert with check (public.can_manage_patient(patient_id));
create policy training_schemas_update_own        on public.training_schemas for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy training_schemas_delete_own        on public.training_schemas for delete using (public.can_manage_patient(patient_id));

-- ── 6. training_logs ─────────────────────────────────────────────────────────
drop policy if exists training_logs_select_own on public.training_logs;
drop policy if exists training_logs_insert_own on public.training_logs;
drop policy if exists training_logs_update_own on public.training_logs;
drop policy if exists training_logs_delete_own on public.training_logs;
create policy training_logs_select_accessible on public.training_logs for select using (public.can_access_patient(patient_id));
create policy training_logs_insert_own        on public.training_logs for insert with check (public.can_manage_patient(patient_id));
create policy training_logs_update_own        on public.training_logs for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy training_logs_delete_own        on public.training_logs for delete using (public.can_manage_patient(patient_id));

-- ── 7. medication_logs ────────────────────────────────────────────────────────
drop policy if exists medication_logs_select_own on public.medication_logs;
drop policy if exists medication_logs_insert_own on public.medication_logs;
drop policy if exists medication_logs_update_own on public.medication_logs;
drop policy if exists medication_logs_delete_own on public.medication_logs;
create policy medication_logs_select_accessible on public.medication_logs for select using (public.can_access_patient(patient_id));
create policy medication_logs_insert_own        on public.medication_logs for insert with check (public.can_manage_patient(patient_id));
create policy medication_logs_update_own        on public.medication_logs for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy medication_logs_delete_own        on public.medication_logs for delete using (public.can_manage_patient(patient_id));

-- ── 8. medication_schedules ────────────────────────────────────────────────────
drop policy if exists medication_schedules_select_own on public.medication_schedules;
drop policy if exists medication_schedules_insert_own on public.medication_schedules;
drop policy if exists medication_schedules_update_own on public.medication_schedules;
drop policy if exists medication_schedules_delete_own on public.medication_schedules;
create policy medication_schedules_select_accessible on public.medication_schedules for select using (public.can_access_patient(patient_id));
create policy medication_schedules_insert_own        on public.medication_schedules for insert with check (public.can_manage_patient(patient_id));
create policy medication_schedules_update_own        on public.medication_schedules for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy medication_schedules_delete_own        on public.medication_schedules for delete using (public.can_manage_patient(patient_id));

-- ── 9. goals ────────────────────────────────────────────────────────────────
drop policy if exists goals_select_own on public.goals;
drop policy if exists goals_insert_own on public.goals;
drop policy if exists goals_update_own on public.goals;
drop policy if exists goals_delete_own on public.goals;
create policy goals_select_accessible on public.goals for select using (public.can_access_patient(patient_id));
create policy goals_insert_own        on public.goals for insert with check (public.can_manage_patient(patient_id));
create policy goals_update_own        on public.goals for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy goals_delete_own        on public.goals for delete using (public.can_manage_patient(patient_id));

-- ── 10. milestones ─────────────────────────────────────────────────────────
drop policy if exists milestones_select_own on public.milestones;
drop policy if exists milestones_insert_own on public.milestones;
drop policy if exists milestones_update_own on public.milestones;
drop policy if exists milestones_delete_own on public.milestones;
create policy milestones_select_accessible on public.milestones for select using (public.can_access_patient(patient_id));
create policy milestones_insert_own        on public.milestones for insert with check (public.can_manage_patient(patient_id));
create policy milestones_update_own        on public.milestones for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy milestones_delete_own        on public.milestones for delete using (public.can_manage_patient(patient_id));

-- ── 11. dossier_documents ─────────────────────────────────────────────────
drop policy if exists dossier_documents_select_own on public.dossier_documents;
drop policy if exists dossier_documents_insert_own on public.dossier_documents;
drop policy if exists dossier_documents_update_own on public.dossier_documents;
drop policy if exists dossier_documents_delete_own on public.dossier_documents;
create policy dossier_documents_select_accessible on public.dossier_documents for select using (public.can_access_patient(patient_id));
create policy dossier_documents_insert_own        on public.dossier_documents for insert with check (public.can_manage_patient(patient_id));
create policy dossier_documents_update_own        on public.dossier_documents for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy dossier_documents_delete_own        on public.dossier_documents for delete using (public.can_manage_patient(patient_id));

-- ── 12. dossier_photo_updates ─────────────────────────────────────────────
drop policy if exists dossier_photo_updates_select_own on public.dossier_photo_updates;
drop policy if exists dossier_photo_updates_insert_own on public.dossier_photo_updates;
drop policy if exists dossier_photo_updates_update_own on public.dossier_photo_updates;
drop policy if exists dossier_photo_updates_delete_own on public.dossier_photo_updates;
create policy dossier_photo_updates_select_accessible on public.dossier_photo_updates for select using (public.can_access_patient(patient_id));
create policy dossier_photo_updates_insert_own        on public.dossier_photo_updates for insert with check (public.can_manage_patient(patient_id));
create policy dossier_photo_updates_update_own        on public.dossier_photo_updates for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy dossier_photo_updates_delete_own        on public.dossier_photo_updates for delete using (public.can_manage_patient(patient_id));

-- ── 13. dossier_contacts ───────────────────────────────────────────────────
drop policy if exists dossier_contacts_select_own on public.dossier_contacts;
drop policy if exists dossier_contacts_insert_own on public.dossier_contacts;
drop policy if exists dossier_contacts_update_own on public.dossier_contacts;
drop policy if exists dossier_contacts_delete_own on public.dossier_contacts;
create policy dossier_contacts_select_accessible on public.dossier_contacts for select using (public.can_access_patient(patient_id));
create policy dossier_contacts_insert_own        on public.dossier_contacts for insert with check (public.can_manage_patient(patient_id));
create policy dossier_contacts_update_own        on public.dossier_contacts for update using (public.can_manage_patient(patient_id)) with check (public.can_manage_patient(patient_id));
create policy dossier_contacts_delete_own        on public.dossier_contacts for delete using (public.can_manage_patient(patient_id));

notify pgrst, 'reload schema';
