-- 027_fix_medication_schedule_times_sort_order.sql
-- Bugfix, losstaand van REVA v2 — vóór vandaag bestond `medication_schedule_times`
-- al live zonder `sort_order`, terwijl migraties 005 en 009 die kolom allebei
-- als onderdeel van de CREATE TABLE beschrijven ("create table if not exists").
-- Omdat de tabel destijds kennelijk buiten die migraties om is aangemaakt
-- (handmatig via de SQL-editor, net als 001-014 — zie de eerdere sessie-
-- analyse), had "if not exists" geen effect en is de kolom nooit toegevoegd.
-- Dit veroorzaakte de non-fatal "column ... sort_order does not exist"-fout
-- in loadMedicatieSchemas/times (lib/services/medicationService.ts).
--
-- Puur additief: voegt alleen de ontbrekende kolom toe, raakt geen data.

alter table public.medication_schedule_times
  add column if not exists sort_order int not null default 0;

notify pgrst, 'reload schema';
