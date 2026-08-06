-- 104_injury_categories_generieke_varianten.sql
-- Feedback: elke bereikbare keuze in de Aanleiding-stap moet op minstens
-- één herstelplan uitkomen. Een audit van alle injury_category-waarden
-- tegen alle geseede protocollen (migraties 053-102) toont dat dit al
-- overal klopt, BEHALVE drie generieke opties in de Revalidatie-lijst
-- (en de "Anders"-fallbackdropdown) die nog op 'custom' uitkwamen (dat is
-- bewust leeg, zie migratie 054):
--   - "Spier" (spierverrekking, niet hamstring/kuit/lies-specifiek)
--   - "Pees" (peesontsteking, niet achillespees/elleboog-specifiek)
--   - "Kniepees" (patella) — wordt hier NIET een eigen categorie maar
--     hergemapt naar het al bestaande 'patellofemoral_pain' (migratie 099,
--     "lopersknie"), klinisch nauw verwant genoeg om geen aparte,
--     grotendeels overlappende categorie te rechtvaardigen.
--
-- Voegt daarom twee nieuwe, bewust generieke categorieën toe voor de
-- eerste twee: muscle_strain_general en tendinopathy_general. Deze
-- protocollen zijn expliciet bedoeld als startpunt ("basis") — niet
-- toegespitst op één spier/pees, generiek genoeg om door een fysiotherapeut
-- verder ingevuld of aangepast te worden per patiënt.

alter table public.protocols
  drop constraint if exists protocols_injury_category_check;

alter table public.protocols
  add constraint protocols_injury_category_check check (injury_category in (
    'acl', 'total_knee_replacement', 'total_hip_replacement',
    'meniscus', 'rotator_cuff', 'ankle_ligament',
    'low_back_pain', 'ankle_sprain', 'hamstring_strain', 'groin_strain', 'mcl_sprain', 'concussion',
    'pelvic_instability', 'pelvic_floor_dysfunction', 'rectus_diastasis',
    'shoulder_dislocation', 'calf_strain',
    'patellofemoral_pain', 'shin_splints', 'plantar_fasciitis', 'achilles_tendinopathy', 'elbow_tendinopathy',
    'neck_pain_chronic', 'knee_osteoarthritis', 'hip_osteoarthritis', 'shoulder_chronic_pain',
    'muscle_strain_general', 'tendinopathy_general',
    'custom'
  ));

notify pgrst, 'reload schema';
