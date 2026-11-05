-- 132: "Mijn patiënten" op het portal-dashboard in één databasevraag.
--
-- Voorheen haalde de portal ALLE check-ins van alle patiënten van een
-- behandelaar op om per patiënt de laatste te vinden. Supabase geeft maximaal
-- 1000 rijen terug: bij een volle praktijk vielen check-ins weg, waardoor
-- patiënten onterecht als "Weinig activiteit" konden verschijnen of een
-- signaal (hoge pijn, zwelling) werd gemist. Daarnaast werd de lijst met
-- patiënt-id's in de URL meegestuurd, wat bij honderden patiënten te lang wordt.
--
-- Deze functie geeft per actieve patiënt van de ingelogde behandelaar precies
-- één rij terug met de laatste check-in (via de index op (patient_id, date))
-- en het aantal check-ins van de afgelopen 7 dagen.
--
-- SECURITY INVOKER: draait met de rechten van de aanroeper, dus alle
-- RLS-policies (can_access_patient, profiles, aal2) gelden gewoon.

create or replace function public.portal_my_patients_summary(p_organization_id uuid)
returns table(
  patient_id        uuid,
  full_name         text,
  created_at        timestamptz,
  last_checkin_date date,
  last_pain_score   integer,
  last_swelling     boolean,
  last_day_score    integer,
  checkins_last_7d  integer
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    p.id,
    coalesce(pr.full_name, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')),
    p.created_at,
    lc.date,
    lc.pain_score,
    lc.swelling,
    lc.day_score,
    (select count(*)::int from public.checkins c7
      where c7.patient_id = p.id and c7.date >= current_date - 6)
  from public.patients p
  left join public.profiles pr on pr.id = p.user_id
  left join lateral (
    select c.date, c.pain_score, c.swelling, c.day_score
    from public.checkins c
    where c.patient_id = p.id
    order by c.date desc
    limit 1
  ) lc on true
  where p.organization_id = p_organization_id
    and p.assigned_therapist_id = auth.uid()
    and p.status = 'active';
$$;

revoke execute on function public.portal_my_patients_summary(uuid) from public, anon;
grant execute on function public.portal_my_patients_summary(uuid) to authenticated;
