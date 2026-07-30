-- 062_patient_care_context_injury_type.sql
-- Uitbreiding van patient_care_context() (migratie 058) met injury_type:
-- de Patient Portal moet kunnen weten of de fysiopraktijk al een
-- blessuretype heeft ingevuld bij het aanmaken van het dossier, zodat dat
-- veld voor de patiënt read-only getoond kan worden (de patiënt hoeft/mag
-- dat niet meer zelf te wijzigen als de praktijk het al heeft vastgelegd).

drop function if exists public.patient_care_context();

create or replace function public.patient_care_context()
returns table (organization_name text, location_name text, therapist_name text, injury_type text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, l.name, pr.full_name, p.injury_type
  from public.patients p
  left join public.organizations o on o.id = p.organization_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles pr on pr.id = p.assigned_therapist_id
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.patient_care_context() to authenticated;
