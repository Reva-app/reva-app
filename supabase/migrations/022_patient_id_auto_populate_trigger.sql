-- 022_patient_id_auto_populate_trigger.sql
-- REVA v2 — Fase 1: zorgt dat NIEUWE rijen ook altijd een patient_id krijgen,
-- ZONDER dat de bestaande applicatiecode (lib/services/*.ts) hoeft te weten
-- dat patient_id bestaat. De huidige service-laag stuurt alleen user_id mee
-- bij een insert; deze trigger vult patient_id automatisch aan op basis
-- daarvan. Dit is wat migratie 023 (NOT NULL) veilig maakt zonder dat er
-- eerst app-code aangepast hoeft te worden — precies de eis "geen zichtbare
-- impact voor gebruikers" uit docs/REVA-V2-MASTERPLAN.md §20 Fase 1.
--
-- Zodra de service-laag in Fase 3 daadwerkelijk patient_id-bewust wordt
-- (therapeut wijst een protocol toe aan een specifieke patiënt), blijft deze
-- trigger gewoon werken als fallback voor writes die alleen user_id kennen.

create or replace function public.set_patient_id_from_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.patient_id is null then
    select id into new.patient_id from public.patients where user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger set_checkins_patient_id              before insert on public.checkins              for each row execute function public.set_patient_id_from_user_id();
create trigger set_appointments_patient_id          before insert on public.appointments          for each row execute function public.set_patient_id_from_user_id();
create trigger set_training_exercises_patient_id    before insert on public.training_exercises    for each row execute function public.set_patient_id_from_user_id();
create trigger set_training_schemas_patient_id      before insert on public.training_schemas      for each row execute function public.set_patient_id_from_user_id();
create trigger set_training_logs_patient_id         before insert on public.training_logs         for each row execute function public.set_patient_id_from_user_id();
create trigger set_medication_logs_patient_id       before insert on public.medication_logs       for each row execute function public.set_patient_id_from_user_id();
create trigger set_medication_schedules_patient_id  before insert on public.medication_schedules  for each row execute function public.set_patient_id_from_user_id();
create trigger set_goals_patient_id                 before insert on public.goals                 for each row execute function public.set_patient_id_from_user_id();
create trigger set_milestones_patient_id            before insert on public.milestones            for each row execute function public.set_patient_id_from_user_id();
create trigger set_dossier_documents_patient_id     before insert on public.dossier_documents     for each row execute function public.set_patient_id_from_user_id();
create trigger set_dossier_photo_updates_patient_id before insert on public.dossier_photo_updates for each row execute function public.set_patient_id_from_user_id();
create trigger set_dossier_contacts_patient_id      before insert on public.dossier_contacts      for each row execute function public.set_patient_id_from_user_id();
