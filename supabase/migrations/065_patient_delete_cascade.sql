-- 065_patient_delete_cascade.sql
-- Bug: patient_id op de 12 "legacy" klinische tabellen (van vóór de Protocol
-- Engine, migratie 021) heeft geen `on delete cascade` — Postgres' default
-- (`no action`) blokkeert dus het verwijderen van een patients-rij zodra er
-- ook maar één check-in, afspraak, dossierdocument etc. aan hangt. Voor een
-- patiënt die de app daadwerkelijk heeft gebruikt, faalt
-- /api/delete-patient dus gewoon met een foreign-key-fout.
--
-- De nieuwere Protocol Engine-tabellen (patient_protocols e.v., migratie
-- 049/050) hebben dit al goed staan (`on delete cascade`) — deze migratie
-- brengt de 12 oudere tabellen in lijn met dat patroon.
--
-- Constraint-namen volgen Postgres' standaard auto-generated naamgeving voor
-- een inline `references`-kolom (<tabel>_<kolom>_fkey) — zo zijn deze
-- kolommen ook daadwerkelijk aangemaakt in migratie 021.

alter table public.checkins
  drop constraint if exists checkins_patient_id_fkey,
  add constraint checkins_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.appointments
  drop constraint if exists appointments_patient_id_fkey,
  add constraint appointments_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.training_exercises
  drop constraint if exists training_exercises_patient_id_fkey,
  add constraint training_exercises_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.training_schemas
  drop constraint if exists training_schemas_patient_id_fkey,
  add constraint training_schemas_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.training_logs
  drop constraint if exists training_logs_patient_id_fkey,
  add constraint training_logs_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.medication_logs
  drop constraint if exists medication_logs_patient_id_fkey,
  add constraint medication_logs_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.medication_schedules
  drop constraint if exists medication_schedules_patient_id_fkey,
  add constraint medication_schedules_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.goals
  drop constraint if exists goals_patient_id_fkey,
  add constraint goals_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.milestones
  drop constraint if exists milestones_patient_id_fkey,
  add constraint milestones_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.dossier_documents
  drop constraint if exists dossier_documents_patient_id_fkey,
  add constraint dossier_documents_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.dossier_photo_updates
  drop constraint if exists dossier_photo_updates_patient_id_fkey,
  add constraint dossier_photo_updates_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;

alter table public.dossier_contacts
  drop constraint if exists dossier_contacts_patient_id_fkey,
  add constraint dossier_contacts_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;
