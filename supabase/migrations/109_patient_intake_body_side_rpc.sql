-- 109_patient_intake_body_side_rpc.sql
-- patient_intakes heeft bewust GEEN patiënt-eigen RLS-policy (migratie 088)
-- — het blijft dossier-only voor staff, o.a. omdat het therapist_observations
-- en ongereviewde AI-tekst bevat die niet zomaar rechtstreeks aan de patiënt
-- getoond moet worden. Voor "Mijn Gegevens" (patiënt-dashboard) is er nu wel
-- één concreet, onschadelijk veld nodig: de operatiezijde (body_side). In
-- plaats van de RLS op de hele tabel te verruimen, een gerichte SECURITY
-- DEFINER RPC die uitsluitend dat veld teruggeeft voor de eigen intake.

create or replace function public.load_own_intake_body_side()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body_side text;
begin
  select pi.body_side into v_body_side
  from public.patient_intakes pi
  join public.patients p on p.id = pi.patient_id
  where p.user_id = auth.uid()
  order by pi.completed_at desc nulls last
  limit 1;

  return v_body_side;
end;
$$;

grant execute on function public.load_own_intake_body_side() to authenticated;
