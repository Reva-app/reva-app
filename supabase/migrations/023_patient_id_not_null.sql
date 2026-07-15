-- 023_patient_id_not_null.sql
-- REVA v2 — Fase 1: patient_id verplicht maken. Veilig omdat (a) migratie 021
-- al geverifieerd heeft dat elke bestaande rij een patient_id heeft, en (b)
-- migratie 022 een BEFORE INSERT-trigger heeft toegevoegd die patient_id
-- automatisch vult voor elke nieuwe rij — de bestaande app-code hoeft dus
-- niets te weten van patient_id om te blijven werken.
--
-- Herhaalt de nulcheck uit migratie 021 nog eens vlak vóór de constraint
-- wordt gezet, voor de zekerheid.

do $$
declare
  v_missing bigint;
begin
  select
    (select count(*) from public.checkins where patient_id is null) +
    (select count(*) from public.appointments where patient_id is null) +
    (select count(*) from public.training_exercises where patient_id is null) +
    (select count(*) from public.training_schemas where patient_id is null) +
    (select count(*) from public.training_logs where patient_id is null) +
    (select count(*) from public.medication_logs where patient_id is null) +
    (select count(*) from public.medication_schedules where patient_id is null) +
    (select count(*) from public.goals where patient_id is null) +
    (select count(*) from public.milestones where patient_id is null) +
    (select count(*) from public.dossier_documents where patient_id is null) +
    (select count(*) from public.dossier_photo_updates where patient_id is null) +
    (select count(*) from public.dossier_contacts where patient_id is null)
  into v_missing;

  if v_missing > 0 then
    raise exception 'Kan patient_id niet NOT NULL maken: % rijen hebben nog geen patient_id', v_missing;
  end if;
end;
$$;

alter table public.checkins              alter column patient_id set not null;
alter table public.appointments          alter column patient_id set not null;
alter table public.training_exercises    alter column patient_id set not null;
alter table public.training_schemas      alter column patient_id set not null;
alter table public.training_logs         alter column patient_id set not null;
alter table public.medication_logs       alter column patient_id set not null;
alter table public.medication_schedules  alter column patient_id set not null;
alter table public.goals                 alter column patient_id set not null;
alter table public.milestones            alter column patient_id set not null;
alter table public.dossier_documents     alter column patient_id set not null;
alter table public.dossier_photo_updates alter column patient_id set not null;
alter table public.dossier_contacts      alter column patient_id set not null;

notify pgrst, 'reload schema';
