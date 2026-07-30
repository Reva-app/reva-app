-- 075_herstelplan_terminologie.sql
-- "Protocol" wordt in de hele UI "Herstelplan" (klinkt minder klinisch,
-- past beter bij de patiëntgerichte toon van de app). De twee foutmeldingen
-- hieronder worden ongewijzigd doorgegeven aan de gebruiker (zie
-- assignProtocolToPatient() in lib/services/protocolService.ts:
-- `return { error: error.message || "Toewijzen van het herstelplan is niet gelukt." }`
-- — error.message heeft voorrang), dus moeten in lockstep met de UI-tekst
-- wijzigen. Verder volledig ongewijzigd t.o.v. migratie 054 — alleen de
-- twee exception-teksten zijn aangepast.

create or replace function public.assign_protocol_to_patient(p_patient_id uuid, p_protocol_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_protocol_scope text;
  v_protocol_org_id uuid;
  v_protocol_name text;
  v_protocol_injury_category text;
  v_patient_protocol_id uuid;
  v_phase record;
  v_new_phase_id uuid;
  v_is_first_phase boolean := true;
  v_link record;
  v_new_schedule_id uuid;
  v_schedule_exercise record;
  v_criterion record;
  v_milestone record;
  v_education record;
begin
  select organization_id into v_org_id from public.patients where id = p_patient_id;
  if v_org_id is null then
    raise exception 'Patiënt niet gevonden';
  end if;

  if not public.can_manage_org_patients(v_org_id) then
    raise exception 'Geen toegang';
  end if;

  select scope, organization_id, name, injury_category
    into v_protocol_scope, v_protocol_org_id, v_protocol_name, v_protocol_injury_category
  from public.protocols
  where id = p_protocol_id and not archived;

  if v_protocol_name is null then
    raise exception 'Herstelplan niet gevonden of gearchiveerd';
  end if;
  if not (v_protocol_scope = 'reva' or v_protocol_org_id = v_org_id) then
    raise exception 'Herstelplan hoort niet bij deze organisatie';
  end if;

  update public.patient_protocols
  set status = 'archived', updated_at = now()
  where patient_id = p_patient_id and status in ('active', 'paused');

  insert into public.patient_protocols
    (patient_id, source_protocol_id, name, injury_category, status, assigned_by, assigned_at)
  values
    (p_patient_id, p_protocol_id, v_protocol_name, v_protocol_injury_category, 'active', auth.uid(), now())
  returning id into v_patient_protocol_id;

  for v_phase in
    select * from public.protocol_phases where protocol_id = p_protocol_id order by sort_order asc
  loop
    insert into public.patient_protocol_phases
      (patient_protocol_id, source_phase_id, sort_order, name, description, therapist_notes, status, started_at, forbidden_activities)
    values
      (v_patient_protocol_id, v_phase.id, v_phase.sort_order, v_phase.name, v_phase.description, v_phase.therapist_notes,
       case when v_is_first_phase then 'active' else 'not_started' end,
       case when v_is_first_phase then now() else null end,
       v_phase.forbidden_activities)
    returning id into v_new_phase_id;

    v_is_first_phase := false;

    for v_criterion in
      select * from public.protocol_phase_criteria where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_criteria (phase_id, source_criterion_id, description, sort_order)
      values (v_new_phase_id, v_criterion.id, v_criterion.description, v_criterion.sort_order);
    end loop;

    for v_milestone in
      select * from public.protocol_phase_milestones where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_milestones (phase_id, source_milestone_id, title, sort_order)
      values (v_new_phase_id, v_milestone.id, v_milestone.title, v_milestone.sort_order);
    end loop;

    for v_education in
      select * from public.protocol_phase_education_items where phase_id = v_phase.id order by sort_order asc
    loop
      insert into public.patient_protocol_phase_education_items
        (phase_id, source_item_id, title, body, media_path, media_type, sort_order)
      values
        (v_new_phase_id, v_education.id, v_education.title, v_education.body, v_education.media_path, v_education.media_type, v_education.sort_order);
    end loop;

    for v_link in
      select spsl.frequency_per_week, spsl.sort_order, sl.id as schedule_library_id, sl.title
      from public.protocol_phase_schedule_links spsl
      join public.schedule_library sl on sl.id = spsl.schedule_id
      where spsl.phase_id = v_phase.id
      order by spsl.sort_order asc
    loop
      insert into public.patient_protocol_schedules (phase_id, source_schedule_id, title, frequency_per_week, sort_order)
      values (v_new_phase_id, v_link.schedule_library_id, v_link.title, v_link.frequency_per_week, v_link.sort_order)
      returning id into v_new_schedule_id;

      for v_schedule_exercise in
        select
          se.exercise_id, se.sort_order, se.prescribed_sets, se.prescribed_reps,
          se.prescribed_duration_seconds, se.prescribed_load_text, se.prescription_note,
          e.title as ex_title, e.description as ex_description, e.instructions as ex_instructions,
          e.media_path as ex_media_path, e.media_type as ex_media_type
        from public.schedule_library_exercises se
        join public.exercise_library e on e.id = se.exercise_id
        where se.schedule_id = v_link.schedule_library_id
        order by se.sort_order asc
      loop
        insert into public.patient_protocol_schedule_exercises
          (schedule_id, source_exercise_id, sort_order, title, description, instructions, media_path, media_type,
           prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note)
        values
          (v_new_schedule_id, v_schedule_exercise.exercise_id, v_schedule_exercise.sort_order,
           v_schedule_exercise.ex_title, v_schedule_exercise.ex_description, v_schedule_exercise.ex_instructions,
           v_schedule_exercise.ex_media_path, v_schedule_exercise.ex_media_type,
           v_schedule_exercise.prescribed_sets, v_schedule_exercise.prescribed_reps, v_schedule_exercise.prescribed_duration_seconds,
           v_schedule_exercise.prescribed_load_text, v_schedule_exercise.prescription_note);
      end loop;
    end loop;
  end loop;

  return v_patient_protocol_id;
end;
$$;
