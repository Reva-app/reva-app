-- 099_protocol_schouder_kuit_lopersknie.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Eerste REVA-herstelplannen voor drie nieuwe injury_category-waarden uit
-- migratie 097: schouderluxatie (conservatief behandeld), kuitblessure
-- (spierverrekking) en lopersknie (patellofemoraal pijnsyndroom). Zelfde
-- format als de bestaande REVA-protocolcontent (o.a. migratie 078): fases
-- met een weekindicatie, criteria/mijlpalen/educatie per fase, eigen
-- trainingsschema's met nieuw aangemaakte oefeningen. NIET geverifieerd door
-- een bevoegd fysiotherapeut — clinically_reviewed blijft false, mag niet aan
-- echte patiënten worden toegewezen totdat een fysiotherapeut de inhoud
-- heeft gecontroleerd.
-- ============================================================================
--
-- Schouderluxatie: gemodelleerd naar een conservatief (niet-operatief)
-- behandelde eerste schouderluxatie, zoals vaak voorkomt bij contactsport,
-- judo of een val op een gestrekte arm. Nadruk op bescherming van de
-- provocerende positie (abductie + exorotatie) in de vroege fase en op het
-- verhoogde herluxatierisico bij (jonge) sporters in de laatste fase.
--
-- Kuitblessure: gemodelleerd naar een acute verrekking van de kuitspier
-- (gastrocnemius of soleus), zoals vaak voorkomt bij hardlopen of
-- racketsport ("tennis leg"). Nadruk op pijngestuurde belasting vanaf het
-- begin en een geleidelijke, excentrisch gerichte krachtopbouw voordat
-- hardlopen wordt hervat.
--
-- Lopersknie: gemodelleerd naar patellofemoraal pijnsyndroom, een
-- overbelastingsblessure (geen acuut trauma) die vaak voorkomt bij lopers.
-- In lijn met de huidige inzichten ligt de nadruk op geleidelijke
-- belastingopbouw en heup- én kniekracht, niet op bescherming of
-- immobilisatie: de "verboden activiteiten" in dit protocol zijn dan ook
-- geformuleerd als "vermijd wat de pijn duidelijk verergert", niet als harde
-- verboden.
--
-- Alle oefeningen in deze drie protocollen zijn nieuw aangemaakt binnen deze
-- migratie (niet hergebruikt uit de bestaande gedeelde bibliotheek).

