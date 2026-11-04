-- 124: twee leesrechten die te ruim stonden (gevonden in de live-export van 2026-11-04).
--
-- 1. staff_calendar_feeds.ics_url is een geheime abonnementslink: wie hem
--    heeft, leest de complete privé-agenda van die medewerker. Tot nu toe kon
--    elk organisatielid (ook receptie) de link van elke collega lezen. Voortaan
--    alleen de medewerker zelf en de Practice Owner — die dekt de bestaande
--    FOR ALL-policy "Practice owner of medewerker zelf beheert agenda-koppeling"
--    al af, dus de brede leespolicy kan simpelweg weg.
--
-- 2. Bucket "avatars": elke ingelogde gebruiker kon alle profielfoto's lezen
--    (en de mapnamen = user-id's opsommen). Omdat iedereen zich kan aanmelden,
--    was dat in feite openbaar. Voortaan: een foto is leesbaar voor wie het
--    bijbehorende profiel mag zien (eigen profiel, collega's en patiënten binnen
--    de eigen organisatie, platform admin) — de profiles-RLS geldt namelijk ook
--    binnen deze subquery.

drop policy if exists "Organisatielid leest agenda-koppelingen van collega's" on public.staff_calendar_feeds;

drop policy if exists "Iedere ingelogde gebruiker leest profielfoto's" on storage.objects;

create policy "Profielfoto leesbaar voor wie het profiel mag zien"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
    )
  );
