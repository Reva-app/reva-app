-- 088_patient_intakes.sql
-- Gestructureerde intake, ingevuld door de fysiotherapeut tijdens het
-- aanmaken van een patiënt (PatientWizard, nieuwe "Intake"-stap). Voedt de
-- regel-gebaseerde REVA Analyse (lib/intakeAnalysis.ts) en bewaart de door
-- de therapeut goedgekeurde AI-samenvatting/aandachtspunten/aanbeveling
-- voor later hergebruik (bv. EPD-export). Eén intake per patiënt (v1),
-- vandaar unique(patient_id) — geen historiek/versies.
--
-- staged_goals bewaart de door de therapeut bevestigde hersteldoelen totdat
-- de patiënt een eigen auth.users-rij heeft (zie migratie 091,
-- copy_intake_goals_to_patient) — op intake-tijd bestaat die rij nog niet,
-- dus kunnen de doelen nog niet direct in de user_id-gebonden goals-tabel.
--
-- Patroon voor tabelvorm/RLS: patient_staff_notes (076) + can_manage_org_patients (034).

create table if not exists public.patient_intakes (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,

  pain_score_now  smallint check (pain_score_now between 0 and 10),
  swelling        text check (swelling in ('none', 'mild', 'significant')),
  pain_location   text,

  mobility_aid          text check (mobility_aid in ('none', 'one_crutch', 'two_crutches', 'walker', 'wheelchair', 'other')),
  weight_bearing_status  text check (weight_bearing_status in ('full', 'partial', 'non_weight_bearing')),
  rom_degrees            smallint,
  additional_procedures  text,

  return_to_sport_goal  boolean not null default false,
  sport_type             text,
  return_to_work_goal    boolean not null default false,
  goal_timeframe_months  smallint,
  patient_goal_text      text,
  therapist_observations text,

  -- Door de therapeut goedgekeurde REVA Analyse-output (§2 van het plan).
  ai_summary                   text,
  ai_attention_points          jsonb not null default '[]'::jsonb,
  ai_recommended_protocol_id   uuid references public.protocols(id) on delete set null,
  ai_recommendation_reasoning  text,

  staged_goals     jsonb not null default '[]'::jsonb,
  goals_copied_at  timestamptz,

  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (patient_id)
);

create index if not exists patient_intakes_organization_id_idx
  on public.patient_intakes (organization_id);

-- set_updated_at() bestaat al sinds schema.sql — direct hergebruiken.
create trigger set_patient_intakes_updated_at
  before update on public.patient_intakes
  for each row execute function public.set_updated_at();

alter table public.patient_intakes enable row level security;

create policy "Organisatielid leest intake van eigen organisatie"
  on public.patient_intakes for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy "Bevoegd lid maakt intake aan"
  on public.patient_intakes for insert
  with check (public.can_manage_org_patients(organization_id));

create policy "Bevoegd lid wijzigt intake"
  on public.patient_intakes for update
  using (public.can_manage_org_patients(organization_id))
  with check (public.can_manage_org_patients(organization_id));

create policy "Bevoegd lid verwijdert intake"
  on public.patient_intakes for delete
  using (public.can_manage_org_patients(organization_id));

notify pgrst, 'reload schema';
