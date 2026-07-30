-- 058_patient_care_context.sql
-- Patient Portal-redesign: het dashboard en instellingen moeten de naam van
-- de behandelend fysiotherapeut en de vestiging kunnen tonen aan de patiënt.
-- Zelfde gat als migratie 039 al voor huisstijl dichtte: een patiënt heeft
-- geen directe SELECT-rechten op `organizations` (kvk/btw/contactgegevens
-- zouden lekken), `locations` heeft helemaal geen patiënt-gerichte policy
-- (040_locations_full.sql), en er is geen enkele policy die een patiënt
-- profiles.full_name van zijn eigen behandelaar laat lezen (alle bestaande
-- profiles-leesbeleid is staf-gericht, zie 025/032/041/043). Zelfde
-- oplossing als 039: één smalle, beveiligde RPC i.p.v. bredere policies.

create or replace function public.patient_care_context()
returns table (organization_name text, location_name text, therapist_name text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, l.name, pr.full_name
  from public.patients p
  left join public.organizations o on o.id = p.organization_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles pr on pr.id = p.assigned_therapist_id
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.patient_care_context() to authenticated;
