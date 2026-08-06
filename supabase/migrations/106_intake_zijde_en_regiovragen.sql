-- 106_intake_zijde_en_regiovragen.sql
-- Drie kleine, gerichte uitbreidingen op patient_intakes (migratie 088),
-- n.a.v. feedback op de intake:
--   - body_side: links/rechts/beide, voor blessures met een duidelijke
--     zijde (knie, schouder, heup, enkel, elleboog, etc.) — niet
--     relevant voor midline-aandoeningen (rug, nek, bekken).
--   - pregnancy_related: alleen relevant en getoond bij de
--     vrouwenblessure-categorieën (bekkeninstabiliteit, bekkenbodem,
--     diastase recti).
--   - radiating_pain: alleen relevant en getoond bij rug-/nekklachten,
--     onderscheidt een aspecifiek van een mogelijk radiculair beloop al
--     tijdens de intake (naast de reeds bestaande twee rug-protocollen).

alter table public.patient_intakes
  add column if not exists body_side text check (body_side in ('left', 'right', 'both')),
  add column if not exists pregnancy_related boolean,
  add column if not exists radiating_pain boolean;

notify pgrst, 'reload schema';
