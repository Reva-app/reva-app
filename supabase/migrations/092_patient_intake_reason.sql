-- 092_patient_intake_reason.sql
-- Uitbreiding op de intake (migratie 088) met feedback na de eerste versie:
-- een verplichte "waarvoor komt de patiënt?"-vraag vooraf aan het bestaande
-- blessuretype (nieuwe wizardstap "Aanleiding"), plus een uitgebreidere
-- achtergrond-sectie in de Intake-stap zelf. visit_reason is bewust een
-- eigen kolom naast patients.injury_type — het antwoord op "waarvoor komt
-- de patiënt" (operatie/sportblessure/chronisch/overbelasting/revalidatie/
-- anders) is geen blessuretype maar context die de REVA Analyse-samenvatting
-- en aandachtspunten mee laat kleuren (zie lib/intakeAnalysis.ts).

alter table public.patient_intakes
  add column if not exists visit_reason text check (visit_reason in ('surgery', 'sports_injury', 'chronic_complaint', 'overuse', 'rehabilitation', 'other')),
  add column if not exists symptom_onset text check (symptom_onset in ('lt_2_weeks', '2_6_weeks', '6_12_weeks', 'gt_3_months')),
  add column if not exists previous_treatment_text text,
  add column if not exists daily_impact text check (daily_impact in ('none', 'mild', 'moderate', 'severe'));

notify pgrst, 'reload schema';
