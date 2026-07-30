-- 069_performance_indexes.sql
-- Database-audit: 10 van de 12 legacy patiënttabellen hadden geen index op
-- user_id, terwijl elke Patient Portal-pagina daar exact op filtert
-- (.eq("user_id", ...).order("date", ...)). checkins/settings hebben al een
-- unique(user_id[, date])-constraint die dit al dekt, vandaar niet hieronder.
-- Composite (user_id, date) op tabellen mét een date-kolom; anders plain
-- (user_id). Volledig additief, geen datawijzigingen.

create index if not exists appointments_user_id_date_idx          on public.appointments(user_id, date);
create index if not exists training_logs_user_id_date_idx         on public.training_logs(user_id, date);
create index if not exists medication_logs_user_id_date_idx       on public.medication_logs(user_id, date);
create index if not exists dossier_documents_user_id_date_idx     on public.dossier_documents(user_id, date);
create index if not exists dossier_photo_updates_user_id_date_idx on public.dossier_photo_updates(user_id, date);

create index if not exists training_exercises_user_id_idx    on public.training_exercises(user_id);
create index if not exists training_schemas_user_id_idx      on public.training_schemas(user_id);
create index if not exists medication_schedules_user_id_idx  on public.medication_schedules(user_id);
create index if not exists goals_user_id_idx                 on public.goals(user_id);
create index if not exists milestones_user_id_idx            on public.milestones(user_id);
create index if not exists dossier_contacts_user_id_idx      on public.dossier_contacts(user_id);

-- Praktijkkant — de patient_id-indexen uit migratie 021 uitbreiden naar
-- composite (patient_id, date) voor de tabellen die portalService.ts met een
-- datumbereik bevraagt (o.a. loadPortalPatientExtras).
drop index if exists public.checkins_patient_id_idx;
create index checkins_patient_id_date_idx on public.checkins(patient_id, date);

drop index if exists public.appointments_patient_id_idx;
create index appointments_patient_id_date_idx on public.appointments(patient_id, date);

drop index if exists public.training_logs_patient_id_idx;
create index training_logs_patient_id_date_idx on public.training_logs(patient_id, date);

drop index if exists public.medication_logs_patient_id_idx;
create index medication_logs_patient_id_date_idx on public.medication_logs(patient_id, date);

drop index if exists public.dossier_documents_patient_id_idx;
create index dossier_documents_patient_id_date_idx on public.dossier_documents(patient_id, date);

drop index if exists public.dossier_photo_updates_patient_id_idx;
create index dossier_photo_updates_patient_id_date_idx on public.dossier_photo_updates(patient_id, date);
