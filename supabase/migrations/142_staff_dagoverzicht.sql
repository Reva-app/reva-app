-- 142_staff_dagoverzicht.sql
-- Dagelijks overzicht als pushmelding voor behandelaars (werkdagen 08:00).
--
-- Bewust één rustige melding per dag en geen melding per check-in: een
-- fysio heeft tientallen patiënten, en losse meldingen worden snel ruis.
-- Geen melding als er niets is: stilte betekent dat alles rustig is.
--
-- Telt per medewerker met een pushabonnement (migratie 141), over de eigen
-- actieve patiënten:
--   * intakes_submitted: zelf ingevulde intakes die op een herstelplan wachten
--   * signal_patients:   patiënten met een signaal in een check-in sinds
--                        p_since (pijn >= 7, zwelling of dagscore <= 2;
--                        zelfde drempels als lib/services/portalService.ts)
-- Alleen aantallen, nooit namen: de melding staat op het vergrendelscherm.
--
-- Alleen aanroepbaar door de service role (Edge Function send-checkin-reminder).

create or replace function public.staff_daily_digest(p_since date)
returns table(user_id uuid, intakes_submitted integer, signal_patients integer)
language sql
stable
security definer
set search_path = public
as $$
  with staff as (
    select distinct w.user_id
    from public.web_push_subscriptions w
    join public.memberships m on m.user_id = w.user_id and m.status = 'active'
  )
  select
    s.user_id,
    (select count(distinct i.patient_id)::int
       from public.patients p
       join public.patient_intakes i on i.patient_id = p.id and i.status = 'submitted'
      where p.assigned_therapist_id = s.user_id and p.status = 'active'),
    (select count(distinct c.patient_id)::int
       from public.patients p
       join public.checkins c on c.patient_id = p.id and c.date >= p_since
      where p.assigned_therapist_id = s.user_id and p.status = 'active'
        and (c.pain_score >= 7 or c.swelling is true or c.day_score <= 2))
  from staff s;
$$;

revoke execute on function public.staff_daily_digest(date) from public, anon, authenticated;
grant execute on function public.staff_daily_digest(date) to service_role;
