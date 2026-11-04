-- 123_rol_receptie.sql
-- Nieuwe toekenbare rol "Receptie" (besluit eigenaar, november 2026).
--
-- Migratie 063 bracht het rollenmodel terug naar twee rollen (Praktijk-
-- eigenaar, Fysiotherapeut). Daarmee kon een praktijk een receptie-
-- medewerker alleen als Fysiotherapeut toevoegen — met volledige toegang
-- tot medische gegevens. De rij `reception` bestaat sinds migratie 016 maar
-- werd niet meer aangeboden; die nemen we hier opnieuw in gebruik.
--
-- Rechten volgen volledig uit migratie 122: alle klinische policies staan
-- alleen organization_owner en therapist toe, dus een receptielid ziet
-- vanzelf alleen wat via portal_patient_directory (NAW) en
-- portal_org_agenda (fysio-afspraken) wordt vrijgegeven, plus ruimtes,
-- reserveringen, roosters en collega's. Tweestapsverificatie geldt net als
-- voor elk portaallid (PortalGate + aal2 in de RPC's).
--
-- De app biedt de rol aan via CANONICAL_ROLE_KEYS in
-- lib/services/portalService.ts.

update public.roles
set name = 'Receptie'
where key = 'reception';
