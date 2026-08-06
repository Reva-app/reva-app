-- 096_protocol_variant_groin_mcl_concussion.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Alternatieve/tweede herstelplannen voor drie bestaande injury_category-
-- waarden (zie migraties 081/082 voor de eerste protocollen per categorie).
-- Doel: meer variatie per categorie bieden, zodat een praktijk niet met één
-- vast scenario per blessuretype zit. Zelfde format als de bestaande
-- protocol-content (migratie 078 e.v.). NIET geverifieerd door een bevoegd
-- fysiotherapeut — clinically_reviewed blijft false, mag niet aan echte
-- patiënten worden toegewezen totdat een fysiotherapeut de inhoud heeft
-- gecontroleerd.
-- ============================================================================
--
-- Liesklachten (groin_strain): het bestaande protocol (migratie 081) is
-- gemodelleerd naar een acute adductorverrekking bij voetballers. Dit
-- alternatieve protocol richt zich op chronische / langdurige liesklachten
-- ("sporters-lies"), een multifactorieel beeld waarbij naast de adductoren
-- ook heupmobiliteit en core-/bekkenstabiliteit een rol spelen, met een
-- bredere en langere opbouw (ca. 10-12 weken) dan bij een enkelvoudige
-- acute verrekking.
--
-- Kniebandletsel MCL (mcl_sprain): het bestaande protocol (migratie 082) is
-- gemodelleerd naar een conservatief behandelde graad I-II verrekking. Dit
-- alternatieve protocol richt zich op een ernstigere graad III-verrekking
-- met volledige instabiliteit, waarbij een scharnierbrace (hinged knee
-- brace) een centrale rol speelt: een langere beschermende fase, een
-- stapsgewijze ROM-opbouw in de brace en expliciete afbouwcriteria voordat
-- de brace overdag en tijdens sport wordt losgelaten (ca. 10-14 weken).
--
-- Hersenschudding (concussion): het bestaande protocol (migratie 082) volgt
-- het "return to sport"-model voor voetballers. Dit alternatieve protocol is
-- een "return to learn/work"-variant voor niet-sporters (kantoormedewerkers,
-- studenten): de nadruk ligt op opbouw van cognitieve belasting
-- (schermtijd, lezen, werk-/schooltaken) in plaats van sportbelasting, met
-- dezelfde voorzichtige, symptoomgestuurde opbouw en de eis van minimaal 24
-- uur zonder toename van klachten voordat een volgende stap gezet mag
-- worden. Dit protocol vervangt op geen enkele manier medische beoordeling.
--
-- Alle oefeningen in dit bestand zijn nieuw en zelfstandig binnen dit
-- bestand aangemaakt (niet opgezocht in de bestaande gedeelde
-- oefeningenbibliotheek), zodat de bibliotheek meegroeit met genuine,
-- niet-dubbele content.

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 1: Chronische liesklachten / sporters-lies (groin_strain)
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_bekkenkanteling uuid;
  v_ex_adductor_iso_zit uuid;
  v_ex_deadbug uuid;
  v_ex_heupflexor_rek uuid;
  v_ex_sta_adductie_band uuid;
  v_ex_zijplank_beenlift uuid;
  v_ex_pallof uuid;
  v_ex_hometrainer_lies uuid;
  v_ex_bulgaarse_split_lies uuid;
  v_ex_diagonale_kabeltrek uuid;
  v_ex_hardlopen_opbouw_lies uuid;
  v_ex_zijligging_beenophouden uuid;
  v_ex_richting_rotatie uuid;
  v_ex_onderhoud_heup_core uuid;
  v_ex_duel_simulatie uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bekkenkanteling (pelvic tilt)', 'stabiliteit',
     'Lig op je rug met gebogen knieën. Kantel je bekken rustig naar achteren zodat je onderrug licht in de mat drukt, en weer terug.',
     'Rustig en gecontroleerd uitvoeren, zonder de adem vast te houden. Basisoefening voor bekken- en corecontrole.', 3, 12, array['lies', 'core', 'stabiliteit'])
    returning id into v_ex_bekkenkanteling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Adductor isometrie zittend', 'kracht',
     'Zit op een stoel met een bal of opgerolde handdoek tussen de knieën. Knijp de bal geleidelijk in en houd de spanning vast.',
     'Veilige, pijnvrije startoefening bij langdurige liesklachten. Bouw de intensiteit van het knijpen rustig op.', 3, 15, array['lies', 'kracht', 'thuis'])
    returning id into v_ex_adductor_iso_zit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Dead bug (buikspiercontrole)', 'stabiliteit',
     'Lig op je rug met armen omhoog en knieën in een hoek van 90°. Strek afwisselend een arm en het tegenovergestelde been, terwijl je onderrug plat op de mat blijft.',
     'Beweeg langzaam en gecontroleerd. Stop de beweging op het punt waarop je de onderrug voelt bewegen.', 3, 10, array['lies', 'core', 'stabiliteit'])
    returning id into v_ex_deadbug;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Heupflexor rek (halve kniezit)', 'rekken',
     'Ga in een halve kniezit, kantel het bekken licht naar achteren en breng het gewicht voorzichtig naar voren tot een rek voelbaar is aan de voorzijde van de heup.',
     'Rustige, aanhoudende rek zonder te veren. Stop bij scherpe pijn in de lies.', 2, 30, array['lies', 'mobiliteit', 'rekken'])
    returning id into v_ex_heupflexor_rek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Staande heupadductie met weerstandsband', 'kracht',
     'Bevestig een weerstandsband aan een vast punt en om de enkel van het te trainen been. Beweeg het been gecontroleerd naar de middellijn toe (adductie) en weer terug.',
     'Sta stabiel op het andere been, beweeg rustig en gecontroleerd, geen zwaaibeweging.', 3, 12, 'Lichte weerstandsband', array['lies', 'kracht', 'adductoren'])
    returning id into v_ex_sta_adductie_band;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Zijwaartse plank met beenlift', 'stabiliteit',
     'Ondersteun jezelf zijwaarts op onderarm en voet(en). Til het bovenste been iets op en houd de positie vast, met een rechte lijn van schouder tot enkel.',
     'Bouw de duur rustig op. Begin desgewenst met de knieën gebogen als steun.', 3, 20, array['lies', 'core', 'stabiliteit'])
    returning id into v_ex_zijplank_beenlift;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Pallof press (anti-rotatie)', 'stabiliteit',
     'Sta zijwaarts naast een vastgezette weerstandsband op buikhoogte. Druk de band recht voor je lichaam uit en weer terug, zonder dat de romp meedraait.',
     'De romp moet stabiel blijven: de oefening is geslaagd als er geen rotatie optreedt.', 3, 10, 'Lichte weerstandsband', array['lies', 'core', 'rotatiecontrole'])
    returning id into v_ex_pallof;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen op hometrainer (rustig tempo)', 'conditie',
     'Fiets op de hometrainer in een rustig, gelijkmatig tempo met lage weerstand.',
     'Bouw duur en weerstand op zolang er geen toename van liesklachten optreedt.', 600, array['lies', 'conditie', 'opbouw'])
    returning id into v_ex_hometrainer_lies;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bulgaarse split squat (heup- en corestabiliteit)', 'kracht',
     'Zet een voet achter je op een verhoging en zak door de voorste knie tot een gecontroleerde squat, met een stabiel bekken.',
     'Houd de romp rechtop en het bekken stabiel gedurende de hele beweging.', 3, 8, array['lies', 'kracht', 'heup'])
    returning id into v_ex_bulgaarse_split_lies;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Diagonale kabeltrek (rotatiekracht)', 'kracht',
     'Trek een weerstandsband of kabel diagonaal van heuphoogte naar schouderhoogte, met een lichte rotatie vanuit de romp en heup.',
     'Beweeg gecontroleerd, met de kracht vanuit heup en romp, niet alleen de arm.', 3, 10, 'Lichte weerstandsband', array['lies', 'kracht', 'rotatie'])
    returning id into v_ex_diagonale_kabeltrek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Hardlopen opbouwschema (liesklachten)', 'conditie',
     'Geleidelijk opbouwend hardloopschema, van korte afwisseling van wandelen en joggen naar aaneengesloten hardlopen op normaal tempo.',
     'Bouw op in kleine stappen. Ga een stap terug bij toename van liesklachten tijdens of na het lopen.', 1200, array['lies', 'conditie', 'hardlopen'])
    returning id into v_ex_hardlopen_opbouw_lies;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Zijligging beenophouden gestrekt (adductor eindkracht)', 'kracht',
     'Lig op je zij met het onderste been gestrekt. Til het gestrekte onderbeen iets van de mat en houd het kort vast, dan laten zakken.',
     'Houd het been in lijn met de romp, geen draaien van het bekken.', 3, 8, array['lies', 'kracht', 'adductoren'])
    returning id into v_ex_zijligging_beenophouden;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Richtingsverandering met rotatiecontrole (cutting drill)', 'kracht',
     'Loop op tempo en verander gecontroleerd van richting, met bewuste aandacht voor een stabiel bekken bij het afzetten.',
     'Verhoog snelheid en scherpte van de richtingsverandering pas als de vorige stap zonder klachten verliep.', 3, 6, array['lies', 'sportspecifiek', 'agility'])
    returning id into v_ex_richting_rotatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudsprogramma heup, core en adductoren', 'kracht',
     'Combinatieprogramma van heupmobiliteit, corestabiliteit en adductorkracht, bedoeld als terugkerend onderhoudsblok.',
     'Blijf dit programma structureel uitvoeren, ook na volledige terugkeer, om terugval te voorkomen.', 3, 12, array['lies', 'onderhoud', 'preventie'])
    returning id into v_ex_onderhoud_heup_core;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke actie met tegenstand (duel-simulatie)', 'conditie',
     'Sportspecifieke acties (afzetten, duelleren, richting veranderen) tegen lichte tegenstand, ter voorbereiding op wedstrijdbelasting.',
     'Uitsluitend in de laatste fase, zonder klachten tijdens of na afloop.', 900, array['lies', 'sportspecifiek', 'terugkeer'])
    returning id into v_ex_duel_simulatie;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'groin_strain', 'Herstelplan chronische liesklachten (sporters-lies)',
    'Herstelplan voor chronische / langdurige liesklachten ("sporters-lies"), een multifactorieel beeld waarbij naast de adductoren ook heupmobiliteit en core-/bekkenstabiliteit worden meegenomen. Bredere en langere opbouw dan bij een acute verrekking, van klachteninventarisatie via graded loading tot volledige sport- en belastingsterugkeer (ca. 10-12 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Brede inventarisatie en pijnregulatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Brede inventarisatie en pijnregulatie',
    'Pijn laten afnemen en de bijdragende factoren (heupmobiliteit, core-/bekkenstabiliteit, adductorbelasting) in kaart brengen, terwijl voorzichtig isometrisch wordt getraind.',
    'Week 0-2',
    array['Sprinten', 'Snelle richtingsveranderingen', 'Schieten op kracht', 'Zware buik- of liestraining'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij dagelijkse activiteiten duidelijk afgenomen', 0),
    (v_phase, 'Isometrische belasting mogelijk zonder scherpe pijn', 1),
    (v_phase, 'Heupmobiliteit en mogelijke bijdragende factoren in kaart gebracht', 2),
    (v_phase, 'Wandelen pijnvrij', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije wandeling', 0),
    (v_phase, 'Duidelijkheid over bijdragende factoren (heup, core, adductoren)', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Chronische liesklachten zijn vaak multifactorieel',
     'In tegenstelling tot een acute verrekking ontstaat langdurige liespijn vaak door een combinatie van factoren: beperkte heupmobiliteit, verminderde core-/bekkenstabiliteit én adductorbelasting. Een brede aanpak werkt daarom beter dan uitsluitend focussen op de lies zelf.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: chronische liesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_bekkenkanteling, 0, 3, 12, null),
    (v_schedule, v_ex_adductor_iso_zit, 1, 3, null, 15),
    (v_schedule, v_ex_deadbug, 2, 3, 10, null),
    (v_schedule, v_ex_heupflexor_rek, 3, 2, null, 30);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Graded loading — heup, core en adductoren
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Graded loading (heup, core en adductoren)',
    'Adductorkracht, heupmobiliteit en core-/bekkenstabiliteit gelijktijdig en geleidelijk opbouwen, en starten met joggen op laag tempo.',
    'Week 2-6',
    array['Sprinten op snelheid', 'Kicken/schieten op snelheid', 'Plotselinge richtingsveranderingen', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Adductorkracht merkbaar verbeterd', 0),
    (v_phase, 'Core-/bekkenstabiliteit verbeterd bij functionele bewegingen', 1),
    (v_phase, 'Joggen op laag tempo pijnvrij', 2),
    (v_phase, 'Geen toename van klachten na training', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste jogging-sessie zonder klachten', 0),
    (v_phase, 'Stabiliteitsoefeningen op één been mogelijk zonder compensatie', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Core- en heupstabiliteit versterken de lies indirect',
     'Onderzoek bij langdurige liesklachten laat zien dat training van bekken- en corestabiliteit, naast directe adductorkracht, bijdraagt aan klachtenvermindering. Bouw daarom beide gelijktijdig op.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Graded loading heup, core en adductoren: chronische liesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_sta_adductie_band, 0, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_zijplank_beenlift, 1, 3, null, 20, null),
    (v_schedule, v_ex_pallof, 2, 3, 10, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_hometrainer_lies, 3, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele kracht en sportspecifieke belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele kracht en sportspecifieke belasting',
    'Toewerken naar hogere belasting: functionele krachtoefeningen, hardloopopbouw op normaal tempo en rotatiebewegingen.',
    'Week 6-9',
    array['Wedstrijdsport', 'Volledige sprint zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Adductorkracht minimaal 85% van de andere zijde', 0),
    (v_phase, 'Hardlopen op normaal tempo pijnvrij', 1),
    (v_phase, 'Rotatie- en draaibewegingen zonder klachten', 2),
    (v_phase, 'Geen klachten na sportspecifieke belasting', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie op normaal tempo zonder klachten', 0),
    (v_phase, 'Eerste sportspecifieke rotatiebeweging zonder pijn', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen blijft belangrijk',
     'Ook wanneer de kracht al goed hersteld is, blijft langzaam opbouwen van rotatie- en sprintbelasting belangrijk bij langdurige liesklachten: te snel opbouwen is een bekende oorzaak van terugval.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele kracht en sportspecifieke belasting: chronische liesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_bulgaarse_split_lies, 0, 3, 8, null),
    (v_schedule, v_ex_diagonale_kabeltrek, 1, 3, 10, null),
    (v_schedule, v_ex_hardlopen_opbouw_lies, 2, null, null, 1200),
    (v_schedule, v_ex_zijligging_beenophouden, 3, 3, 8, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Onderhoud en terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Onderhoud en terugkeer naar sport',
    'Volledige sportspecifieke belasting en terugkeer naar training/wedstrijd, met een structureel onderhoudsprogramma om terugval te voorkomen.',
    'Week 9-12',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige sportspecifieke belasting zonder klachten', 0),
    (v_phase, 'Richtingsveranderingen en schieten/duels zonder pijn', 1),
    (v_phase, 'Symmetrische kracht behouden bij hogere belasting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training hervat', 0),
    (v_phase, 'Terug op het oude belastingsniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Onderhoud blijft nodig bij een multifactorieel beeld',
     'Omdat chronische liesklachten door meerdere factoren tegelijk ontstaan, is de kans op terugval groter als het onderhoudsprogramma (heup, core, adductoren) na terugkeer wordt losgelaten. Blijf dit structureel, ook na volledige terugkeer, in het trainingsschema houden.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud en terugkeer naar sport: chronische liesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_richting_rotatie, 0, 3, 6, null),
    (v_schedule, v_ex_onderhoud_heup_core, 1, 3, 12, null),
    (v_schedule, v_ex_duel_simulatie, 2, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 2: Kniebandletsel MCL graad III met brace (mcl_sprain)
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_quad_brace uuid;
  v_ex_enkelpompen_brace uuid;
  v_ex_ext_brace_limiet uuid;
  v_ex_hamstring_iso_brace uuid;
  v_ex_minisquat_brace uuid;
  v_ex_stepup_brace uuid;
  v_ex_wandzit_brace uuid;
  v_ex_hometrainer_brace uuid;
  v_ex_hamstringcurl_brace uuid;
  v_ex_eenbenige_balans_brace uuid;
  v_ex_terminalext_brace uuid;
  v_ex_zijstap_valgus uuid;
  v_ex_bulgaarse_split_mcl uuid;
  v_ex_cutting_brace uuid;
  v_ex_hardlopen_opbouw_mcl uuid;
  v_ex_sportspecifiek_brace uuid;
  v_ex_lunge_brace_limiet uuid;
  v_ex_eenbenige_squat_valgus uuid;
  v_ex_hoptest_symmetrie_mcl uuid;
  v_ex_landingstechniek_mcl uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Quadriceps aanspanning (in brace)', 'kracht',
     'Span, met de brace om, de bovenbeenspier aan door de knie licht in de brace te drukken, zonder de knie te bewegen.',
     'Houd de brace tijdens deze oefening om, tenzij je fysiotherapeut anders aangeeft.', 3, 15, 'Lichaamsgewicht', array['knie', 'mcl', 'brace'])
    returning id into v_ex_quad_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkelpompen (in brace)', 'mobiliteit',
     'Beweeg de voet op en neer vanuit de enkel, terwijl de knie in de brace blijft.',
     'Voorkomt stijfheid en ondersteunt de doorbloeding tijdens de beschermende fase.', 3, 20, array['knie', 'mcl', 'brace'])
    returning id into v_ex_enkelpompen_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Geassisteerde knie-extensie tot brace-limiet', 'mobiliteit',
     'Strek de knie voorzichtig, met hulp van de andere voet of een handdoek, tot aan de door de brace toegestane grens.',
     'Nooit voorbij de ingestelde brace-limiet forceren. Stop bij een instabiel of pijnlijk gevoel.', 2, 10, array['knie', 'mcl', 'mobiliteit'])
    returning id into v_ex_ext_brace_limiet;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Isometrische hamstringaanspanning (beperkte hoek)', 'kracht',
     'Span de hamstring aan door de hiel licht in de ondergrond te drukken, met de knie in een lichte, door de brace toegestane hoek.',
     'Geen zijwaartse (valgus-)belasting toevoegen tijdens deze oefening.', 3, 10, array['knie', 'mcl', 'brace'])
    returning id into v_ex_hamstring_iso_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Mini squat binnen brace-limiet', 'kracht',
     'Zak, met de brace om, gecontroleerd door de knieën tot aan de door de brace toegestane hoek en kom weer omhoog.',
     'Blijf binnen de ingestelde brace-hoek. Geen zijwaartse afwijking van de knie toestaan.', 3, 10, 'Lichaamsgewicht', array['knie', 'mcl', 'brace'])
    returning id into v_ex_minisquat_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-up laag opstapje (met brace)', 'kracht',
     'Stap, met de brace om, op en af een laag opstapje, gecontroleerd en zonder zijwaartse beweging van de knie.',
     'Kies de hoogte zo dat de knie recht boven de voet blijft, zonder naar binnen of buiten te zakken.', 3, 8, 'Lichaamsgewicht', array['knie', 'mcl', 'brace'])
    returning id into v_ex_stepup_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Wandzit binnen brace-ROM', 'kracht',
     'Sta met de rug tegen een muur en zak, met de brace om, tot aan de toegestane brace-hoek in een statische wandzit.',
     'Houd de knieën in lijn met de voeten, geen zijwaartse belasting.', 3, 20, array['knie', 'mcl', 'brace'])
    returning id into v_ex_wandzit_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen op hometrainer (met brace, lage weerstand)', 'conditie',
     'Fiets op de hometrainer met de brace om, op lage weerstand en een rustig tempo.',
     'Zadelhoogte zo instellen dat de knie soepel binnen de brace-limiet kan bewegen.', 600, array['knie', 'mcl', 'conditie'])
    returning id into v_ex_hometrainer_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Hamstringcurl met lichte weerstand', 'kracht',
     'Buig, liggend of staand, de knie tegen lichte weerstand in en weer terug.',
     'Rustig tempo, geen zijwaartse (valgus-)beweging van de knie tijdens de oefening.', 3, 12, 'Lichte weerstandsband', array['knie', 'mcl', 'kracht'])
    returning id into v_ex_hamstringcurl_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Eenbenige balans (brace als vangnet beschikbaar)', 'stabiliteit',
     'Sta op één been en houd de balans, met de brace binnen handbereik als extra ondersteuning indien nodig.',
     'Begin naast een steun (muur, stoel) en bouw op naar vrij staan zodra dit stabiel voelt.', 3, 20, array['knie', 'mcl', 'balans'])
    returning id into v_ex_eenbenige_balans_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Terminale extensie met weerstandsband', 'kracht',
     'Bevestig een band achter de knie en strek de knie de laatste graden tegen lichte weerstand in.',
     'Focus op de laatste, volledige strekking van de knie.', 3, 15, 'Lichte weerstandsband', array['knie', 'mcl', 'kracht'])
    returning id into v_ex_terminalext_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Zijwaartse stap met weerstandsband (valguscontrole)', 'stabiliteit',
     'Plaats een weerstandsband om beide enkels of knieën en stap zijwaarts, met bewuste controle om de knie niet naar binnen te laten zakken.',
     'Houd de knie steeds in lijn met de voet: dit traint actief de valguscontrole.', 3, 10, 'Lichte weerstandsband', array['knie', 'mcl', 'stabiliteit'])
    returning id into v_ex_zijstap_valgus;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bulgaarse split squat', 'kracht',
     'Zet een voet achter je op een verhoging en zak door de voorste knie tot een gecontroleerde squat.',
     'Houd de knie in lijn met de voet, zonder zijwaartse afwijking.', 3, 8, array['knie', 'mcl', 'kracht'])
    returning id into v_ex_bulgaarse_split_mcl;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Richtingsveranderingen met sportbrace (cutting drill)', 'kracht',
     'Verander gecontroleerd van richting tijdens hardlopen, met een lichte sportbrace om als extra zijwaartse ondersteuning.',
     'Verhoog snelheid en scherpte van de richtingsverandering pas na goedkeuring van de fysiotherapeut.', 3, 6, array['knie', 'mcl', 'sportspecifiek'])
    returning id into v_ex_cutting_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Hardlopen opbouwschema (na MCL graad III)', 'conditie',
     'Geleidelijk opbouwend hardloopschema, van korte afwisseling van wandelen en joggen naar aaneengesloten hardlopen op normaal tempo.',
     'Start pas na goedkeuring van de fysiotherapeut. Ga een stap terug bij instabiliteitsgevoel.', 1200, array['knie', 'mcl', 'hardlopen'])
    returning id into v_ex_hardlopen_opbouw_mcl;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke training met of zonder brace (in overleg)', 'conditie',
     'Sportspecifieke bewegingen en trainingsonderdelen, met of zonder sportbrace, in overleg met de fysiotherapeut.',
     'De keuze voor wel of geen brace tijdens sport gebeurt in overleg met fysiotherapeut of arts.', 1200, array['knie', 'mcl', 'sportspecifiek'])
    returning id into v_ex_sportspecifiek_brace;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Lunges binnen brace-limiet', 'kracht',
     'Zet, met de brace om, een gecontroleerde stap naar voren en zak door beide knieën tot aan de toegestane brace-hoek, en kom weer terug.',
     'Houd de voorste knie in lijn met de voet, zonder zijwaartse afwijking naar binnen of buiten.', 3, 8, 'Lichaamsgewicht', array['knie', 'mcl', 'kracht'])
    returning id into v_ex_lunge_brace_limiet;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Eenbenige squat met valguscontrole', 'kracht',
     'Zak gecontroleerd door op één been in een kleine hurkbeweging, met bewuste aandacht om de knie recht boven de voet te houden.',
     'Gebruik indien nodig lichte steun van een muur of stoel, en bouw pas af zodra de valguscontrole stabiel voelt.', 3, 8, array['knie', 'mcl', 'kracht', 'stabiliteit'])
    returning id into v_ex_eenbenige_squat_valgus;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Sprong-voor-afstand test (symmetriecontrole)', 'stabiliteit',
     'Spring op één been zo ver mogelijk naar voren en land gecontroleerd op hetzelfde been, zonder zijwaartse wegzakking van de knie.',
     'Vergelijk de afgelegde afstand en landingskwaliteit met het andere been als maat voor functionele symmetrie.', 2, 3, array['knie', 'mcl', 'stabiliteit', 'test'])
    returning id into v_ex_hoptest_symmetrie_mcl;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Landingstechniektraining (gecontroleerde sprong-landing)', 'kracht',
     'Spring van een lage verhoging af en land gecontroleerd met beide voeten, met een zachte knie en zonder zijwaartse (valgus-)wegzakking.',
     'Focus op een stille, gecontroleerde landing. Verhoog de spronghoogte pas als de landing steeds foutloos verloopt.', 3, 6, array['knie', 'mcl', 'kracht', 'landingstechniek'])
    returning id into v_ex_landingstechniek_mcl;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'mcl_sprain', 'Herstelplan kniebandletsel MCL (graad III, brace)',
    'Herstelplan voor een ernstige mediale kniebandblessure (MCL, graad III) met volledige instabiliteit, behandeld met een scharnierbrace (hinged knee brace). Langere beschermende fase, stapsgewijze ROM-opbouw in de brace en expliciete afbouwcriteria voordat de brace wordt losgelaten, van bescherming tot volledige sport- en belastingsterugkeer (ca. 10-14 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming in brace
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming in brace',
    'De knie volledig beschermen in de scharnierbrace terwijl pijn en zwelling afnemen en de eerste spieraansturing terugkeert.',
    'Week 0-3',
    array['Valgusbelasting (zijwaartse druk op de knie)', 'Brace afdoen zonder toestemming', 'Volledig gewicht zonder toestemming fysiotherapeut', 'Draaien op het belaste been', 'Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Brace correct en consistent gedragen volgens voorschrift', 0),
    (v_phase, 'Pijn in rust onder controle', 1),
    (v_phase, 'Quadriceps actief aan te spannen', 2),
    (v_phase, 'Zwelling duidelijk afgenomen', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Brace aangemeten en aangeleerd', 0),
    (v_phase, 'Eerste stappen gezet met brace (en eventueel krukken)', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom de brace er in deze fase altijd om moet',
     'Bij een graad III MCL-verrekking is de kniebandvoorziening volledig gescheurd en mist de knie tijdelijk zijwaartse stabiliteit. De scharnierbrace neemt deze stabiliteit over. Zet de brace niet af buiten de momenten die je fysiotherapeut uitdrukkelijk heeft toegestaan, ook niet als de knie zich al steviger voelt: voortijdig afdoen verhoogt het risico op een nieuwe, ernstigere verrekking.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Bescherming in brace: MCL graad III') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_quad_brace, 0, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelpompen_brace, 1, 3, 20, null, null),
    (v_schedule, v_ex_ext_brace_limiet, 2, 2, 10, null, null),
    (v_schedule, v_ex_hamstring_iso_brace, 3, 3, null, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 2: Voorzichtige mobiliteit en brace-ROM opbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Voorzichtige mobiliteit en brace-ROM opbouw',
    'De bewegingsuitslag die de brace toestaat stap voor stap verruimen, en starten met lichte, gecontroleerde belasting binnen de brace-limiet.',
    'Week 3-6',
    array['Brace afzetten buiten toegestane oefenmomenten', 'Valgusbelasting', 'Draaien op het belaste been', 'Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Brace-ROM stapsgewijs verruimd volgens schema', 0),
    (v_phase, 'Lopen met brace zonder hinken', 1),
    (v_phase, 'Mini squat binnen de toegestane brace-hoek pijnvrij', 2),
    (v_phase, 'Geen toename van instabiliteitsgevoel bij verruiming', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Brace-hoek verruimd naar vrijwel volledige mobiliteit', 0),
    (v_phase, 'Lopen zonder hulpmiddel (met brace)', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'ROM in de brace stap voor stap verruimen',
     'De scharnierbrace wordt in deze fase geleidelijk minder beperkend ingesteld. Elke verruiming van de bewegingsuitslag gebeurt op advies van je fysiotherapeut en pas als de voorgaande hoek pijnvrij en stabiel aanvoelt, niet op eigen initiatief.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Brace-ROM opbouw en mobiliteit: MCL graad III') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_minisquat_brace, 0, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_stepup_brace, 1, 3, 8, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_wandzit_brace, 2, 3, null, 20, null),
    (v_schedule, v_ex_hometrainer_brace, 3, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Krachtopbouw en voorbereiding brace-afbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Krachtopbouw en voorbereiding brace-afbouw',
    'Kracht en stabiliteit rond de knie opbouwen en toewerken naar het loslaten van de brace overdag, op basis van objectieve criteria.',
    'Week 6-10',
    array['Valgusbelasting op snelheid', 'Contactsport', 'Hardlopen zonder toestemming fysiotherapeut', 'Brace afbouwen zonder akkoord fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht minimaal 80% van het andere been', 0),
    (v_phase, 'Geen instabiliteitsgevoel bij dagelijkse activiteiten', 1),
    (v_phase, 'Goedkeuring fysiotherapeut voor afbouw brace-gebruik overdag', 2),
    (v_phase, 'Balans op één been mogelijk zonder duidelijke compensatie', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Brace overdag afgebouwd (met goedkeuring fysiotherapeut)', 0),
    (v_phase, 'Eerste keer lopen zonder brace binnenshuis', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Brace afbouwen gebeurt op criteria, niet op gevoel',
     'De brace overdag loslaten gebeurt pas als kracht, stabiliteit en het ontbreken van instabiliteitsgevoel objectief zijn vastgesteld door je fysiotherapeut: een knie die zich sterker voelt, is niet hetzelfde als een knie die aantoonbaar weer stabiel is.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw en voorbereiding brace-afbouw: MCL graad III') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_hamstringcurl_brace, 0, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_eenbenige_balans_brace, 1, 3, null, 20, null),
    (v_schedule, v_ex_terminalext_brace, 2, 3, 15, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_zijstap_valgus, 3, 3, 10, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_lunge_brace_limiet, 4, 3, 8, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_eenbenige_squat_valgus, 5, 3, 8, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Functionele afbouw en terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Functionele afbouw en terugkeer naar sport',
    'Volledige functionele belasting, hardlopen en richtingsveranderingen opbouwen, met een medisch goedgekeurde overgang naar sport met of zonder sportbrace.',
    'Week 10-14',
    array['Contactsport zonder goedkeuring fysiotherapeut of arts'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptest-symmetrie boven 90%', 0),
    (v_phase, 'Richtingsveranderingen zonder instabiliteitsgevoel', 1),
    (v_phase, 'Medische goedkeuring voor sport met of zonder brace', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder klachten', 0),
    (v_phase, 'Eerste sportspecifieke training afgerond', 1),
    (v_phase, 'Terug op het veld voor training of wedstrijd', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Extra voorzichtig na een graad III-verrekking',
     'Een doorgescheurde mediale kniebandvoorziening blijft ook na herstel gevoeliger voor een nieuwe zijwaartse overbelasting. Overleg met je fysiotherapeut of arts of een lichte sportbrace tijdens training en wedstrijd zinvol blijft, ook nadat de dagelijkse brace is losgelaten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele afbouw en terugkeer naar sport: MCL graad III') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_bulgaarse_split_mcl, 0, 3, 8, null),
    (v_schedule, v_ex_cutting_brace, 1, 3, 6, null),
    (v_schedule, v_ex_hardlopen_opbouw_mcl, 2, null, null, 1200),
    (v_schedule, v_ex_sportspecifiek_brace, 3, null, null, 1200),
    (v_schedule, v_ex_hoptest_symmetrie_mcl, 4, 2, 3, null),
    (v_schedule, v_ex_landingstechniek_mcl, 5, 3, 6, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 3: Hersenschudding — terugkeer naar werk/school (concussion)
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_activiteit_opbouw_thuis uuid;
  v_ex_werkblok_pauzes uuid;
  v_ex_wandelen_rtl uuid;
  v_ex_opbouw_taken uuid;
  v_ex_schermtijd uuid;
  v_ex_volledige_werkdag uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen (niet-fysiek/cognitief, zelfde stijl als migratie 082) ─

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Geleidelijke opbouw van dagelijkse activiteiten (thuis)', 'anders',
     'Bouw lichte dagelijkse bezigheden (korte gesprekken, licht huishouden, korte periodes rechtop) stap voor stap op, in het tempo dat de symptomen toelaten.',
     'Verhoog de belasting alleen als de vorige stap minimaal 24 uur geen toename van klachten heeft gegeven. Neem bij twijfel of aanhoudende hoofdpijn contact op met een arts.', array['hersenschudding', 'rust', 'return to learn'])
    returning id into v_ex_activiteit_opbouw_thuis;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Kort cognitief werk- of leesblok met pauzes', 'anders',
     'Voer een kort werk-, lees- of studieblok uit, gevolgd door een bewuste rustpauze zonder scherm.',
     'Start met blokken van 15 tot 20 minuten. Bouw pas op naar langere blokken als de vorige lengte minimaal 24 uur geen klachten heeft gegeven.', array['hersenschudding', 'cognitief', 'return to learn'])
    returning id into v_ex_werkblok_pauzes;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Rustig wandelen buiten (return to learn)', 'conditie',
     'Wandel in een rustig, gelijkmatig tempo buiten, zonder haast en zonder drukke, prikkelrijke omgevingen.',
     'Bouw de duur langzaam op zolang er geen toename van klachten optreedt.', 600, array['hersenschudding', 'conditie', 'wandelen'])
    returning id into v_ex_wandelen_rtl;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Opbouw werk- of schooltaken (halve dag)', 'anders',
     'Voer een deel van de gebruikelijke werk- of schooltaken uit, verdeeld over kortere blokken met pauzes.',
     'Bouw op naar een halve dag zodra kortere blokken 24 uur klachtenvrij zijn gebleven. Stop en neem pauze zodra klachten toenemen.', array['hersenschudding', 'werk', 'school'])
    returning id into v_ex_opbouw_taken;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Verlengde schermtijd met pauzeschema', 'anders',
     'Gebruik een beeldscherm (computer, telefoon, tablet) voor een langere, vooraf afgesproken periode, met vaste korte pauzes ingebouwd.',
     'Bouw de schermtijd op in stappen van circa 15 minuten per keer, alleen als de vorige stap 24 uur klachtenvrij is gebleven.', array['hersenschudding', 'schermtijd', 'cognitief'])
    returning id into v_ex_schermtijd;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Volledige werk- of schooldag hervat', 'anders',
     'Hervat het volledige, gebruikelijke werk- of schoolprogramma, inclusief piekmomenten zoals toetsen, examens of drukke werkperiodes.',
     'Alleen te starten nadat de opbouw in de vorige fase minimaal 24 uur zonder toename van klachten is doorlopen. Meld terugkerende klachten altijd bij een arts.', array['hersenschudding', 'werk', 'school', 'return to learn'])
    returning id into v_ex_volledige_werkdag;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'concussion', 'Herstelplan hersenschudding: terugkeer naar werk/school (return to learn)',
    'Bewust conservatief, gefaseerd terugkeerprotocol na een hersenschudding voor niet-sporters (kantoormedewerkers, studenten), gericht op opbouw van cognitieve belasting (schermtijd, lezen, werk- en schooltaken) in plaats van sportbelasting. Zelfde voorzichtige, symptoomgestuurde opbouw als het sportgerichte protocol: elke stap vereist minimaal 24 uur zonder toename van klachten voordat de volgende stap gezet mag worden. Dit protocol vervangt op geen enkele manier medische beoordeling.',
    false)
  returning id into v_protocol;

  -- Fase 1: Rust en symptoommonitoring
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Rust en symptoommonitoring',
    'Acute symptomen (hoofdpijn, duizeligheid, concentratieproblemen, lichtgevoeligheid) laten afnemen met korte, relatieve rust, en dagelijkse activiteiten uitsluitend geleidelijk hervatten zonder ze te verergeren.',
    'Dag 1 t/m klachtenvrij',
    array['Werken of studeren', 'Langdurige schermtijd', 'Autorijden', 'Fel licht of veel prikkels bij toename van klachten', 'Sporten of fysieke inspanning'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Acute symptomen nemen af in rust', 0),
    (v_phase, 'Geen verergering van klachten bij korte, lichte prikkels', 1),
    (v_phase, 'Minimaal 24 uur zonder toename van symptomen', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste symptoomvrije periode', 0),
    (v_phase, 'Lichte dagelijkse activiteiten hervat zonder verergering', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kort rusten, dan geleidelijk opbouwen',
     'De eerste 24 tot 48 uur is relatieve rust met beperkte schermtijd en prikkels verstandig. Daarna werkt geleidelijk weer opstarten van lichte activiteiten beter dan lang doorgaan met volledige rust. Neem bij aanhoudende of verergerende klachten (met name hoofdpijn die niet afneemt) altijd contact op met een arts.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Rust en opbouw dagelijkse activiteiten: return to learn') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescription_note) values
    (v_schedule, v_ex_activiteit_opbouw_thuis, 0, 'Dagelijks te herhalen, opbouw volledig op geleide van de symptomen');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Lichte cognitieve en fysieke belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Lichte cognitieve en fysieke belasting',
    'Voorzichtig starten met korte werkblokken, lezen en beeldschermgebruik, afgewisseld met pauzes, en lichte fysieke activiteit zoals rustig wandelen.',
    'Vanaf 24 uur symptoomvrij',
    array['Langdurige aaneengesloten schermtijd', 'Multitasken', 'Drukke of prikkelrijke omgevingen', 'Fysieke inspanning met kans op hoofdcontact'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Cognitieve taak van 15 tot 20 minuten zonder toename van klachten', 0),
    (v_phase, 'Lichte wandeling zonder klachten', 1),
    (v_phase, 'Geen toename van symptomen na een kort werk- of leesblok', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste kort werk- of schoolblok afgerond zonder klachten', 0),
    (v_phase, 'Eerste rustige wandeling zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Werk in korte blokken met pauzes',
     'Bouw cognitieve belasting op in korte blokken (bijvoorbeeld 15 tot 20 minuten) met een rustpauze ertussen, in plaats van direct een volledige werk- of schooldag te proberen. Neemt een klacht toe tijdens of na een blok, wacht dan tot je weer 24 uur klachtenvrij bent voordat je opnieuw probeert.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Lichte cognitieve en fysieke opbouw: return to learn') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds, prescription_note) values
    (v_schedule, v_ex_werkblok_pauzes, 0, 1200, 'Blok van circa 20 minuten, gevolgd door een rustpauze zonder scherm'),
    (v_schedule, v_ex_wandelen_rtl, 1, 600, 'Rustig, gelijkmatig tempo');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Opbouw werk- en schooltaken
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Opbouw werk- en schooltaken',
    'Duur en complexiteit van werk- of schooltaken stap voor stap uitbreiden, met langere schermtijd en voorzichtige hervatting van sociale/groepssituaties.',
    'Vanaf 24 uur symptoomvrij op vorige stap',
    array['Volledige werk- of schooldag zonder opbouw', 'Toetsen of examens zonder aangepaste voorwaarden', 'Prikkelrijke omgevingen zonder pauzemogelijkheid'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Halve werk- of schooldag zonder toename van klachten', 0),
    (v_phase, 'Langere schermtijd (circa 45 minuten) zonder klachten', 1),
    (v_phase, 'Concentratie voldoende hersteld voor eenvoudige taken', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste halve werk- of schooldag afgerond', 0),
    (v_phase, 'Eerste langere leestaak zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Overleg met school of werkgever over aanpassingen',
     'Bespreek met school, docenten of werkgever welke tijdelijke aanpassingen mogelijk zijn (kortere dagen, extra pauzes, uitstel van toetsen). Dat maakt een geleidelijke opbouw haalbaarder dan in één keer terug naar het volledige programma.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Opbouw werk- en schooltaken: return to learn') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescription_note) values
    (v_schedule, v_ex_opbouw_taken, 0, 'Verdeel over blokken met pauzes, bouw op naar een halve werk- of schooldag'),
    (v_schedule, v_ex_schermtijd, 1, 'Bouw op in stappen van circa 15 minuten, met vaste pauzes');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 4: Volledige terugkeer naar werk of school
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Volledige terugkeer naar werk of school',
    'Volledige werk- of schooldagen hervatten, inclusief piekmomenten zoals toetsen, examens of drukke werkperiodes, met aandacht voor eventueel terugkerende klachten.',
    'Vanaf medische goedkeuring / volledig klachtenvrij bij opbouw',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige werk- of schooldag zonder toename van klachten', 0),
    (v_phase, 'Piekmomenten (toetsen, examens, drukke werkperiodes) zonder toename van klachten', 1),
    (v_phase, 'Bij aanhoudende klachten: contact met een arts vóór verdere opbouw', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige werk- of schoolweek afgerond', 0),
    (v_phase, 'Terug op het oude niveau van functioneren', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf alert op terugkerende klachten',
     'Ook na een volledige terugkeer kunnen klachten door vermoeidheid of drukte terugkomen. Meld aanhoudende of terugkerende hoofdpijn, concentratieproblemen of duizeligheid altijd bij een arts: dit protocol vervangt op geen enkele manier medische beoordeling.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Volledige terugkeer: return to learn') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescription_note) values
    (v_schedule, v_ex_volledige_werkdag, 0, 'Volledig, inclusief piekmomenten, na 24 uur klachtenvrij op de vorige stap');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

end $$;

notify pgrst, 'reload schema';
