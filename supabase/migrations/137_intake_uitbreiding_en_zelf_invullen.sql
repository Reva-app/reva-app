-- 137_intake_uitbreiding_en_zelf_invullen.sql
-- Intake (november 2026):
--   1. Inhoud van een volwaardige intake: ontstaan, beloop, pijn, werk,
--      sport, voorgeschiedenis, medicatie, beeldvorming, verwijzing,
--      rode vlaggen, zorgen over bewegen, slaap en verwachting. Alles
--      optioneel. (rom_degrees blijft bestaan voor oude intakes, maar wordt
--      niet meer gevraagd.)
--   2. De patiënt kan de intake zelf invullen in de app, na het inloggen
--      (dus achter wachtwoord + tweestapsverificatie). De fysio kiest
--      daarna altijd zelf het herstelplan.
--   3. Een eigen herstelplan per patiënt (bijv. bij "Anders"): eerste fase
--      direct bij de intake, later meer fases toe te voegen.

begin;

-- ── 1. Nieuwe intakevelden + status ─────────────────────────────────────────
alter table public.patient_intakes
  add column if not exists onset_mechanism    text check (onset_mechanism in ('sudden', 'gradual', 'after_surgery', 'unknown')),
  add column if not exists injury_description text,
  add column if not exists symptom_course     text check (symptom_course in ('improving', 'stable', 'worsening', 'fluctuating')),
  add column if not exists pain_worst         smallint check (pain_worst between 0 and 10),
  add column if not exists night_pain         boolean,
  add column if not exists pain_triggers      text,
  add column if not exists occupation         text,
  add column if not exists work_load          text check (work_load in ('sedentary', 'standing', 'physical', 'not_working')),
  add column if not exists sport_frequency    text check (sport_frequency in ('none', '1_2', '3_4', '5_plus')),
  add column if not exists sport_level        text check (sport_level in ('recreational', 'competitive', 'professional')),
  add column if not exists medical_history    text,
  add column if not exists medication_text    text,
  add column if not exists imaging            text[] not null default '{}',
  add column if not exists referral_source    text check (referral_source in ('direct', 'gp', 'specialist', 'other')),
  add column if not exists red_flags          text[] not null default '{}',
  add column if not exists fear_of_movement   boolean,
  add column if not exists sleep_impact       text check (sleep_impact in ('none', 'some', 'severe')),
  add column if not exists patient_expectation text,
  add column if not exists filled_by          text not null default 'therapist' check (filled_by in ('therapist', 'patient')),
  add column if not exists status             text not null default 'completed' check (status in ('requested', 'submitted', 'completed')),
  add column if not exists requested_at       timestamptz,
  add column if not exists submitted_at       timestamptz;

comment on column public.patient_intakes.status is
  'requested = patiënt moet zelf invullen; submitted = ingevuld door patiënt, fysio moet herstelplan kiezen; completed = afgerond';

-- ── 2. Patiënt: staat er een intake voor mij klaar? ─────────────────────────
create or replace function public.my_pending_intake()
returns table (intake_id uuid, organization_name text, therapist_name text)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, o.name, pr.full_name
  from public.patients p
  join public.patient_intakes i on i.patient_id = p.id and i.status = 'requested'
  left join public.organizations o on o.id = p.organization_id
  left join public.profiles pr on pr.id = p.assigned_therapist_id
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke execute on function public.my_pending_intake() from public, anon;
grant execute on function public.my_pending_intake() to authenticated;

