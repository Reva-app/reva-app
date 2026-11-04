-- 112_faseovergang_uitgebreid.sql
-- Breidt de faseovergang-check-in (migratie 108) uit met drie extra,
-- optionele velden zodat de therapeut bij het afronden van een fase meer
-- vastlegt dan alleen pijnscore + vrije notitie.

alter table public.patient_protocol_phases
  add column if not exists transition_mobility_score smallint check (transition_mobility_score between 0 and 5),
  add column if not exists transition_swelling boolean,
  add column if not exists transition_satisfaction_score smallint check (transition_satisfaction_score between 0 and 5),
  add column if not exists transition_progress_vs_expected text check (transition_progress_vs_expected in ('better', 'as_expected', 'harder'));

notify pgrst, 'reload schema';
