-- 093_protocol_variant_acl_knee_hip.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Deze migratie voegt een tweede, bewust ANDERS opgebouwd REVA-herstelplan toe
-- voor drie categorieën die tot nu toe maar één protocol hadden (migraties
-- 053/055/079): acl, total_knee_replacement en total_hip_replacement. Doel is
-- meer variatie in de bibliotheek — geen near-duplicate van het bestaande
-- protocol, maar een genuine andere klinische situatie of chirurgische
-- benadering. Zelfde format als de bestaande protocol-content: fases met een
-- weekindicatie, criteria/mijlpalen/educatie per fase, trainingsschema's
-- gekoppeld aan de gedeelde oefeningenbibliotheek. NIET geverifieerd door een
-- bevoegd fysiotherapeut — clinically_reviewed blijft false, mag niet aan
-- echte patiënten worden toegewezen totdat een fysiotherapeut de inhoud heeft
-- gecontroleerd.
-- ============================================================================
--
-- ACL (conservatief traject): voor patiënten die, in overleg met hun
-- chirurg, kiezen voor een niet-operatief traject na een voorste-
-- kruisbandletsel. Geen enkele operatie-gerelateerde fase (geen wond- of
-- transplantaat-bescherming) — de nadruk ligt op neuromusculaire training en
-- het onderscheid tussen ‘copers’ (die zonder operatie kunnen sporten) en
-- ‘non-copers’ (die alsnog een operatie kunnen overwegen). Het bestaande
-- operatieve ACL-protocol (migratie 055, injury_category 'acl') blijft
-- daarnaast gewoon bestaan voor patiënten die wél een reconstructie
-- ondergaan.
--
-- Totale knieprothese (fast-track / ERAS): een versneld traject voor
-- fittere, jongere of gemotiveerde patiënten die geschikt zijn bevonden voor
-- Enhanced Recovery After Surgery — vroege mobilisatie al op de operatiedag,
-- lopen zonder hulpmiddel binnen dagen in plaats van weken, en een totale
-- doorlooptijd van circa 6-8 weken in plaats van de 3-4 maanden van het
-- standaardprotocol (migratie 055).
--
-- Totale heupprothese (voorste/anterieure benadering): een variant met
-- wezenlijk andere voorzorgen dan het bestaande protocol (migratie 079, dat
-- impliciet een achterste benadering volgt). Bij de voorste benadering
-- gelden de klassieke heupvoorzorgen (niet kruisen, niet diep buigen, niet
-- naar binnen draaien) doorgaans niet — in plaats daarvan is voorzichtigheid
-- geboden bij het combineren van heupstrekking met buitenwaartse rotatie.
-- Mobilisatie start ook hier sneller dan bij de achterste benadering.
--
-- Alle oefeningen in de drie protocollen hieronder zijn NIEUW toegevoegd aan
-- de gedeelde reva-oefeningenbibliotheek (geen hergebruik van bestaande
-- items) — bewust zelfstandig binnen deze migratie ingevoegd.

