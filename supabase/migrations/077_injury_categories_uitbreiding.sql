-- 077_injury_categories_uitbreiding.sql
-- Breidt protocols.injury_category (migratie 048) uit met 6 nieuwe
-- categorieën t.b.v. 10 nieuwe REVA-herstelplannen (migraties 078-082):
-- lage rugklachten + 5 voetbal-specifieke blessures. Enkelverzwikking krijgt
-- bewust een EIGEN categorie (ankle_sprain) i.p.v. het bestaande
-- ankle_ligament te hergebruiken — dat laatste blijft gereserveerd voor een
-- chronisch/operatief enkelbandtraject (bv. na een Broström-procedure), een
-- wezenlijk ander en langer traject dan een acute verzwikking. Beide tonen
-- anders dezelfde categorie-badge in de herstelplan-kiezer, verwarrend voor
-- de fysiotherapeut die een plan moet kiezen.

alter table public.protocols
  drop constraint if exists protocols_injury_category_check;

alter table public.protocols
  add constraint protocols_injury_category_check check (injury_category in (
    'acl', 'total_knee_replacement', 'total_hip_replacement',
    'meniscus', 'rotator_cuff', 'ankle_ligament',
    'low_back_pain', 'ankle_sprain', 'hamstring_strain', 'groin_strain', 'mcl_sprain', 'concussion',
    'custom'
  ));

notify pgrst, 'reload schema';
