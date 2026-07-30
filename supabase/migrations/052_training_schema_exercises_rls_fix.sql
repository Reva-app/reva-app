-- 052_training_schema_exercises_rls_fix.sql
-- Losstaand van de Protocol Engine (048-051), maar in hetzelfde deel van het
-- schema en met dezelfde onderliggende oorzaak: de junction-tabel
-- `training_schema_exercises` (010_training_rls.sql) is destijds NIET
-- meegenomen in de tenant-RLS-omzetting van migratie 024. Zijn enige policy
-- ("training_schema_exercises_all_own") checkt nog steeds rechtstreeks
-- `training_schemas.user_id = auth.uid()` i.p.v. via `patient_id` te gaan —
-- hierdoor kan een organisatielid (bv. een therapeut) vandaag wel de
-- `training_schemas`-rij van een patiënt lezen (via can_access_patient),
-- maar niet zien welke oefeningen daaraan gekoppeld zijn. Klein, gericht
-- fixje, geen datawijziging.

drop policy if exists training_schema_exercises_all_own on public.training_schema_exercises;

create policy training_schema_exercises_select_accessible
  on public.training_schema_exercises for select
  using (exists (
    select 1 from public.training_schemas s
    where s.id = schema_id and public.can_access_patient(s.patient_id)
  ));

create policy training_schema_exercises_insert_own
  on public.training_schema_exercises for insert
  with check (exists (
    select 1 from public.training_schemas s
    where s.id = schema_id and public.can_manage_patient(s.patient_id)
  ));

create policy training_schema_exercises_update_own
  on public.training_schema_exercises for update
  using (exists (
    select 1 from public.training_schemas s
    where s.id = schema_id and public.can_manage_patient(s.patient_id)
  ))
  with check (exists (
    select 1 from public.training_schemas s
    where s.id = schema_id and public.can_manage_patient(s.patient_id)
  ));

create policy training_schema_exercises_delete_own
  on public.training_schema_exercises for delete
  using (exists (
    select 1 from public.training_schemas s
    where s.id = schema_id and public.can_manage_patient(s.patient_id)
  ));

notify pgrst, 'reload schema';