do $$
declare
  -- ── ACL conservatief (zonder operatie): nieuwe oefeningen ───────────────
  v_ex_c_quad_iso uuid;
  v_ex_c_zwelling_hoogleggen uuid;
  v_ex_c_looppatroon uuid;
  v_ex_c_fietsen_licht uuid;
  v_ex_c_hamstring_iso uuid;
  v_ex_c_eenbenige_balans uuid;
  v_ex_c_squat_progressief uuid;
  v_ex_c_wiebelbord uuid;
  v_ex_c_hoptest_prep uuid;
  v_ex_c_cutting_gecontroleerd uuid;
  v_ex_c_hardlopen_opbouw uuid;
  v_ex_c_stabiliteitscheck uuid;
  v_ex_c_sportspecifiek uuid;
  v_ex_c_onderhoud uuid;

  -- ── Totale knieprothese fast-track / ERAS: nieuwe oefeningen ────────────
  v_ex_ft_quad_activatie uuid;
  v_ex_ft_enkelpompen_intensief uuid;
  v_ex_ft_sit_to_stand_snel uuid;
  v_ex_ft_lopen_zonder_hulp uuid;
  v_ex_ft_traplopen uuid;
  v_ex_ft_hometrainer uuid;
  v_ex_ft_stepup uuid;
  v_ex_ft_balans uuid;
  v_ex_ft_wandelen_buiten uuid;
  v_ex_ft_onderhoud uuid;

  -- ── Totale heupprothese, voorste benadering: nieuwe oefeningen ──────────
  v_ex_a_transfer uuid;
  v_ex_a_quad uuid;
  v_ex_a_glute uuid;
  v_ex_a_lopen_looprek uuid;
  v_ex_a_heupflexie uuid;
  v_ex_a_hometrainer uuid;
  v_ex_a_traplopen uuid;
  v_ex_a_stepup uuid;
  v_ex_a_balans uuid;
  v_ex_a_heupextensie_gecontroleerd uuid;
  v_ex_a_wandelen_buiten uuid;
  v_ex_a_onderhoud uuid;
  v_ex_a_birddog uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — ACL conservatief (zonder operatie)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Quadricepsactivatie isometrisch (zonder operatie)', 'kracht',
     'Zit of lig met het been gestrekt. Span de bovenbeenspier aan door de knie licht in de mat/vloer te duwen, zonder de knie te bewegen.',
     'Direct te starten na het letsel, ook zonder operatie. Een goede quadricepsactivatie is de basis van elk vervolg, operatief of niet.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_c_quad_iso;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Beenhef ter vermindering van zwelling', 'mobiliteit',
     'Lig op je rug met het been ondersteund en hoger dan het hart. Combineer met rustige enkelpompen.',
     'Herhaal meerdere keren per dag in de eerste weken om zwelling te beperken.', 600, array['knie', 'mobiliteit'])
    returning id into v_ex_c_zwelling_hoogleggen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Looppatroon hertraining', 'stabiliteit',
     'Loop bewust in een rechte lijn met een symmetrisch, normaal looppatroon, eventueel voor een spiegel of met hulp van de fysiotherapeut.',
     'Doel is zo snel mogelijk een normaal looppatroon zonder hinken, ook zonder operatie is dit haalbaar zodra pijn en zwelling het toelaten.', 2, 10, 'Lichaamsgewicht', array['knie', 'stabiliteit'])
    returning id into v_ex_c_looppatroon;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen zonder weerstand (vroege fase)', 'conditie',
     'Fiets op een hometrainer met minimale weerstand, uitsluitend als dit pijnvrij lukt.',
     'Goede manier om mobiliteit en bloedsomloop te stimuleren zonder de knie te belasten.', 600, array['knie', 'conditie'])
    returning id into v_ex_c_fietsen_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Hamstringactivatie isometrisch', 'kracht',
     'Zit met het been licht gebogen. Druk de hiel in de vloer alsof je het been naar je toe trekt, zonder te bewegen.',
     'De hamstrings ondersteunen de functie van de voorste kruisband, belangrijk aandachtspunt in een niet-operatief traject.', 3, 12, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_c_hamstring_iso;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Eenbenige balanstraining (progressief)', 'stabiliteit',
     'Sta op het aangedane been, bouw op van vasthouden aan een steun naar zelfstandig balanceren.',
     'Eén van de belangrijkste oefeningen om vast te stellen en te trainen of de knie voldoende dynamische controle heeft zonder de kruisband.', 3, 30, array['knie', 'stabiliteit'])
    returning id into v_ex_c_eenbenige_balans;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Squat met progressieve belasting', 'kracht',
     'Voer een squat uit tot een pijnvrije diepte, met de romp rechtop en de knieën in lijn met de tenen.',
     'Bouw diepte en belasting rustig op naarmate kracht en vertrouwen toenemen.', 3, 10, 'Lichaamsgewicht, later gewichtsvest', array['knie', 'kracht'])
    returning id into v_ex_c_squat_progressief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Propriocepsietraining wiebelbord', 'stabiliteit',
     'Sta op een wiebelbord of balanskussen en houd de balans, eventueel met lichte bewegingen van armen of het andere been.',
     'Traint het gevoel voor de stand van de knie, een sleutelfactor bij het compenseren van een ontbrekende kruisband.', 3, 30, array['knie', 'stabiliteit'])
    returning id into v_ex_c_wiebelbord;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Functionele hoptest voorbereiding', 'stabiliteit',
     'Oefen gecontroleerde kleine sprongen op het aangedane been met een zachte, stabiele landing.',
     'Bereidt voor op de hoptesten die worden gebruikt om te bepalen of iemand functioneel een ‘coper’ is.', 2, 6, 'Lichaamsgewicht', array['knie', 'stabiliteit'])
    returning id into v_ex_c_hoptest_prep;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Gecontroleerde richtingsverandering (conservatief traject)', 'stabiliteit',
     'Loop op driekwart snelheid en verander op een gemarkeerd punt gecontroleerd van richting.',
     'Alleen starten nadat kracht en balans symmetrisch zijn. Bij twijfel of instabiliteitsgevoel eerst terugschakelen.', 3, 6, 'Lichaamsgewicht', array['knie', 'stabiliteit'])
    returning id into v_ex_c_cutting_gecontroleerd;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Hardloopopbouwschema (conservatief traject)', 'conditie',
     'Volg een geleidelijk opbouwschema van wandel-/jog-intervallen naar aaneengesloten hardlopen op vlakke, voorspelbare ondergrond.',
     'Start pas met hardlopen na goedkeuring van de fysiotherapeut op basis van kracht- en stabiliteitstesten.', 1200, array['knie', 'conditie'])
    returning id into v_ex_c_hardlopen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Dynamische stabiliteitscontrole', 'stabiliteit',
     'Voer sport-nabootsende bewegingen uit (versnellen, afremmen, draaien) terwijl de fysiotherapeut let op instabiliteitsgevoel of ‘giving-way’.',
     'Meld direct als de knie doorzakt of onbetrouwbaar aanvoelt. Dit is belangrijke informatie voor de verdere opbouw.', 3, 30, array['knie', 'stabiliteit'])
    returning id into v_ex_c_stabiliteitscheck;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke bewegingsdrills (conservatief traject)', 'stabiliteit',
     'Oefen sportspecifieke bewegingen (dribbelen, passen, versnellen) gecombineerd met richtingsveranderingen.',
     'Sluit zo veel mogelijk aan bij de eigen sport, in overleg met fysiotherapeut en eventueel trainer.', 1200, array['knie', 'stabiliteit'])
    returning id into v_ex_c_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudskracht been en heup (conservatief traject)', 'kracht',
     'Voer twee tot drie keer per week een kort krachtprogramma uit gericht op been- en heupkracht.',
     'Doel is het opgebouwde kracht- en stabiliteitsniveau vasthouden, ook na terugkeer naar sport.', 3, 12, array['knie', 'kracht'])
    returning id into v_ex_c_onderhoud;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: ACL — conservatief traject (zonder operatie) — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'acl', 'Conservatief ACL-traject (zonder operatie)',
    'Herstelprotocol voor patiënten die, samen met hun chirurg, hebben gekozen voor een niet-operatieve behandeling van een voorste-kruisbandletsel. Geen operatieve fase. De nadruk ligt op neuromusculaire training en het testen of iemand functioneel een ‘coper’ is (kan sporten zonder kruisband) of een ‘non-coper’ (bij wie een operatie alsnog overwogen kan worden). Doorlooptijd circa 4-6 maanden. Voor patiënten die wél een reconstructie ondergaan, zie het reguliere herstelplan ‘ACL-reconstructie herstelprotocol’.',
    false)
  returning id into v_protocol;

  -- Fase 1: Acute reactie en functieherstel
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Acute reactie en functieherstel',
    'Zwelling en pijn beheersen, quadricepscontrole herwinnen en een normaal looppatroon herstellen na het kniedistorsie-letsel, zonder chirurgische ingreep.',
    'Week 0-3',
    array['Pivoterende bewegingen', 'Hardlopen', 'Sporten met richtingsveranderingen', 'Traplopen zonder controle'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige knie-extensie (0°) bereikt', 0),
    (v_phase, 'Zwelling duidelijk afgenomen', 1),
    (v_phase, 'Quadriceps actief aan te spannen', 2),
    (v_phase, 'Lopen zonder hinken', 3),
    (v_phase, 'Pijn onder controle in rust', 4);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste wandeling zonder hinken', 0),
    (v_phase, 'Zwelling onder controle', 1),
    (v_phase, 'Quadricepscontrole hervonden', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Zonder operatie is vroege activatie extra belangrijk',
     'Omdat er geen transplantaat of wond te beschermen is, kun je direct starten met het actief aanspannen van de quadriceps en het herstellen van een normaal looppatroon. Deze vroege functieherstel is juist bij een niet-operatief traject essentieel, het is de basis waarop de rest van het programma voortbouwt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Vroege fase zonder operatie: ACL conservatief') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_c_quad_iso, 0, 3, null, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_c_zwelling_hoogleggen, 1, null, null, 600, null),
    (v_schedule, v_ex_c_looppatroon, 2, 2, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_c_fietsen_licht, 3, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Neuromusculaire controle en krachtopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Neuromusculaire controle en krachtopbouw',
    'Symmetrische spierkracht en dynamische controle opbouwen als basis om te bepalen of de knie zonder kruisband voldoende belasting kan opvangen (‘coper’-status).',
    'Week 3-10',
    array['Pivoterende sporten', 'Contactsport', 'Onvoorspelbare richtingsveranderingen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Quadricepskracht minimaal 80% van het andere been', 0),
    (v_phase, 'Hamstringkracht symmetrisch aan het andere been', 1),
    (v_phase, 'Balans op één been minimaal 30 seconden', 2),
    (v_phase, 'Eerste functionele hoptest afgenomen door fysiotherapeut', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen 20 minuten zonder klachten', 0),
    (v_phase, 'Balans op instabiele ondergrond mogelijk', 1),
    (v_phase, 'Eerste hoptest afgerond', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Coper of non-coper: deze fase geeft antwoord',
     'Een deel van de mensen met een voorste-kruisbandletsel kan, dankzij goede spiercontrole en balans, zonder operatie weer sporten (‘copers’). Anderen blijven instabiliteit voelen (‘non-copers’) en overwegen dan alsnog een operatie. De kracht- en balanstraining en de hoptesten in deze fase helpen samen met je fysiotherapeut te bepalen welke groep bij jou past.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Neuromusculaire opbouw: ACL conservatief') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_c_hamstring_iso, 0, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_c_squat_progressief, 1, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_c_eenbenige_balans, 2, 3, null, 30, null),
    (v_schedule, v_ex_c_wiebelbord, 3, 3, null, 30, null),
    (v_schedule, v_ex_c_hoptest_prep, 4, 2, 6, null, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Dynamische stabiliteit en sportspecifieke belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Dynamische stabiliteit en sportspecifieke belasting',
    'Richtingsveranderingen, hardlopen en sportspecifieke bewegingen geleidelijk introduceren, met voortdurende aandacht voor instabiliteitsgevoel.',
    'Week 10-16',
    array['Wedstrijdsport', 'Contactsport', 'Onvoorspelbare duels'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptest-symmetrie boven 85%', 0),
    (v_phase, 'Richtingsveranderingen zonder instabiliteitsgevoel', 1),
    (v_phase, '20 minuten hardlopen pijnvrij op vlakke ondergrond', 2),
    (v_phase, 'Geen episodes van doorzakken (‘giving-way’) in deze fase', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder pijn', 0),
    (v_phase, 'Eerste richtingsverandering zonder instabiliteit', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Meld instabiliteit direct',
     'Ervaar je herhaaldelijk dat de knie doorzakt of onbetrouwbaar aanvoelt tijdens deze fase, bespreek dit dan direct met je fysiotherapeut of chirurg. Dit conservatieve traject sluit een latere operatie niet uit, het is juist bedoeld om op basis van je functionele vooruitgang samen de beste keuze te maken.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Dynamische stabiliteit: ACL conservatief') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_c_cutting_gecontroleerd, 0, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_c_hardlopen_opbouw, 1, null, null, 1200, null),
    (v_schedule, v_ex_c_stabiliteitscheck, 2, 3, null, 30, null),
    (v_schedule, v_ex_c_sportspecifiek, 3, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar sport en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport en onderhoud',
    'Volledige, begeleide terugkeer naar sport voor patiënten die functioneel stabiel zijn gebleken, met een onderhoudsprogramma om het niveau vast te houden.',
    'Week 16-24',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledig meegetraind zonder klachten of instabiliteit', 0),
    (v_phase, 'Goedkeuring fysiotherapeut voor sportterugkeer', 1);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige teamtraining afgerond', 0),
    (v_phase, 'Terug op het oude sportniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden, en blijf alert',
     'Blijf ook na terugkeer twee tot drie keer per week gericht kracht- en stabiliteitswerk doen. Neem bij herhaalde instabiliteitsklachten, ook maanden later, opnieuw contact op met je chirurg. Een operatie blijft in dat geval een optie.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: ACL conservatief') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_c_onderhoud, 0, 3, 12, null),
    (v_schedule, v_ex_c_sportspecifiek, 1, null, null, 1200);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — Totale knieprothese fast-track / ERAS
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Quadricepsactivatie (fast-track protocol)', 'kracht',
     'Zit of lig met het been gestrekt. Span de bovenbeenspier actief aan, houd kort vast en ontspan.',
     'Start al enkele uren na de operatie, vroege activatie is een kernonderdeel van het versnelde protocol.', 3, 15, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_ft_quad_activatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Enkelpompen intensief (fast-track protocol)', 'mobiliteit',
     'Beweeg de voet actief op en neer in een stevig tempo, meerdere keren per uur op de operatiedag zelf.',
     'Stimuleert de doorbloeding en helpt zwelling te beperken direct vanaf de operatiedag.', 3, 20, 'Lichaamsgewicht', array['knie', 'mobiliteit'])
    returning id into v_ex_ft_enkelpompen_intensief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Snel opstaan-gaan zitten (functionele transfer)', 'kracht',
     'Ga zitten op een stevige stoel en kom, met zo min mogelijk steun van de armen, weer overeind. Herhaal rustig.',
     'Onderdeel van de mobilisatie op de operatiedag zelf, doel is een zelfstandige transfer binnen enkele uren na de ingreep.', 3, 8, 'Lichaamsgewicht, armleuningen toegestaan indien nodig', array['knie', 'kracht'])
    returning id into v_ex_ft_sit_to_stand_snel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Loopopbouw zonder hulpmiddel', 'stabiliteit',
     'Loop steeds langere afstanden, bouw af van looprek naar één stok naar geen hulpmiddel zodra dit veilig en stabiel lukt.',
     'Bij het versnelde protocol is lopen zonder hulpmiddel binnenshuis vaak al binnen enkele dagen haalbaar, veel eerder dan bij het standaardtraject.', 600, array['knie', 'stabiliteit'])
    returning id into v_ex_ft_lopen_zonder_hulp;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Traplopen zonder leuning (fast-track opbouw)', 'kracht',
     'Loop de trap op en af, bouw af van steun aan de leuning naar zelfstandig traplopen.',
     'Oefen dagelijks in een rustig tempo, met begeleiding zolang dat nodig is.', 2, 10, null, array['knie', 'kracht'])
    returning id into v_ex_ft_traplopen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen op hometrainer (versnelde opbouw)', 'conditie',
     'Fiets op een hometrainer met lage weerstand op een rustig tempo, start zodra de flexie dit toelaat.',
     'Bouw duur en weerstand sneller op dan bij het standaardprotocol, zolang dit pijnvrij blijft.', 600, array['knie', 'conditie'])
    returning id into v_ex_ft_hometrainer;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-up versnelde opbouw', 'kracht',
     'Zet het geopereerde been op een lage opstap en stap er gecontroleerd op, strek de knie volledig.',
     'Verhoog de hoogte van het opstapje zodra dit pijnvrij en gecontroleerd lukt, bij fast-track vaak al in week 2-3.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_ft_stepup;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Balanstraining vroege fase (fast-track)', 'stabiliteit',
     'Sta op het geopereerde been met lichte steun van een stoel of muur, bouw af naar zelfstandig balanceren.',
     'Vroege balanstraining ondersteunt een stabiel, symmetrisch looppatroon zonder hulpmiddel.', 3, 20, array['knie', 'stabiliteit'])
    returning id into v_ex_ft_balans;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen buiten opbouwend (fast-track)', 'conditie',
     'Wandel buiten op vlak terrein in een rustig, gelijkmatig tempo.',
     'Bouw de afstand elke week op, aansluitend bij het versnelde tempo van dit protocol.', 900, array['knie', 'conditie'])
    returning id into v_ex_ft_wandelen_buiten;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudskracht been (fast-track)', 'kracht',
     'Voer twee tot drie keer per week een kort krachtprogramma uit gericht op beenkracht (bijv. squats, step-ups).',
     'Doel is het snel opgebouwde niveau vasthouden en verder uitbouwen richting volledige belastbaarheid.', 3, 12, array['knie', 'kracht'])
    returning id into v_ex_ft_onderhoud;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Totale knieprothese — fast-track / ERAS — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'total_knee_replacement', 'Versneld hersteltraject knieprothese (fast-track / ERAS)',
    'Versneld herstelprotocol (Enhanced Recovery After Surgery) na plaatsing van een totale knieprothese, bedoeld als alternatief voor fittere, jongere of gemotiveerde patiënten die door chirurg en fysiotherapeut geschikt zijn bevonden. Mobilisatie start al op de operatiedag en lopen zonder hulpmiddel wordt binnen dagen nagestreefd in plaats van weken. Doorlooptijd circa 6-8 weken, aanzienlijk korter dan het standaardprotocol van 3-4 maanden. Niet geschikt voor elke patiënt. Bij twijfel geldt het reguliere ‘Totale knieprothese herstelprotocol’.',
    false)
  returning id into v_protocol;

  -- Fase 1: Operatiedag en directe mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Operatiedag en directe mobilisatie',
    'Dankzij multimodale pijnbestrijding en een ERAS-aanpak wordt al op de operatiedag zelf gestart met staan en de eerste stappen, in plaats van pas de volgende dag.',
    'Dag 0-3',
    array['Langdurig platliggen', 'Knielen op het geopereerde been', 'Onbegeleide mobilisatie zonder hulpmiddel'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Staan en enkele passen zetten op de operatiedag zelf (met looprek)', 0),
    (v_phase, 'Zelfstandige transfer bed-stoel binnen 24 uur', 1),
    (v_phase, 'Pijn onder controle met multimodale pijnstilling', 2),
    (v_phase, 'Wond zonder tekenen van infectie', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stappen op de operatiedag', 0),
    (v_phase, 'Ontslag naar huis binnen 1-2 dagen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Wat is ERAS en waarom sneller mobiliseren?',
     'Bij een fast-track (ERAS) traject wordt met multimodale pijnbestrijding en een lager gebruik van zware pijnstillers (opioïden) al op de operatiedag gestart met staan en lopen. Vroege mobilisatie vermindert het risico op complicaties zoals stijfheid en trombose, en versnelt aantoonbaar het functionele herstel bij geschikte kandidaten. Elke dag heeft een concreet doel, vraag je fysiotherapeut wat het doel van vandaag is.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Directe mobilisatie: fast-track knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ft_quad_activatie, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ft_enkelpompen_intensief, 1, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ft_sit_to_stand_snel, 2, 3, 8, 'Lichaamsgewicht, armleuningen toegestaan indien nodig');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Snelle functionele opbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Snelle functionele opbouw',
    'Lopen zonder hulpmiddel, traplopen en zelfstandige mobiliteit versneld opbouwen ten opzichte van het standaardtraject.',
    'Week 1-3',
    array['Hardlopen', 'Springen', 'Knielen op het geopereerde been', 'Sporten met impact'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen zonder hulpmiddel binnenshuis binnen 1 week', 0),
    (v_phase, 'Knieflexie minimaal 100° binnen 2 weken', 1),
    (v_phase, 'Traplopen zonder leuning vanaf week 3', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer in week 1', 0),
    (v_phase, 'Autorijden hervat (in overleg met behandelaar)', 1),
    (v_phase, 'Eerste wandeling buitenshuis', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Dit tempo is niet voor iedereen, en dat is prima',
     'Dit fast-track schema gaat uit van een sneller tempo dan het standaardprotocol, omdat je vooraf als geschikte kandidaat bent beoordeeld. Voel je dat het tempo te snel gaat, meld dit dan direct bij je fysiotherapeut. Overstappen naar een rustiger opbouwschema is altijd mogelijk en geen teken van falen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Snelle functionele opbouw: fast-track knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ft_lopen_zonder_hulp, 0, null, null, 600, null),
    (v_schedule, v_ex_ft_traplopen, 1, 2, 10, null, null),
    (v_schedule, v_ex_ft_hometrainer, 2, null, null, 600, null),
    (v_schedule, v_ex_ft_stepup, 3, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ft_balans, 4, 3, null, 20, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Terugkeer naar activiteit en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar activiteit en onderhoud',
    'Volledige functionele zelfstandigheid bereiken en terugkeren naar werk en lichte hobby''s, met een onderhoudsprogramma.',
    'Week 3-8',
    array['Hardlopen', 'Springen', 'Sporten met impact'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wandelen 30 minuten pijnvrij zonder hulpmiddel', 0),
    (v_phase, 'Volledige zelfstandigheid in dagelijkse activiteiten', 1),
    (v_phase, 'Geen zwelling na een actieve dag', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Terug naar werk (afhankelijk van beroep, in overleg)', 0),
    (v_phase, 'Fietsen buitenshuis hervat', 1),
    (v_phase, 'Terug op het gewenste activiteitenniveau', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Sneller herstel vraagt om net zo goed onderhoud',
     'Een versneld traject betekent niet dat de prothese minder aandacht nodig heeft op de lange termijn. Blijf regelmatig lichte, laag-impact activiteiten doen zoals fietsen of wandelen om het bereikte niveau vast te houden.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: fast-track knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_ft_onderhoud, 0, 3, 12, null),
    (v_schedule, v_ex_ft_wandelen_buiten, 1, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — Totale heupprothese, voorste benadering
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Zelfstandige transfer oefenen (voorste heupbenadering)', 'kracht',
     'Oefen het overeind komen vanuit bed of stoel met een gecontroleerde beweging, met hulpmiddel indien nodig.',
     'Dankzij de spiersparende voorste benadering is een zelfstandige transfer vaak al de dag van de operatie haalbaar.', 3, 8, 'Lichaamsgewicht, hulpmiddel toegestaan', array['heup', 'kracht'])
    returning id into v_ex_a_transfer;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Quadricepsactivatie liggend (voorste heupbenadering)', 'kracht',
     'Lig met het been gestrekt en span de bovenbeenspier actief aan, houd kort vast en ontspan.',
     'Ondersteunt een stabiel looppatroon vanaf de eerste dag na de operatie.', 3, 15, 'Lichaamsgewicht', array['heup', 'kracht'])
    returning id into v_ex_a_quad;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bekkenstabilisatie zittend (glutei)', 'kracht',
     'Zit rechtop en span de bilspieren aan, houd kort vast en ontspan. Kan ook staand worden uitgevoerd.',
     'Traint de bilspieren die bij de voorste benadering intact zijn gebleven, belangrijk voor een stabiel bekken.', 3, 12, 'Lichaamsgewicht', array['heup', 'kracht'])
    returning id into v_ex_a_glute;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Lopen met looprek, versnelde opbouw', 'stabiliteit',
     'Loop met het looprek in korte, regelmatige stukjes, meerdere keren per dag vanaf de operatiedag zelf.',
     'Bouw de afstand dagelijks op, de voorste benadering maakt vroege belasting doorgaans goed mogelijk.', 300, array['heup', 'stabiliteit'])
    returning id into v_ex_a_lopen_looprek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Actieve heupflexie in stand, vrije uitvoering', 'mobiliteit',
     'Sta rechtop met steun en breng de knie gecontroleerd omhoog richting de borst, zonder daarbij naar buiten te draaien.',
     'Bij de voorste benadering geldt geen algemene beperking op heupflexie zoals bij de klassieke achterste toegang. Voer wel steeds gecontroleerd uit.', 3, 12, 'Lichaamsgewicht', array['heup', 'mobiliteit'])
    returning id into v_ex_a_heupflexie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen op hometrainer (voorste heupbenadering)', 'conditie',
     'Fiets op een hometrainer met lage weerstand op een rustig tempo, zadel niet te laag.',
     'Kan bij de voorste benadering vaak eerder gestart worden dan bij de klassieke achterste toegang.', 600, array['heup', 'conditie'])
    returning id into v_ex_a_hometrainer;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Traplopen oefenen (voorste heupbenadering)', 'kracht',
     'Loop de trap op en af, bouw af van steun aan de leuning naar zelfstandig traplopen.',
     'Oefen dagelijks in een rustig tempo, met begeleiding zolang dat nodig is.', 2, 10, array['heup', 'kracht'])
    returning id into v_ex_a_traplopen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-up geleidelijke opbouw (heup)', 'kracht',
     'Zet het geopereerde been op een lage opstap en stap er gecontroleerd op, strek de heup volledig.',
     'Verhoog de hoogte van het opstapje zodra dit pijnvrij en gecontroleerd lukt.', 3, 10, 'Lichaamsgewicht', array['heup', 'kracht'])
    returning id into v_ex_a_stepup;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Balans op één been (heupcontrole)', 'stabiliteit',
     'Sta op het geopereerde been met lichte steun, bouw af naar zelfstandig balanceren.',
     'Verbetert de controle over heup en bekken bij dagelijkse activiteiten.', 3, 30, array['heup', 'stabiliteit'])
    returning id into v_ex_a_balans;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Gecontroleerde heupextensie met rotatiecontrole', 'stabiliteit',
     'Sta rechtop met steun en breng het geopereerde been gestrekt naar achteren, zonder daarbij de heup naar buiten te draaien.',
     'Bij de voorste benadering wordt niet het combineren van diepe flexie met binnenrotatie ontraden, maar juist het combineren van ver strekken met buitenwaartse rotatie. Deze oefening traint dit bewust en gecontroleerd.', 3, 10, 'Lichaamsgewicht', array['heup', 'stabiliteit'])
    returning id into v_ex_a_heupextensie_gecontroleerd;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen buiten opbouwend (voorste heupbenadering)', 'conditie',
     'Wandel buiten op vlak terrein in een rustig, gelijkmatig tempo.',
     'Bouw de afstand en duur elke week rustig op.', 900, array['heup', 'conditie'])
    returning id into v_ex_a_wandelen_buiten;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudskracht heup en been (voorste heupbenadering)', 'kracht',
     'Voer twee tot drie keer per week een kort krachtprogramma uit gericht op heup- en beenkracht.',
     'Doel is het opgebouwde niveau vasthouden op de lange termijn.', 3, 12, array['heup', 'kracht'])
    returning id into v_ex_a_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bird-dog (rompstabiliteit)', 'stabiliteit',
     'Kom op handen en knieën. Strek tegelijk een arm en het tegenovergestelde been, houd kort vast en keer gecontroleerd terug.',
     'Ondersteunt een stabiel bekken en een goede houding tijdens dagelijkse activiteiten.', 3, 10, array['heup', 'stabiliteit'])
    returning id into v_ex_a_birddog;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 3: Totale heupprothese — voorste (anterieure) benadering — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'total_hip_replacement', 'Totale heupprothese herstelprotocol, voorste (anterieure) benadering',
    'Herstelprotocol voor patiënten die een totale heupprothese hebben gekregen via de voorste (anterieure) chirurgische benadering. Deze spiersparende techniek kent wezenlijk andere voorzorgen dan de klassieke achterste benadering: de gebruikelijke heupvoorzorgen (niet kruisen, niet diep buigen, niet naar binnen draaien) gelden doorgaans niet, maar voorzichtigheid is geboden bij het combineren van heupstrekking met buitenwaartse rotatie. Mobilisatie start sneller. Doorlooptijd circa 8-10 weken tot volledige functionele zelfstandigheid, korter dan het standaardprotocol van 3-4 maanden.',
    false)
  returning id into v_protocol;

  -- Fase 1: Ziekenhuisfase en versnelde mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Ziekenhuisfase en versnelde mobilisatie',
    'Dankzij de spiersparende voorste benadering kan mobilisatie sneller starten dan bij de klassieke achterste toegang.',
    'Week 0-1',
    array['Heup gelijktijdig ver strekken én naar buiten draaien', 'Lang stilstaan zonder steun', 'Traplopen zonder toezicht in de eerste dagen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen met looprek of rollator binnen 24-48 uur', 0),
    (v_phase, 'Wond genezen zonder tekenen van infectie', 1),
    (v_phase, 'Zelfstandige transfer (bed, stoel) binnen 1-2 dagen', 2),
    (v_phase, 'Pijn onder controle met medicatie', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stappen op de dag van de operatie of dag 1', 0),
    (v_phase, 'Traplopen met leuning onder begeleiding', 1),
    (v_phase, 'Ontslag naar huis binnen 1-2 dagen', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Andere voorzorgen dan bij de klassieke benadering',
     'Bij de voorste benadering wordt, anders dan bij de klassieke achterste toegang, niet door de bilspieren gesneden. Hierdoor gelden de bekende heupvoorzorgen (niet kruisen, niet diep buigen, niet naar binnen draaien) meestal niet. Wel is voorzichtigheid geboden bij het combineren van heupstrekking met buitenwaartse draaiing. Bespreek de exacte adviezen voor jouw situatie altijd met je chirurg.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Directe mobilisatie: heupprothese voorste benadering') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_a_transfer, 0, 3, 8, null, 'Lichaamsgewicht, hulpmiddel toegestaan'),
    (v_schedule, v_ex_a_quad, 1, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_a_glute, 2, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_a_lopen_looprek, 3, null, null, 300, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Functioneel herstel en snelle opbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Functioneel herstel en snelle opbouw',
    'Zelfstandigheid in dagelijkse activiteiten uitbreiden en hulpmiddelen sneller afbouwen dan bij de klassieke achterste benadering gebruikelijk is.',
    'Week 1-4',
    array['Hardlopen', 'Springen', 'Heup gelijktijdig ver strekken én naar buiten draaien', 'Sporten met impact'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen binnenshuis zonder hulpmiddel binnen 2-3 weken', 0),
    (v_phase, 'Zelfstandig aan- en uitkleden', 1),
    (v_phase, 'Traplopen met leuning zonder pijn', 2),
    (v_phase, 'Heupflexie ruim voorbij 90° zonder pijn (geen flexiebeperking bij deze benadering)', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer', 0),
    (v_phase, 'Autorijden hervat (in overleg met chirurg)', 1),
    (v_phase, 'Eerste wandeling buitenshuis', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Meer vrijheid van bewegen, met behoud van aandacht',
     'Omdat er bij deze benadering geen algemene beperking geldt op diep buigen of naar binnen draaien, voelt dagelijks bewegen vaak sneller vertrouwd. Blijf wel alert op het gelijktijdig ver strekken en naar buiten draaien van de heup, en bouw de belasting geleidelijk op ondanks het snellere tempo.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functioneel herstel: heupprothese voorste benadering') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescription_note) values
    (v_schedule, v_ex_a_heupflexie, 0, 3, 12, null, null),
    (v_schedule, v_ex_a_hometrainer, 1, null, null, 600, null),
    (v_schedule, v_ex_a_traplopen, 2, 2, 10, null, 'Dagelijks oefenen, rustig tempo'),
    (v_schedule, v_ex_a_wandelen_buiten, 3, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht en volledige zelfstandigheid
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht en volledige zelfstandigheid',
    'Heupkracht en conditie verder opbouwen richting volledige zelfstandigheid, met een stabiel looppatroon zonder hulpmiddel.',
    'Week 4-8',
    array['Hardlopen', 'Springen', 'Heup gelijktijdig ver strekken én naar buiten draaien'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen zonder hulpmiddel, ook buitenshuis', 0),
    (v_phase, 'Traplopen zonder leuning', 1),
    (v_phase, 'Wandelen 30 minuten pijnvrij', 2),
    (v_phase, 'Balans stabiel op één been', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Heupkracht grotendeels hersteld', 0),
    (v_phase, 'Traplopen zonder leuning', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht blijft aandacht vragen, ook bij een snel traject',
     'Ook al voelt de heup door de spiersparende benadering al vroeg goed, symmetrische kracht opbouwen kost nog steeds enkele weken. Sla deze fase niet over, ook niet als lopen al soepel gaat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Kracht en zelfstandigheid: heupprothese voorste benadering') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_a_stepup, 0, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_a_balans, 1, 3, null, 30, null),
    (v_schedule, v_ex_a_heupextensie_gecontroleerd, 2, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_a_wandelen_buiten, 3, null, null, 900, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Onderhoud en terugkeer naar activiteiten
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Onderhoud en terugkeer naar activiteiten',
    'Terugkeer naar gewenste hobby''s en activiteiten, met een onderhoudsprogramma om het bereikte niveau vast te houden.',
    'Week 8+',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wandelen langer dan 30 minuten pijnvrij zonder hulpmiddel', 0),
    (v_phase, 'Geen zwelling na belasting', 1),
    (v_phase, 'Deelname aan gewenste dagelijkse en recreatieve activiteiten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen buitenshuis hervat', 0),
    (v_phase, 'Zwemmen hervat', 1),
    (v_phase, 'Terug op het gewenste activiteitenniveau', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf actief, ook na deze fase',
     'Regelmatige, lichte lichaamsbeweging blijft belangrijk voor de levensduur van de prothese en je algehele conditie. Kies activiteiten met een lage impact, zoals fietsen, zwemmen of wandelen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: heupprothese voorste benadering') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_a_onderhoud, 0, 3, 12, null),
    (v_schedule, v_ex_a_birddog, 1, 3, 10, null),
    (v_schedule, v_ex_a_wandelen_buiten, 2, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
