-- 097_injury_categories_uitbreiding_v2.sql
-- Breidt protocols.injury_category (migratie 048, eerder al uitgebreid in
-- migratie 077) uit met 14 nieuwe categorieën, n.a.v. feedback dat de
-- intake-taxonomie te grof was: "Sport → Knie" en "Revalidatie → Knee"
-- kwamen tot nu toe op precies dezelfde blessuretype/categorie uit, terwijl
-- dit klinisch echt andere trajecten zijn. Vanaf nu krijgt elke aanleiding
-- (Sportblessure/Overbelasting/Chronische klacht/Revalidatie) een eigen,
-- passende subcategorie-lijst in de wizard (zie AanleidingStep.tsx) — de
-- nieuwe categorieën hieronder maken die differentiatie mogelijk.
--
-- Groepen:
-- 1. Vrouwenblessures (3): bekkeninstabiliteit, bekkenbodemklachten en
--    diastase recti hadden nog helemaal geen categorie.
-- 2. Ontbrekende acute sportblessures (2): schouderluxatie en kuitblessure
--    kwamen tot nu toe nergens netjes terecht (vielen onder 'custom').
-- 3. Overbelasting-specifiek (5): lopersknie, scheenbeenvliesklachten,
--    hielspoor, achillespees-tendinopathie en elleboogklachten (tennis-/
--    golferselleboog) zijn overuse-aandoeningen met een wezenlijk andere
--    opbouw dan een acute sportblessure of een operatief traject.
-- 4. Chronisch-specifiek (4): nekklachten, knieartrose, heupartrose en
--    bevroren schouder zijn langdurige/degeneratieve aandoeningen, met
--    weer een andere opbouw dan overbelasting of een acute blessure.
--
-- rotator_cuff en low_back_pain krijgen bewust GEEN nieuwe categorie voor
-- hun overbelasting-/chronisch-varianten — die passen al goed binnen de
-- bestaande categorie (schouderoverbelasting bij rotator_cuff, chronische
-- rugklachten bij low_back_pain) en krijgen in plaats daarvan een extra
-- herstelplan binnen diezelfde categorie.

alter table public.protocols
  drop constraint if exists protocols_injury_category_check;

alter table public.protocols
  add constraint protocols_injury_category_check check (injury_category in (
    -- bestaand (migraties 048/077)
    'acl', 'total_knee_replacement', 'total_hip_replacement',
    'meniscus', 'rotator_cuff', 'ankle_ligament',
    'low_back_pain', 'ankle_sprain', 'hamstring_strain', 'groin_strain', 'mcl_sprain', 'concussion',
    -- 1. vrouwenblessures
    'pelvic_instability', 'pelvic_floor_dysfunction', 'rectus_diastasis',
    -- 2. ontbrekende acute sportblessures
    'shoulder_dislocation', 'calf_strain',
    -- 3. overbelasting-specifiek
    'patellofemoral_pain', 'shin_splints', 'plantar_fasciitis', 'achilles_tendinopathy', 'elbow_tendinopathy',
    -- 4. chronisch-specifiek
    'neck_pain_chronic', 'knee_osteoarthritis', 'hip_osteoarthritis', 'shoulder_chronic_pain',
    'custom'
  ));

notify pgrst, 'reload schema';
