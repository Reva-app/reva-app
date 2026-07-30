-- 072_patient_injury_date.sql
-- De praktijk kon tot nu toe wel een operatiedatum vastleggen bij een
-- patiëntdossier (surgery_date, migratie 034), maar geen blessuredatum —
-- die bestond alleen aan de patiëntkant (settings.injury_date). Nu de
-- praktijk ook de blessuredatum moet kunnen vastleggen (net als al gebeurt
-- voor injury_type, migratie 054), krijgt patients zijn eigen kolom, met
-- hetzelfde eenrichtings-syncpatroon naar settings.

alter table public.patients
  add column if not exists injury_date date;

create or replace function public.sync_settings_from_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.settings (user_id, birth_date, surgery_date, injury_type, injury_date)
  values (new.user_id, new.date_of_birth, new.surgery_date, new.injury_type, new.injury_date)
  on conflict (user_id) do update
    set birth_date   = excluded.birth_date,
        surgery_date = excluded.surgery_date,
        injury_type  = excluded.injury_type,
        injury_date  = excluded.injury_date;

  return new;
end;
$$;

drop trigger if exists patients_sync_settings on public.patients;

create trigger patients_sync_settings
after insert or update of user_id, date_of_birth, surgery_date, injury_type, injury_date on public.patients
for each row
execute function public.sync_settings_from_patient();

-- patient_care_context() (migratie 068) uitbreiden zodat het patiëntdashboard
-- kan zien of de praktijk deze datums al heeft vastgelegd (voor de
-- read-only weergave, zelfde patroon als careContext.injuryType).
-- Rijvorm verandert (2 extra kolommen) — Postgres staat dan geen
-- CREATE OR REPLACE toe, dus eerst expliciet droppen.
drop function if exists public.patient_care_context();

create function public.patient_care_context()
returns table (
  organization_name text,
  location_name text,
  therapist_name text,
  injury_type text,
  injury_date date,
  surgery_date date,
  therapist_phone text,
  therapist_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, l.name, pr.full_name, p.injury_type, p.injury_date, p.surgery_date, pr.phone, au.email
  from public.patients p
  left join public.organizations o on o.id = p.organization_id
  left join public.locations l on l.id = p.location_id
  left join public.profiles pr on pr.id = p.assigned_therapist_id
  left join auth.users au on au.id = pr.id
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.patient_care_context() to authenticated;

notify pgrst, 'reload schema';
