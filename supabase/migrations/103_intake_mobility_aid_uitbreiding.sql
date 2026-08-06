-- 103_intake_mobility_aid_uitbreiding.sql
-- Breidt patient_intakes.mobility_aid (migratie 088) uit met twee waarden
-- die ook hulpmiddelen zijn maar geen loophulpmiddel: tape_bandage
-- (tape/verband) en brace (brace/spalk) — feedback dat deze ontbraken in
-- de intake-vragenlijst.

alter table public.patient_intakes
  drop constraint if exists patient_intakes_mobility_aid_check;

alter table public.patient_intakes
  add constraint patient_intakes_mobility_aid_check check (mobility_aid in (
    'none', 'one_crutch', 'two_crutches', 'walker', 'wheelchair', 'tape_bandage', 'brace', 'other'
  ));

notify pgrst, 'reload schema';
