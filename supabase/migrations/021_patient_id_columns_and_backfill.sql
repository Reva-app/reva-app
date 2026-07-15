-- 021_patient_id_columns_and_backfill.sql
-- REVA v2 — Fase 1: voegt een nullable `patient_id`-kolom toe aan elke
-- patiëntgebonden tabel en backfilt die vanuit `patients` (via user_id, die
-- inmiddels voor elke bestaande gebruiker een patiëntrecord heeft — migratie
-- 020). Zie docs/REVA-V2-MASTERPLAN.md §20 Fase 1.
--
-- Bewust alleen `patient_id`, niet ook organization_id/location_id op elke
-- rij: die zijn triviaal af te leiden via een join naar `patients`
-- (patients.organization_id / patients.location_id). Drie kolommen per rij
-- denormaliseren is een RLS-performance-optimalisatie voor grote schaal —
-- dezelfde afweging als de JWT-custom-claims-beslissing (masterplan §22
-- besluit 4): nu niet nodig, later toe te voegen zonder architectuurwijziging
-- als het echt nodig blijkt.
--
-- Bestaande RLS-policies (auth.uid() = user_id) blijven in deze migratie
-- ONGEWIJZIGD — patient_id is puur additief en wordt door de bestaande app
-- nog niet gebruikt. De RLS-omzetting naar het tenant-model is een aparte,
-- toekomstige stap met een expliciet go/no-go-moment (masterplan roadmap
-- sprint 5).

-- ── 1. Kolommen toevoegen (nullable) ────────────────────────────────────────

alter table public.checkins              add column if not exists patient_id uuid references public.patients(id);
alter table public.appointments          add column if not exists patient_id uuid references public.patients(id);
alter table public.training_exercises    add column if not exists patient_id uuid references public.patients(id);
alter table public.training_schemas      add column if not exists patient_id uuid references public.patients(id);
alter table public.training_logs         add column if not exists patient_id uuid references public.patients(id);
alter table public.medication_logs       add column if not exists patient_id uuid references public.patients(id);
alter table public.medication_schedules  add column if not exists patient_id uuid references public.patients(id);
alter table public.goals                 add column if not exists patient_id uuid references public.patients(id);
alter table public.milestones            add column if not exists patient_id uuid references public.patients(id);
alter table public.dossier_documents     add column if not exists patient_id uuid references public.patients(id);
alter table public.dossier_photo_updates add column if not exists patient_id uuid references public.patients(id);
alter table public.dossier_contacts      add column if not exists patient_id uuid references public.patients(id);

-- ── 2. Backfill: patient_id = patients.id waar patients.user_id = tabel.user_id ──

update public.checkins              t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.appointments          t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.training_exercises    t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.training_schemas      t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.training_logs         t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.medication_logs       t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.medication_schedules  t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.goals                 t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.milestones            t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.dossier_documents     t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.dossier_photo_updates t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;
update public.dossier_contacts      t set patient_id = p.id from public.patients p where p.user_id = t.user_id and t.patient_id is null;

-- ── 3. Indexen voor toekomstige org/location-gescoopte queries via patients-join ──

create index if not exists checkins_patient_id_idx              on public.checkins(patient_id);
create index if not exists appointments_patient_id_idx          on public.appointments(patient_id);
create index if not exists training_exercises_patient_id_idx    on public.training_exercises(patient_id);
create index if not exists training_schemas_patient_id_idx      on public.training_schemas(patient_id);
create index if not exists training_logs_patient_id_idx         on public.training_logs(patient_id);
create index if not exists medication_logs_patient_id_idx       on public.medication_logs(patient_id);
create index if not exists medication_schedules_patient_id_idx  on public.medication_schedules(patient_id);
create index if not exists goals_patient_id_idx                 on public.goals(patient_id);
create index if not exists milestones_patient_id_idx            on public.milestones(patient_id);
create index if not exists dossier_documents_patient_id_idx     on public.dossier_documents(patient_id);
create index if not exists dossier_photo_updates_patient_id_idx on public.dossier_photo_updates(patient_id);
create index if not exists dossier_contacts_patient_id_idx      on public.dossier_contacts(patient_id);

-- ── 4. Verificatie: iedere rij moet nu een patient_id hebben ────────────────
-- Als dat niet zo is (bv. een user_id zonder bijbehorend patiëntrecord),
-- faalt de hele migratie expliciet in plaats van stil data te missen.

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
    raise exception 'Fase 1 backfill onvolledig: % rijen zonder patient_id na backfill', v_missing;
  end if;
end;
$$;