do $$
declare
  -- ── Schouderluxatie: nieuwe oefeningen ──────────────────────────────────
  v_ex_pendel uuid;
  v_ex_elleboog uuid;
  v_ex_handknijp uuid;
  v_ex_schouderophalen uuid;
  v_ex_actieve_flexie uuid;
  v_ex_wallslide_zijwaarts uuid;
  v_ex_exorotatie_neutraal uuid;
  v_ex_scapula_retractie uuid;
  v_ex_exorotatie_band uuid;
  v_ex_inrotatie_band uuid;
  v_ex_quadruped_scap uuid;
  v_ex_lateral_raise uuid;
  v_ex_roeien_band uuid;
  v_ex_pushup_plus uuid;
  v_ex_werpbeweging uuid;
  v_ex_balstoot uuid;
  v_ex_sportstabiliteit uuid;

  -- ── Kuitblessure: nieuwe oefeningen ─────────────────────────────────────
  v_ex_enkelpompen_kuit uuid;
  v_ex_isometrisch_kuit uuid;
  v_ex_wandelen_pijngestuurd uuid;
  v_ex_zelfmassage_kuit uuid;
  v_ex_kuitrek_zittend uuid;
  v_ex_kuitrek_staand uuid;
  v_ex_kuitheffing_zit uuid;
  v_ex_kuitheffing_staand_licht uuid;
  v_ex_kuitheffing_2been uuid;
  v_ex_kuitheffing_1been uuid;
  v_ex_excentrische_drop uuid;
  v_ex_hinkelen_licht uuid;
  v_ex_hardloop_opbouw_kuit uuid;
  v_ex_sprintjes_kort uuid;
  v_ex_richtingsveranderingen_licht uuid;
  v_ex_kuitonderhoud uuid;
  v_ex_kuit_plyo uuid;
  v_ex_duurloop_tempo_kuit uuid;

  -- ── Lopersknie: nieuwe oefeningen ───────────────────────────────────────
  v_ex_wandelen_pijnvrij uuid;
  v_ex_quad_isometrie uuid;
  v_ex_fietsen_licht uuid;
  v_ex_bilbrug_licht uuid;
  v_ex_zijligging_abductie uuid;
  v_ex_clamshell uuid;
  v_ex_minisquat_pfp uuid;
  v_ex_stepdown_gecontroleerd uuid;
  v_ex_singleleg_bridge uuid;
  v_ex_hardloop_opbouw_pfp uuid;
  v_ex_cadansdrill uuid;
  v_ex_singleleg_squat uuid;
  v_ex_wandzit_pfp uuid;
  v_ex_onderhoud_heup uuid;
  v_ex_hardloop_onderhoud_pfp uuid;
  v_ex_mobiliteit_heup_kuit uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Schouderluxatie (conservatief) — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  -- 1.0 Oefeningen aanmaken
  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Pendeloefening schouder', 'mobiliteit', 'Ontspannen voorover buigen en de arm laten bungelen in kleine cirkels, om de schouder pijnvrij te mobiliseren zonder actieve spieraanspanning.', 3, 60, array['schouder','mobiliteit','vroege fase'])
  returning id into v_ex_pendel;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Elleboog actief buigen en strekken', 'mobiliteit', 'De elleboog, pols en hand actief bewegen terwijl de schouder in de sling blijft, om stijfheid elders in de arm te voorkomen.', 3, 10, array['schouder','elleboog','sling'])
  returning id into v_ex_elleboog;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Handknijpoefening met bal', 'kracht', 'Een zachte bal stevig dichtknijpen en weer loslaten, om de doorbloeding in de arm te bevorderen.', 3, 15, 'Zachte knijpbal', array['schouder','hand','sling'])
  returning id into v_ex_handknijp;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Schouderophalen (licht)', 'mobiliteit', 'De schouders licht optrekken richting de oren en weer laten zakken, binnen een pijnvrij bereik.', 2, 10, array['schouder','mobiliteit','vroege fase'])
  returning id into v_ex_schouderophalen;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Actieve schouderflexie tot schouderhoogte', 'mobiliteit', 'De arm actief naar voren heffen tot maximaal schouderhoogte, zonder de provocerende positie van abductie met exorotatie op te zoeken.', 3, 10, array['schouder','mobiliteit'])
  returning id into v_ex_actieve_flexie;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Wandglijden zijwaarts', 'mobiliteit', 'Met de hand langs een muur zijwaarts omhoog glijden tot een comfortabele hoogte, om de mobiliteit gecontroleerd op te bouwen.', 3, 10, array['schouder','mobiliteit'])
  returning id into v_ex_wallslide_zijwaarts;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Schouder buitenrotatie tot neutraal', 'kracht', 'Vanuit de elleboog tegen het lichaam de onderarm naar buiten draaien tot neutrale stand, met lichte weerstand.', 3, 12, 'Lichte weerstandsband', array['schouder','rotator cuff','kracht'])
  returning id into v_ex_exorotatie_neutraal;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Scapulaire retractie zittend', 'stabiliteit', 'Rechtop zitten en de schouderbladen actief naar elkaar toe trekken en weer ontspannen.', 3, 12, array['schouder','scapula','stabiliteit'])
  returning id into v_ex_scapula_retractie;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Schouder buitenrotatie met weerstandsband', 'kracht', 'Buitenrotatie van de schouder tegen weerstand, elleboog tegen het lichaam, gericht op de rotator cuff.', 3, 12, 'Lichte weerstandsband', array['schouder','rotator cuff','kracht'])
  returning id into v_ex_exorotatie_band;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Schouder binnenrotatie met weerstandsband', 'kracht', 'Binnenrotatie van de schouder tegen weerstand, elleboog tegen het lichaam, ter versterking van de rotator cuff.', 3, 12, 'Lichte weerstandsband', array['schouder','rotator cuff','kracht'])
  returning id into v_ex_inrotatie_band;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Scapulaire stabiliteit op handen en knieën', 'stabiliteit', 'In vierpuntssteun het lichaamsgewicht licht verplaatsen terwijl de schouderbladen stabiel blijven staan.', 3, 30, array['schouder','scapula','stabiliteit'])
  returning id into v_ex_quadruped_scap;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Zijwaarts heffen tot schouderhoogte', 'kracht', 'De arm zijwaarts heffen tot schouderhoogte met een lichte gewichtsbelasting, gericht op de schouderspieren.', 3, 10, 'Lichte gewichten', array['schouder','kracht'])
  returning id into v_ex_lateral_raise;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Roeien met weerstandsband', 'kracht', 'Een roeibeweging maken tegen weerstand, gericht op de spieren tussen de schouderbladen.', 3, 12, 'Matige weerstandsband', array['schouder','rug','kracht'])
  returning id into v_ex_roeien_band;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Push-up plus (scapulaire controle)', 'stabiliteit', 'Een opdrukbeweging afsluiten met extra naar voren duwen van de schouderbladen, voor scapulaire controle onder belasting.', 3, 10, 'Lichaamsgewicht, op knieën indien nodig', array['schouder','scapula','stabiliteit'])
  returning id into v_ex_pushup_plus;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Geleide werpbeweging met weerstandsband', 'stabiliteit', 'Een gecontroleerde, sportspecifieke werpbeweging nabootsen tegen lichte weerstand.', 3, 10, 'Lichte weerstandsband', array['schouder','sport','stabiliteit'])
  returning id into v_ex_werpbeweging;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Bal-stoot tegen muur (chest pass)', 'conditie', 'Een lichte medicijnbal met beide handen vanaf de borst tegen een muur stoten en weer opvangen.', 3, 10, 'Lichte medicijnbal', array['schouder','sport','conditie'])
  returning id into v_ex_balstoot;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Sportspecifieke schouderstabiliteit eindfase', 'stabiliteit', 'Sportspecifieke bewegingen en belastingen oefenen onder begeleiding, als laatste stap voor volledige sporthervatting.', 1200, array['schouder','sport','stabiliteit'])
  returning id into v_ex_sportstabiliteit;

  -- 1.1 Protocol
  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'shoulder_dislocation', 'Herstelplan schouderluxatie (conservatief)',
    'Herstelplan na een eerste, conservatief (niet-operatief) behandelde schouderluxatie, opgebouwd in vier fases van bescherming in de sling tot een begeleide, sportspecifieke terugkeer (ca. 10-12 weken). Extra aandacht voor het verhoogde risico op een nieuwe luxatie, vooral bij jonge sporters.',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en rust in de sling
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en rust in de sling',
    'De schouder beschermen in de sling, pijn en zwelling onder controle krijgen, en de provocerende positie van abductie met exorotatie vermijden.',
    'Week 0-2',
    array['Abductie gecombineerd met exorotatie (de "provocerende positie")', 'Actief boven schouderhoogte reiken', 'Steunen op de arm', 'Sporten en tillen', 'Slapen zonder sling in de eerste weken'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sling grotendeels volgens advies gedragen', 0),
    (v_phase, 'Pijn in rust onder controle', 1),
    (v_phase, 'Zwelling duidelijk afgenomen', 2),
    (v_phase, 'Elleboog, pols en hand pijnvrij te bewegen', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste dagen met de sling doorgekomen', 0),
    (v_phase, 'Pijn in rust onder controle', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bescherm de schouder tegen herluxatie',
     'Een eerste schouderluxatie geneest, maar het gewrichtskapsel en de banden hebben tijd nodig om weer stevig te worden. Vermijd de combinatie van je arm opzij heffen en naar buiten draaien (de "provocerende positie") strikt in deze fase, ook als de schouder zich alweer sterk voelt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 1: sling en voorzichtige mobiliteit, schouderluxatie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_pendel, 0, 3, null, 60),
    (v_schedule, v_ex_elleboog, 1, 3, 10, null),
    (v_schedule, v_ex_handknijp, 2, 3, 15, null),
    (v_schedule, v_ex_schouderophalen, 3, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Actieve mobiliteit herwinnen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Actieve mobiliteit herwinnen',
    'Geleidelijk de sling afbouwen en actieve beweeglijkheid van de schouder terugwinnen binnen een veilig, pijnvrij bereik.',
    'Week 2-6',
    array['Volledige abductie met exorotatie', 'Tillen van zware voorwerpen', 'Contactsport', 'Steunen op de uitgestrekte arm'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sling overdag niet meer nodig', 0),
    (v_phase, 'Actieve flexie tot minimaal schouderhoogte', 1),
    (v_phase, 'Actieve exorotatie tot neutraal zonder pijn', 2),
    (v_phase, 'Dagelijkse activiteiten onder schouderhoogte pijnvrij', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Sling overdag losgelaten', 0),
    (v_phase, 'Arm actief tot schouderhoogte geheven', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen van actieve mobiliteit',
     'Nu de sling wordt afgebouwd, bouw je stap voor stap actieve mobiliteit op. Forceer de buitenrotatie in combinatie met opzij heffen nog niet: dit blijft de meest kwetsbare positie voor het genezende kapsel.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 2: actieve mobiliteit, schouderluxatie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_actieve_flexie, 0, 3, 10, null),
    (v_schedule, v_ex_wallslide_zijwaarts, 1, 3, 10, null),
    (v_schedule, v_ex_exorotatie_neutraal, 2, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_scapula_retractie, 3, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Rotator cuff en scapulaire stabiliteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Rotator cuff en scapulaire stabiliteit',
    'Progressieve krachttraining van de rotator cuff en scapulaire stabilisatoren om het schoudergewricht actief te ondersteunen.',
    'Week 6-9',
    array['Plotselinge, ongecontroleerde bewegingen boven schouderhoogte', 'Contactsport', 'Zwaar tillen zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht buitenrotatie minimaal 70% van de andere zijde', 0),
    (v_phase, 'Scapulaire controle bij armbewegingen boven schouderhoogte', 1),
    (v_phase, 'Volledige, pijnvrije actieve mobiliteit', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste training met weerstandsband afgerond', 0),
    (v_phase, 'Kracht duidelijk merkbaar toegenomen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht rond de schouder verkleint het risico op een nieuwe luxatie',
     'Een sterke rotator cuff en goede scapulaire controle geven het schoudergewricht actieve stabiliteit, naast de passieve stabiliteit van kapsel en banden. Dit is een belangrijke stap om de kans op een volgende luxatie te verkleinen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 3: rotator cuff en scapulaire kracht, schouderluxatie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_exorotatie_band, 0, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_inrotatie_band, 1, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_quadruped_scap, 2, 3, null, 30, null),
    (v_schedule, v_ex_lateral_raise, 3, 3, 10, null, 'Lichte gewichten'),
    (v_schedule, v_ex_roeien_band, 4, 3, 12, null, 'Matige weerstandsband');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Sportspecifieke terugkeer
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Sportspecifieke terugkeer',
    'Sportspecifieke stabiliteit en belasting opbouwen als voorbereiding op een veilige, begeleide terugkeer naar training en wedstrijd.',
    'Week 9-12',
    array['Terugkeer naar contactsport zonder goedkeuring fysiotherapeut', 'Onvoorbereide, plotselinge bovenhoofdse krachtsinspanning'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Symmetrische kracht rotator cuff en scapulaire spieren', 0),
    (v_phase, 'Sportspecifieke bewegingen zonder apprehensie of instabiliteitsgevoel', 1),
    (v_phase, 'Goedkeuring fysiotherapeut voor volledige sporthervatting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste sportspecifieke training afgerond', 0),
    (v_phase, 'Terug op het oude sportniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Het herluxatierisico blijft reëel, vooral op jonge leeftijd',
     'Vooral bij jonge, actieve sporters is de kans op een nieuwe luxatie na een eerste, conservatief behandelde luxatie aanzienlijk. Blijf daarom ook na terugkeer naar sport structureel aan schouderkracht en scapulaire stabiliteit werken, en overleg bij twijfel met je fysiotherapeut voordat je risicovolle bewegingen hervat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 4: sportspecifieke stabiliteit, schouderluxatie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_pushup_plus, 0, 3, 10, null, 'Lichaamsgewicht, op knieën indien nodig'),
    (v_schedule, v_ex_werpbeweging, 1, 3, 10, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_balstoot, 2, 3, 10, null, 'Lichte medicijnbal'),
    (v_schedule, v_ex_sportstabiliteit, 3, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Kuitblessure (spierverrekking) — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  -- 2.0 Oefeningen aanmaken
  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Enkelpompen (pijnvrij)', 'mobiliteit', 'De voet actief op en neer bewegen binnen een pijnvrij bereik, om de doorbloeding in het onderbeen te bevorderen.', 3, 15, array['kuit','enkel','mobiliteit'])
  returning id into v_ex_enkelpompen_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Isometrische kuitaanspanning', 'kracht', 'De kuitspier aanspannen zonder beweging, bijvoorbeeld door licht op de tenen te drukken zonder de hiel te laten komen, binnen een pijnvrij niveau.', 3, 20, array['kuit','kracht','vroege fase'])
  returning id into v_ex_isometrisch_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Pijngestuurd wandelen', 'conditie', 'Wandelen op een tempo en afstand die geen duidelijke toename van pijn geven, als basis voor verder herstel.', 600, array['kuit','conditie','vroege fase'])
  returning id into v_ex_wandelen_pijngestuurd;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Zelfmassage kuit (licht)', 'mobiliteit', 'Met de handen lichte, oppervlakkige massagebewegingen over de kuit maken, ruim buiten het meest gevoelige gebied.', 2, 120, array['kuit','mobiliteit'])
  returning id into v_ex_zelfmassage_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Kuitrek zittend met handdoek', 'rekken', 'Zittend met gestrekt been de voet met een handdoek voorzichtig naar het lichaam toe trekken tot een lichte rek.', 3, 30, array['kuit','rekken'])
  returning id into v_ex_kuitrek_zittend;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Kuitrek staand tegen muur', 'rekken', 'Staand met het geblesseerde been achter en de hiel op de grond, leunend tegen een muur, een lichte rek in de kuit opbouwen.', 3, 30, array['kuit','rekken'])
  returning id into v_ex_kuitrek_staand;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Kuitheffing zittend (licht)', 'kracht', 'Zittend, met de voeten plat op de grond, de hielen optillen en weer laten zakken, met lage belasting op de kuit.', 3, 15, 'Lichaamsgewicht been', array['kuit','kracht'])
  returning id into v_ex_kuitheffing_zit;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Kuitheffing staand, beide benen', 'kracht', 'Staand op beide benen de hielen optillen en gecontroleerd weer laten zakken.', 3, 12, 'Lichaamsgewicht', array['kuit','kracht'])
  returning id into v_ex_kuitheffing_staand_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Kuitheffing op twee benen (volledig bereik)', 'kracht', 'Staand op beide benen de hielen zo ver mogelijk optillen en gecontroleerd weer laten zakken, over het volledige bewegingsbereik.', 3, 15, 'Lichaamsgewicht', array['kuit','kracht'])
  returning id into v_ex_kuitheffing_2been;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Kuitheffing op één been', 'kracht', 'Staand op het geblesseerde been de hiel optillen en gecontroleerd weer laten zakken.', 3, 12, 'Lichaamsgewicht', array['kuit','kracht'])
  returning id into v_ex_kuitheffing_1been;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Excentrische kuitheffing (drop) op traprand', 'kracht', 'Op de bal van de voet op een traprand staan, met beide benen omhoogkomen en op één been langzaam, gecontroleerd zakken tot onder de traprand.', 3, 10, 'Lichaamsgewicht', array['kuit','kracht','excentrisch'])
  returning id into v_ex_excentrische_drop;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Licht hinkelen op de plek', 'conditie', 'Kort en licht op de plek hinkelen op het geblesseerde been, als voorbereiding op impactbelasting.', 3, 10, 'Lichaamsgewicht', array['kuit','conditie'])
  returning id into v_ex_hinkelen_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Hardlopen opbouwschema kuitblessure', 'conditie', 'Een gestructureerd opbouwschema van afwisselend wandelen en rustig joggen, geleidelijk uitbreidend richting duurloop.', 1200, array['kuit','hardlopen','conditie'])
  returning id into v_ex_hardloop_opbouw_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Korte versnellingen (strides)', 'conditie', 'Korte, geleidelijke versnellingen op een rechte, vlakke ondergrond, opbouwend naar een stevig maar gecontroleerd tempo.', 3, 6, array['kuit','hardlopen','conditie'])
  returning id into v_ex_sprintjes_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Lichte richtingsveranderingen', 'stabiliteit', 'Op laag tempo van richting veranderen, om de kuit voor te bereiden op sportspecifieke belasting.', 3, 8, array['kuit','sport','stabiliteit'])
  returning id into v_ex_richtingsveranderingen_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Onderhoud kuitkracht (functioneel)', 'kracht', 'Functionele kuitkrachtoefeningen als vast onderdeel van de trainingsroutine, om de opgebouwde kracht te behouden.', 3, 12, 'Lichaamsgewicht of licht extra gewicht', array['kuit','kracht','onderhoud'])
  returning id into v_ex_kuitonderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Plyometrische kuitsprongen (opbouw)', 'kracht', 'Korte, snelle sprongen op de plek waarbij de kuit als een veer wordt gebruikt, met minimale contacttijd met de grond.', 3, 10, 'Lichaamsgewicht', array['kuit','kracht','plyometrie'])
  returning id into v_ex_kuit_plyo;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Duurloop met tempo-opbouw', 'conditie', 'Een aaneengesloten duurloop waarbij het tempo geleidelijk richting het einde iets wordt verhoogd, als voorbereiding op wedstrijd- of trainingsintensiteit.', 1500, array['kuit','hardlopen','conditie'])
  returning id into v_ex_duurloop_tempo_kuit;

  -- 2.1 Protocol
  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'calf_strain', 'Herstelplan kuitblessure (spierverrekking)',
    'Herstelplan na een acute verrekking van de kuitspier (gastrocnemius of soleus), opgebouwd in vier fases van pijngestuurd lopen tot een gestructureerde terugkeer naar hardlopen en sport (ca. 6-8 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en pijngestuurd lopen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en pijngestuurd lopen',
    'Pijn en zwelling laten afnemen en pijnvrij, pijngestuurd blijven lopen binnen de mogelijkheden van de kuit.',
    'Week 0-1',
    array['Hardlopen', 'Sprinten of afzetten', 'Stevig doorrekken van de kuit', 'Sporten met sprint- of sprongbelasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen op vlakke ondergrond zonder hinken', 0),
    (v_phase, 'Zwelling en verkleuring duidelijk afgenomen', 1),
    (v_phase, 'Op de tenen staan mogelijk zonder scherpe pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste dagen pijngestuurd gelopen zonder hinken', 0),
    (v_phase, 'Zwelling onder controle', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Pijngestuurd lopen versnelt herstel',
     'Volledige rust is bij een kuitverrekking meestal niet nodig. Blijf binnen een pijnvrij tot licht ongemakkelijk gevoel bewegen: dit houdt de doorbloeding op peil zonder het herstellende spierweefsel te overbelasten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 1: pijngestuurd bewegen, kuitblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_enkelpompen_kuit, 0, 3, 15, null),
    (v_schedule, v_ex_isometrisch_kuit, 1, 3, null, 20),
    (v_schedule, v_ex_wandelen_pijngestuurd, 2, null, null, 600),
    (v_schedule, v_ex_zelfmassage_kuit, 3, 2, null, 120);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Rekken en lichte belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Rekken en lichte belasting',
    'Voorzichtig de mobiliteit van de kuit herstellen en starten met isometrische en lichte dynamische belasting.',
    'Week 1-3',
    array['Hardlopen', 'Sprongen en afzetten', 'Fors doorrekken tot pijn'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, pijnvrije enkelmobiliteit', 0),
    (v_phase, 'Kuitrek mogelijk zonder scherpe pijn', 1),
    (v_phase, 'Kuitheffing op twee benen mogelijk zonder pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije kuitrek', 0),
    (v_phase, 'Kuitheffing op twee benen gestart', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen voorkomt een nieuwe verrekking',
     'Een kuitverrekking heeft een verhoogd risico op een nieuwe blessure als de belasting te snel wordt opgebouwd. Bouw rek- en krachtoefeningen geleidelijk op en stop bij een scherpe, stekende pijn.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 2: rek en lichte belasting, kuitblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_kuitrek_zittend, 0, 3, null, 30, null),
    (v_schedule, v_ex_kuitrek_staand, 1, 3, null, 30, null),
    (v_schedule, v_ex_kuitheffing_zit, 2, 3, 15, null, 'Lichaamsgewicht been'),
    (v_schedule, v_ex_kuitheffing_staand_licht, 3, 3, 12, null, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Excentrische krachtopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Excentrische krachtopbouw',
    'Progressieve, excentrisch gerichte krachttraining van de kuit opbouwen richting eenbenige belasting.',
    'Week 3-5',
    array['Hardlopen op snelheid', 'Sprongbelasting', 'Sporten met plotselinge afzetmomenten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kuitheffing op één been minimaal 15 keer mogelijk', 0),
    (v_phase, 'Geen pijn de dag na training', 1),
    (v_phase, 'Kracht duidelijk symmetrisch ten opzichte van de andere kuit', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste eenbenige kuitheffing zonder pijn', 0),
    (v_phase, 'Excentrische kuitheffing gestart', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Excentrische training beschermt tegen herverrekking',
     'Excentrische kuitversterking, waarbij de spier onder controle verlengt, wordt gezien als een belangrijke stap om de kuit voor te bereiden op de belasting van hardlopen en de kans op een nieuwe verrekking te verkleinen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 3: excentrische kracht, kuitblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_kuitheffing_2been, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_kuitheffing_1been, 1, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_excentrische_drop, 2, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hinkelen_licht, 3, 3, 10, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 4: Terugkeer naar hardlopen en sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar hardlopen en sport',
    'Gestructureerde opbouw van hardloopvolume en sportspecifieke belasting, met behoud van kuitkracht.',
    'Week 5-8',
    array['Sprinten zonder opbouw', 'Wedstrijden zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '20 minuten duurlopen pijnvrij op vlakke ondergrond', 0),
    (v_phase, 'Versnellingen mogelijk zonder pijn of spanning', 1),
    (v_phase, 'Sportspecifieke richtingsveranderingen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder pijn', 0),
    (v_phase, 'Terug op het oude sport of trainingsniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bouw hardloopvolume stapsgewijs op',
     'Verhoog de hardloopafstand of intensiteit niet met meer dan een kleine stap per week. Een te snelle opbouw is een van de belangrijkste oorzaken van een nieuwe kuitverrekking.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 4: terugkeer naar hardlopen, kuitblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_hardloop_opbouw_kuit, 0, null, null, 1200),
    (v_schedule, v_ex_sprintjes_kort, 1, 3, 6, null),
    (v_schedule, v_ex_richtingsveranderingen_licht, 2, 3, 8, null),
    (v_schedule, v_ex_kuitonderhoud, 3, 3, 12, null),
    (v_schedule, v_ex_kuit_plyo, 4, 3, 10, null),
    (v_schedule, v_ex_duurloop_tempo_kuit, 5, null, null, 1500);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 3: Lopersknie (patellofemoraal pijnsyndroom) — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  -- 3.0 Oefeningen aanmaken
  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Pijnvrij wandelen', 'conditie', 'Wandelen op een tempo en afstand die geen duidelijke toename van kniepijn geven.', 900, array['knie','lopersknie','conditie'])
  returning id into v_ex_wandelen_pijnvrij;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Isometrische quadricepsaanspanning', 'kracht', 'De bovenbeenspier aanspannen zonder de knie te bewegen, om kracht te onderhouden zonder de knieschijf te belasten.', 3, 20, array['knie','quadriceps','kracht'])
  returning id into v_ex_quad_isometrie;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Fietsen op hometrainer (lage weerstand)', 'conditie', 'Rustig fietsen op lage weerstand, met een hoog zadel om de belasting op de knieschijf te beperken.', 600, array['knie','conditie'])
  returning id into v_ex_fietsen_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Bilbrug (glute bridge), licht', 'kracht', 'Op de rug liggend met gebogen knieën het bekken optillen, gericht op de bilspieren.', 3, 12, array['heup','bil','kracht'])
  returning id into v_ex_bilbrug_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Zijligging heupabductie', 'kracht', 'Op de zij liggend het bovenste been optillen, gericht op de heupabductoren.', 3, 12, 'Lichte enkelband', array['heup','kracht'])
  returning id into v_ex_zijligging_abductie;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Clamshell (schelpoefening)', 'kracht', 'Op de zij liggend met gebogen knieën de bovenste knie openen tegen weerstand, gericht op de heupbuitenrotatoren.', 3, 12, 'Lichte weerstandsband', array['heup','kracht'])
  returning id into v_ex_clamshell;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Mini squat (ondiep, pijnvrij bereik)', 'kracht', 'Een ondiepe squat uitvoeren binnen het bereik dat pijnvrij aanvoelt.', 3, 12, 'Lichaamsgewicht', array['knie','kracht'])
  returning id into v_ex_minisquat_pfp;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Step-down gecontroleerd (laag opstapje)', 'kracht', 'Vanaf een laag opstapje langzaam en gecontroleerd met één been naar beneden zakken.', 3, 10, 'Lichaamsgewicht', array['knie','kracht'])
  returning id into v_ex_stepdown_gecontroleerd;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Eenbenige bilbrug', 'kracht', 'Op de rug liggend met één been gestrekt het bekken optillen op het andere been, gericht op heup- en beenkracht.', 3, 10, array['heup','knie','kracht'])
  returning id into v_ex_singleleg_bridge;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Hardlopen opbouwschema lopersknie', 'conditie', 'Een gestructureerd opbouwschema van hardloopvolume, opgebouwd binnen een acceptabel pijnniveau.', 1200, array['knie','hardlopen','conditie'])
  returning id into v_ex_hardloop_opbouw_pfp;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Cadansdrill (verhoogde pasfrequentie)', 'conditie', 'Rustig joggen met een licht verhoogde pasfrequentie ten opzichte van het natuurlijke tempo, om de belasting per pas te verlagen.', 300, array['knie','hardlopen','looptechniek'])
  returning id into v_ex_cadansdrill;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, default_load_text, tags)
  values ('reva', 'Eenbenige squat (ondiep, gecontroleerd)', 'kracht', 'Op één been een ondiepe, gecontroleerde squat uitvoeren binnen een pijnvrij bereik.', 3, 10, 'Lichaamsgewicht', array['knie','kracht'])
  returning id into v_ex_singleleg_squat;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_duration_seconds, tags)
  values ('reva', 'Wandzit (wall sit), pijnvrij bereik', 'kracht', 'Met de rug tegen een muur in een zithouding zakken tot een hoek die pijnvrij aanvoelt en deze aanhouden.', 3, 30, array['knie','kracht'])
  returning id into v_ex_wandzit_pfp;

  insert into public.exercise_library (scope, title, exercise_type, description, default_sets, default_reps, tags)
  values ('reva', 'Onderhoud heup- en beenkracht', 'kracht', 'Gecombineerde heup- en beenkrachtoefeningen als vast onderdeel van de trainingsroutine, om terugval te voorkomen.', 3, 12, array['heup','knie','onderhoud'])
  returning id into v_ex_onderhoud_heup;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Hardloop onderhoudsschema', 'conditie', 'Het bereikte hardloopvolume structureel aanhouden als onderdeel van de wekelijkse trainingsroutine.', 1800, array['knie','hardlopen','onderhoud'])
  returning id into v_ex_hardloop_onderhoud_pfp;

  insert into public.exercise_library (scope, title, exercise_type, description, default_duration_seconds, tags)
  values ('reva', 'Mobiliteitsroutine heup en kuit', 'mobiliteit', 'Een korte routine van mobiliserende oefeningen voor heup en kuit, ter ondersteuning van een soepel loopritme.', 300, array['heup','kuit','mobiliteit'])
  returning id into v_ex_mobiliteit_heup_kuit;

  -- 3.1 Protocol
  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'patellofemoral_pain', 'Herstelplan lopersknie (patellofemoraal pijnsyndroom)',
    'Herstelplan voor patellofemoraal pijnsyndroom (lopersknie), een overbelastingsklacht die vaak voorkomt bij lopers. Opgebouwd in vier fases van belastingmanagement tot een gestructureerde terugkeer naar hardlopen (ca. 8-12 weken), met de nadruk op geleidelijke opbouw van heup- en kniekracht in plaats van bescherming of rust.',
    false)
  returning id into v_protocol;

  -- Fase 1: Belastingmanagement en pijnreductie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Belastingmanagement en pijnreductie',
    'De pijnprikkelende belasting tijdelijk verminderen, niet volledig stoppen, en starten met pijnvrije basisoefeningen.',
    'Week 0-2',
    array['Activiteiten die de pijn duidelijk verergeren (boven een milde prikkeling)', 'Abrupt fors verhogen van hardloopvolume', 'Langdurig diep gebogen zitten of hurken bij klachten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij traplopen niet meer dan mild', 0),
    (v_phase, 'Langer zitten mogelijk zonder duidelijke toename van klachten', 1),
    (v_phase, 'Wandelen pijnvrij mogelijk', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Pijnpatroon in kaart gebracht', 0),
    (v_phase, 'Eerste pijnvrije wandeling', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Verminder belasting, stop niet volledig',
     'Bij lopersknie helpt het om de pijnprikkelende belasting tijdelijk te verminderen, maar volledige rust vertraagt het herstel juist. Blijf bewegen binnen een mild, acceptabel pijnniveau: dat is de basis voor de opbouw die hierna volgt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 1: belastingmanagement, lopersknie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_wandelen_pijnvrij, 0, null, null, 900),
    (v_schedule, v_ex_quad_isometrie, 1, 3, null, 20),
    (v_schedule, v_ex_fietsen_licht, 2, null, null, 600),
    (v_schedule, v_ex_bilbrug_licht, 3, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Heup en quadricepskracht opbouwen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Heup en quadricepskracht opbouwen',
    'Gerichte krachttraining van heup en quadriceps, aangezien heupkracht een belangrijke rol speelt bij het herstel van patellofemorale klachten.',
    'Week 2-6',
    array['Activiteiten die de pijn duidelijk verergeren', 'Diepe, snelle kniebuigingen met hoge belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Heupabductiekracht merkbaar toegenomen', 0),
    (v_phase, 'Mini squat pijnvrij tot een comfortabele diepte', 1),
    (v_phase, 'Traplopen zonder meer dan milde klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige krachtsessie zonder opvlamming', 0),
    (v_phase, 'Squat en step-down duidelijk gecontroleerder', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Heupkracht is minstens zo belangrijk als kniekracht',
     'Onderzoek laat zien dat zwakte van de heupspieren, vooral de heupabductoren en buitenrotatoren, een grote rol speelt bij patellofemorale klachten. Dit protocol combineert daarom heupkracht met lokale kniekracht, in plaats van alleen op de knie te focussen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 2: heup en kniekracht, lopersknie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_zijligging_abductie, 0, 3, 12, 'Lichte enkelband'),
    (v_schedule, v_ex_clamshell, 1, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_minisquat_pfp, 2, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_stepdown_gecontroleerd, 3, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_singleleg_bridge, 4, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Terugkeer naar hardlopen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar hardlopen',
    'Geleidelijke opbouw van hardloopvolume en intensiteit, met aandacht voor looptechniek zoals pasfrequentie en het vermijden van overstriding.',
    'Week 6-10',
    array['Activiteiten die de pijn duidelijk verergeren', 'Te snelle toename van hardloopvolume of intensiteit'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '20 minuten duurlopen met niet meer dan milde klachten', 0),
    (v_phase, 'Pasfrequentie merkbaar verhoogd ten opzichte van de startsituatie', 1),
    (v_phase, 'Geen toename van klachten de dag na het lopen', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie binnen het opbouwschema afgerond', 0),
    (v_phase, 'Hardloopvolume van vóór de klachten grotendeels hervat', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Looptechniek kan de belasting op de knieschijf verlagen',
     'Een iets hogere pasfrequentie en het vermijden van een te grote pas naar voren (overstriding) kunnen de belasting op het patellofemorale gewricht verlagen. Combineer dit met een geleidelijke opbouw van je hardloopvolume, in plaats van in één keer terug te gaan naar je oude schema.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 3: terugkeer naar hardlopen, lopersknie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_hardloop_opbouw_pfp, 0, null, null, 1200),
    (v_schedule, v_ex_cadansdrill, 1, null, null, 300),
    (v_schedule, v_ex_singleleg_squat, 2, 3, 10, null),
    (v_schedule, v_ex_wandzit_pfp, 3, 3, null, 30);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Onderhoud en terugvalpreventie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Onderhoud en terugvalpreventie',
    'Het opgebouwde kracht en loopniveau vasthouden en het risico op terugkerende klachten beperken.',
    'Week 10-12',
    array['Plotselinge, sterke toename van trainingsbelasting zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledig hardloopvolume van vóór de klachten hervat', 0),
    (v_phase, 'Heup en beenkracht op een stabiel, onderhouden niveau', 1),
    (v_phase, 'Geen terugkeer van klachten bij normale trainingsbelasting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Volledige terugkeer naar de gewenste hardloopbelasting', 0),
    (v_phase, 'Onderhoudsschema structureel opgenomen in de trainingsroutine', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf heupkracht onderhouden',
     'Lopersknie keert regelmatig terug als de opgebouwde heup en beenkracht niet wordt onderhouden. Blijf ook na volledig herstel wekelijks gericht krachtwerk doen, vooral rond de heup, om de kans op terugval te beperken.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Fase 4: onderhoud, lopersknie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_onderhoud_heup, 0, 3, 12, null),
    (v_schedule, v_ex_hardloop_onderhoud_pfp, 1, null, null, 1800),
    (v_schedule, v_ex_mobiliteit_heup_kuit, 2, null, null, 300);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