-- ── 3. Patiënt dient de intake in ───────────────────────────────────────────
-- Alleen de eigen, nog openstaande intake; alleen met tweestapsverificatie.
-- Velden die alleen de fysio invult (observaties, AI-uitkomst) worden hier
-- bewust niet geaccepteerd.
create or replace function public.submit_my_intake(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_intake_id uuid;
begin
  if not public.session_has_aal2() then
    raise exception 'Tweestapsverificatie vereist';
  end if;

  select pa.id, i.id into v_patient_id, v_intake_id
  from public.patients pa
  join public.patient_intakes i on i.patient_id = pa.id and i.status = 'requested'
  where pa.user_id = auth.uid()
  limit 1;

  if v_intake_id is null then
    raise exception 'Er staat geen intake voor je klaar';
  end if;

  update public.patient_intakes set
    visit_reason          = nullif(p->>'visitReason', ''),
    body_side             = nullif(p->>'bodySide', ''),
    pregnancy_related     = coalesce((p->>'pregnancyRelated')::boolean, false),
    radiating_pain        = coalesce((p->>'radiatingPain')::boolean, false),
    height_cm             = (p->>'heightCm')::numeric,
    weight_kg             = (p->>'weightKg')::numeric,
    pain_score_now        = (p->>'painScoreNow')::smallint,
    pain_worst            = (p->>'painWorst')::smallint,
    swelling              = nullif(p->>'swelling', ''),
    pain_location         = nullif(trim(p->>'painLocation'), ''),
    night_pain            = (p->>'nightPain')::boolean,
    pain_triggers         = nullif(trim(p->>'painTriggers'), ''),
    mobility_aid          = nullif(p->>'mobilityAid', ''),
    weight_bearing_status = nullif(p->>'weightBearingStatus', ''),
    additional_procedures = nullif(trim(p->>'additionalProcedures'), ''),
    onset_mechanism       = nullif(p->>'onsetMechanism', ''),
    injury_description    = nullif(trim(p->>'injuryDescription'), ''),
    symptom_onset         = nullif(p->>'symptomOnset', ''),
    symptom_course        = nullif(p->>'symptomCourse', ''),
    previous_treatment_text = nullif(trim(p->>'previousTreatmentText'), ''),
    daily_impact          = nullif(p->>'dailyImpact', ''),
    sleep_impact          = nullif(p->>'sleepImpact', ''),
    occupation            = nullif(trim(p->>'occupation'), ''),
    work_load             = nullif(p->>'workLoad', ''),
    sport_frequency       = nullif(p->>'sportFrequency', ''),
    sport_level           = nullif(p->>'sportLevel', ''),
    medical_history       = nullif(trim(p->>'medicalHistory'), ''),
    medication_text       = nullif(trim(p->>'medicationText'), ''),
    imaging               = coalesce(array(select jsonb_array_elements_text(p->'imaging')), '{}'),
    referral_source       = nullif(p->>'referralSource', ''),
    red_flags             = coalesce(array(select jsonb_array_elements_text(p->'redFlags')), '{}'),
    fear_of_movement      = (p->>'fearOfMovement')::boolean,
    return_to_sport_goal  = coalesce((p->>'returnToSportGoal')::boolean, false),
    sport_type            = nullif(trim(p->>'sportType'), ''),
    return_to_work_goal   = coalesce((p->>'returnToWorkGoal')::boolean, false),
    goal_timeframe_months = (p->>'goalTimeframeMonths')::smallint,
    patient_goal_text     = nullif(trim(p->>'patientGoalText'), ''),
    patient_expectation   = nullif(trim(p->>'patientExpectation'), ''),
    filled_by             = 'patient',
    status                = 'submitted',
    submitted_at          = now()
  where id = v_intake_id;

  -- Blessuregegevens op het dossier (synchroniseert via patients_sync_settings
  -- naar de instellingen van de patiënt). Wat de fysio al invulde blijft staan.
  update public.patients set
    injury_type  = coalesce(injury_type, nullif(p->>'injuryType', '')),
    injury_date  = coalesce(injury_date, nullif(p->>'injuryDate', '')::date),
    surgery_date = coalesce(surgery_date, nullif(p->>'surgeryDate', '')::date)
  where id = v_patient_id;
end;
$$;

revoke execute on function public.submit_my_intake(jsonb) from public, anon;
grant execute on function public.submit_my_intake(jsonb) to authenticated;

-- ── 4. Eigen herstelplan voor één patiënt ───────────────────────────────────
-- Zelfde gedrag als assign_protocol_to_patient (vorig plan gearchiveerd,
-- eerste fase actief), maar zonder sjabloon: één fase met een leeg
-- oefenschema, zodat de fysio direct oefeningen kan toevoegen.
create or replace function public.create_custom_patient_protocol(
  p_patient_id uuid, p_name text, p_phase_name text, p_phase_description text, p_frequency_per_week int default 3
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_protocol_id uuid;
  v_phase_id uuid;
begin
  if not public.can_manage_patient_protocol_content(p_patient_id) then
    raise exception 'Geen toegang';
  end if;
  if coalesce(trim(p_phase_name), '') = '' then
    raise exception 'Geef de fase een naam';
  end if;

  update public.patient_protocols
  set status = 'archived', updated_at = now()
  where patient_id = p_patient_id and status in ('active', 'paused');

  insert into public.patient_protocols (patient_id, source_protocol_id, name, injury_category, status, assigned_by, assigned_at)
  values (p_patient_id, null, coalesce(nullif(trim(p_name), ''), 'Eigen herstelplan'), 'custom', 'active', auth.uid(), now())
  returning id into v_protocol_id;

  insert into public.patient_protocol_phases (patient_protocol_id, sort_order, name, description, status, started_at)
  values (v_protocol_id, 0, trim(p_phase_name), nullif(trim(p_phase_description), ''), 'active', now())
  returning id into v_phase_id;

  insert into public.patient_protocol_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase_id, 'Oefeningen', greatest(1, least(coalesce(p_frequency_per_week, 3), 14)), 0);

  return v_protocol_id;
end;
$$;

revoke execute on function public.create_custom_patient_protocol(uuid, text, text, text, int) from public, anon;
grant execute on function public.create_custom_patient_protocol(uuid, text, text, text, int) to authenticated;

-- Fase toevoegen aan het herstelplan van één patiënt (achteraan, nog niet gestart).
create or replace function public.add_patient_protocol_phase(
  p_patient_protocol_id uuid, p_phase_name text, p_phase_description text, p_frequency_per_week int default 3
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_sort int;
  v_phase_id uuid;
begin
  select patient_id into v_patient_id from public.patient_protocols where id = p_patient_protocol_id;
  if v_patient_id is null or not public.can_manage_patient_protocol_content(v_patient_id) then
    raise exception 'Geen toegang';
  end if;
  if coalesce(trim(p_phase_name), '') = '' then
    raise exception 'Geef de fase een naam';
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_sort
  from public.patient_protocol_phases where patient_protocol_id = p_patient_protocol_id;

  insert into public.patient_protocol_phases (patient_protocol_id, sort_order, name, description, status)
  values (p_patient_protocol_id, v_sort, trim(p_phase_name), nullif(trim(p_phase_description), ''), 'not_started')
  returning id into v_phase_id;

  insert into public.patient_protocol_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase_id, 'Oefeningen', greatest(1, least(coalesce(p_frequency_per_week, 3), 14)), 0);

  return v_phase_id;
end;
$$;

revoke execute on function public.add_patient_protocol_phase(uuid, text, text, int) from public, anon;
grant execute on function public.add_patient_protocol_phase(uuid, text, text, int) to authenticated;

commit;

notify pgrst, 'reload schema';
