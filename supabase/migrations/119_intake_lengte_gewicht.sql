-- 119_intake_lengte_gewicht.sql
-- Lengte en gewicht toevoegen aan de intake (patient_intakes, migratie 088)
-- — belangrijke basisgegevens voor een fysiotherapie-intake (bv. voor
-- belastbaarheid en dosering), die tot nu toe ontbraken. Beide optioneel,
-- zelfde patroon als de overige intakevelden (nullable, geen defaults).

alter table public.patient_intakes
  add column if not exists height_cm smallint check (height_cm between 50 and 250),
  add column if not exists weight_kg numeric(5,1) check (weight_kg between 20 and 300);

notify pgrst, 'reload schema';
