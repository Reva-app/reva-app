-- 068_patient_care_context_therapist_contact.sql
-- Uitbreiding van patient_care_context() (migratie 058/062) met telefoon en
-- e-mail van de behandelend fysiotherapeut, zodat de Patient Portal deze
-- automatisch kan tonen als contactpersoon in het dossier (naast de al
-- bestaande organisatie-/vestiging-/behandelaarnaam en blessuretype).
-- Telefoon staat al op profiles (zelfde join als therapist_name); e-mail
-- staat alleen in auth.users, vandaar de extra join — mag hier via
-- security definer, net als de rest van deze functie.

drop function if exists public.patient_care_context();

create or replace function public.patient_care_context()
returns table (
  organization_name text,
  location_name text,
  therapist_name text,
  injury_type text,
  therapist_phone text,
  therapist_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, l.name, pr.full_name, p.injury_type, pr.phone, au.email
  from public.patients p
  left join public.organizations o on o.id = p.organization_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles pr on pr.id = p.assigned_therapist_id
  left join auth.users au on au.id = pr.id
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.patient_care_context() to authenticated;
