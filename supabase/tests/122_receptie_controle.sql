-- Controle na migratie 122: wat ziet de receptie, wat ziet een therapeut?
-- Draai in de Supabase SQL Editor. Wijzigt niets: elk blok eindigt met ROLLBACK.
--
-- STAP 1 — zoek de id's op (los draaien):
--
--   select m.organization_id, m.user_id, p.full_name, r.key as rol
--   from public.memberships m
--   join public.roles r on r.id = m.role_id
--   join public.profiles p on p.id = m.user_id
--   where m.status = 'active'
--   order by m.organization_id, r.key;
--
-- STAP 2 — vervang in dit bestand (Zoeken en vervangen):
--   ORG_ID        → organization_id van je praktijk
--   RECEPTIE_ID   → user_id van een account met rol reception (Receptie, migratie 123)
--   THERAPEUT_ID  → user_id van een account met rol therapist
--
-- STAP 3 — selecteer telkens één blok en klik Run. De kolomnaam zegt wat je
-- hoort te zien.


-- ── Blok A: als receptie ────────────────────────────────────────────────────
begin;
select set_config('request.jwt.claims', '{"sub":"RECEPTIE_ID","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select
  (select count(*) from public.patients)             as "patients — moet 0 zijn",
  (select count(*) from public.checkins)             as "checkins — moet 0 zijn",
  (select count(*) from public.patient_intakes)      as "intakes — moet 0 zijn",
  (select count(*) from public.patient_staff_notes)  as "notities — moet 0 zijn",
  (select count(*) from public.medication_logs)      as "medicatie — moet 0 zijn",
  (select count(*) from public.portal_patient_directory('ORG_ID'))
                                                     as "NAW-lijst — aantal patiënten",
  (select count(*) from public.portal_org_agenda('ORG_ID', current_date - 90, current_date + 90)
     where appointment_type is distinct from 'fysio' or title is not null)
                                                     as "agenda niet-fysio of met titel — moet 0 zijn";
rollback;


-- ── Blok B: als therapeut ───────────────────────────────────────────────────
begin;
select set_config('request.jwt.claims', '{"sub":"THERAPEUT_ID","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select
  (select count(*) from public.patients where organization_id = 'ORG_ID')
                                                     as "patients — aantal patiënten",
  (select count(*) from public.portal_org_agenda('ORG_ID', current_date - 90, current_date + 90))
                                                     as "agenda — alle afspraken";
rollback;


-- ── Blok C: als therapeut ZONDER tweede factor (alleen wachtwoord) ──────────
begin;
select set_config('request.jwt.claims', '{"sub":"THERAPEUT_ID","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select
  (select count(*) from public.patients)             as "patients — moet 0 zijn",
  (select count(*) from public.patient_intakes)      as "intakes — moet 0 zijn (was eerder lek)";
rollback;
