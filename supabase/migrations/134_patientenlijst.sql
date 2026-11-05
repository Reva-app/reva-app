-- 134: patiëntenlijst van de portal in één databasevraag.
--
-- loadPortalPatients haalde de lijst op in vijf losse vragen, waaronder ALLE
-- check-ins van de praktijk om per patiënt de laatste te vinden. Supabase
-- geeft maximaal 1000 rijen per vraag terug, dus bij een drukke praktijk:
-- - viel een deel van de check-ins weg, waardoor "Laatste check-in" niet
--   klopte en patiënten onterecht als "Weinig activiteit" verschenen;
-- - verdwenen bij meer dan 1000 dossiers ook patiënten uit de lijst zelf;
-- - werden alle patiënt-id's in de URL meegestuurd, wat bij honderden
--   patiënten te lang wordt.
-- Hetzelfde probleem loste migratie 132 al op voor "Mijn patiënten" op het
-- dashboard.
--
-- Deze functie geeft per patiënt van de organisatie één rij met namen,
-- locatie, actief herstelplan en de laatste check-in (via de index op
-- checkins(patient_id, date)) inclusief de signalen daaruit. De aanroeper
-- haalt de rijen op in blokken van 1000 (.range()).
--
-- SECURITY INVOKER: draait met de rechten van de aanroeper, dus alle
-- RLS-policies (can_access_patient, org_is_open, aal2) gelden gewoon.

create or replace function public.portal_patient_list(p_organization_id uuid)
returns table(
  id                 uuid,
  user_id            uuid,
  location_id        uuid,
  status             text,
  created_at         timestamptz,
  full_name          text,
  email              text,
  phone              text,
  gender             text,
  date_of_birth      date,
  invited_at         timestamptz,
  therapist_id       uuid,
  therapist_name     text,
  location_name      text,
  protocol_name      text,
  surgery_date       date,
  injury_date        date,
  injury_type        text,
  discharged_at      timestamptz,
  discharge_outcome  text,
  last_checkin_date  date,
  last_pain_score    integer,
  last_swelling      boolean,
  last_day_score     integer
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    p.id,
    p.user_id,
    p.location_id,
    p.status,
    p.created_at,
    coalesce(pr.full_name, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')),
    coalesce(pr.email, p.email),
    p.phone,
    p.gender,
    p.date_of_birth,
    p.invited_at,
    p.assigned_therapist_id,
    th.full_name,
    l.name,
    pp.name,
    p.surgery_date,
    p.injury_date,
    p.injury_type,
    p.discharged_at,
    p.discharge_outcome,
    lc.date,
    lc.pain_score,
    lc.swelling,
    lc.day_score
  from public.patients p
  left join public.profiles pr on pr.id = p.user_id
  left join public.profiles th on th.id = p.assigned_therapist_id
  left join public.locations l on l.id = p.location_id
  left join public.patient_protocols pp
    on pp.patient_id = p.id and pp.status in ('active', 'paused')
  left join lateral (
    select c.date, c.pain_score, c.swelling, c.day_score
    from public.checkins c
    where c.patient_id = p.id
    order by c.date desc
    limit 1
  ) lc on true
  where p.organization_id = p_organization_id
  order by p.created_at desc, p.id;
$$;

revoke execute on function public.portal_patient_list(uuid) from public, anon;
grant execute on function public.portal_patient_list(uuid) to authenticated;
