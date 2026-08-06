-- 111_patient_intake_summary_rpc.sql
-- Zelfde patroon als migratie 109 (load_own_intake_body_side): patient_intakes
-- blijft dossier-only (geen patiënt-RLS), maar voor het dynamische
-- dashboard (kernstatistieken per aandoening) heeft de patiënt nu een
-- gerichte set onschadelijke, feitelijke velden nodig: hulpmiddel,
-- belasting, ROM bij intake, en sport-/werkdoelen. Nadrukkelijk NIET
-- meegegeven: ai_summary, ai_attention_points, therapist_observations,
-- pain_location, additional_procedures — dat blijft staff-only.

create or replace function public.load_own_intake_summary()
returns table (
  mobility_aid text,
  weight_bearing_status text,
  rom_degrees smallint,
  return_to_sport_goal boolean,
  sport_type text,
  return_to_work_goal boolean,
  goal_timeframe_months smallint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select pi.mobility_aid, pi.weight_bearing_status, pi.rom_degrees,
         pi.return_to_sport_goal, pi.sport_type, pi.return_to_work_goal, pi.goal_timeframe_months
  from public.patient_intakes pi
  join public.patients p on p.id = pi.patient_id
  where p.user_id = auth.uid()
  order by pi.completed_at desc nulls last
  limit 1;
end;
$$;

grant execute on function public.load_own_intake_summary() to authenticated;

notify pgrst, 'reload schema';
