-- 108_faseovergang_checkin.sql
-- Korte, fysio-ingevulde check-in bij het markeren van een fase als voltooid
-- (zie advanceToNextPhase in lib/services/protocolService.ts): pijnscore nu
-- en een vrije notitie, vastgelegd op de fase die wordt afgesloten — naast
-- de al bestaande criteria-/mijlpaalafvinklijst, die alleen "af/niet af"
-- vastlegt en geen context over hoe de fase daadwerkelijk verliep.
--
-- Bewust op patient_protocol_phases (niet op patient_protocol_phase_milestones,
-- die al ongebruikte reflection_text/pain_score-kolommen heeft sinds migratie
-- 049) — dit is één check-in per faseovergang, geen per-mijlpaal-check-in.

alter table public.patient_protocol_phases
  add column if not exists transition_pain_score smallint check (transition_pain_score is null or transition_pain_score between 0 and 10),
  add column if not exists transition_note text;

notify pgrst, 'reload schema';
