-- 144: pijn per oefening mag 0 zijn.
--
-- De trainingsmodus (components/training/WorkoutPlayer.tsx) laat de patiënt
-- pijn kiezen op een schaal van 0 tot 10, maar de check uit migratie 050
-- stond alleen 1 tot en met 10 toe. Koos iemand 0 ("geen pijn"), dan
-- mislukte het opslaan van de hele training.

alter table public.patient_protocol_exercise_logs
  drop constraint if exists patient_protocol_exercise_logs_pain_score_check;

alter table public.patient_protocol_exercise_logs
  add constraint patient_protocol_exercise_logs_pain_score_check
  check (pain_score is null or pain_score between 0 and 10);
