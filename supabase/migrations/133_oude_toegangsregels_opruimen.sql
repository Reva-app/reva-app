-- 133: oude, dubbele toegangsregels opruimen (gevonden in de live-export van 2026-11-04).
--
-- Twee tabellen hadden nog policies uit de tijd van de losse patiënten-app,
-- gebaseerd op het account (user_id = auth.uid()) in plaats van op het
-- patiëntdossier (can_manage_patient / can_access_patient) zoals alle andere
-- patiënttabellen. Geen lek, wel een tweede, afwijkend toegangspad.
--
-- - training_schema_exercises: had beide sets; de user_id-set gaat weg.
-- - medication_schedule_times: had alléén de user_id-set (5 policies, deels
--   dubbel); die wordt vervangen door dezelfde opzet als training_schema_exercises.
--
-- Gedrag blijft gelijk: can_manage_patient() = de patiënt zelf of de platform
-- admin, en patient_id wordt bij elke insert automatisch gevuld vanuit user_id
-- (trigger set_patient_id_from_user_id). Beide tabellen waren bij het
-- schrijven van deze migratie leeg.

-- ── training_schema_exercises ───────────────────────────────────────────────
drop policy if exists training_schema_exercises_select_via_owned_schema on public.training_schema_exercises;
drop policy if exists training_schema_exercises_insert_via_owned_schema on public.training_schema_exercises;
drop policy if exists training_schema_exercises_update_via_owned_schema on public.training_schema_exercises;
drop policy if exists training_schema_exercises_delete_via_owned_schema on public.training_schema_exercises;

-- ── medication_schedule_times ───────────────────────────────────────────────
drop policy if exists "Users can manage own schedule times" on public.medication_schedule_times;
drop policy if exists medication_schedule_times_select_via_owned_schedule on public.medication_schedule_times;
drop policy if exists medication_schedule_times_insert_via_owned_schedule on public.medication_schedule_times;
drop policy if exists medication_schedule_times_update_via_owned_schedule on public.medication_schedule_times;
drop policy if exists medication_schedule_times_delete_via_owned_schedule on public.medication_schedule_times;

create policy medication_schedule_times_select_accessible on public.medication_schedule_times
  for select using (exists (
    select 1 from public.medication_schedules s
    where s.id = medication_schedule_times.schedule_id and public.can_access_patient(s.patient_id)
  ));

create policy medication_schedule_times_insert_own on public.medication_schedule_times
  for insert with check (exists (
    select 1 from public.medication_schedules s
    where s.id = medication_schedule_times.schedule_id and public.can_manage_patient(s.patient_id)
  ));

create policy medication_schedule_times_update_own on public.medication_schedule_times
  for update
  using (exists (
    select 1 from public.medication_schedules s
    where s.id = medication_schedule_times.schedule_id and public.can_manage_patient(s.patient_id)
  ))
  with check (exists (
    select 1 from public.medication_schedules s
    where s.id = medication_schedule_times.schedule_id and public.can_manage_patient(s.patient_id)
  ));

create policy medication_schedule_times_delete_own on public.medication_schedule_times
  for delete using (exists (
    select 1 from public.medication_schedules s
    where s.id = medication_schedule_times.schedule_id and public.can_manage_patient(s.patient_id)
  ));
