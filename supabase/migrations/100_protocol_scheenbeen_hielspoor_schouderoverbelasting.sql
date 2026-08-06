-- 100_protocol_scheenbeen_hielspoor_schouderoverbelasting.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Eerste herstelplannen voor twee nieuwe overbelasting-categorieën (zie
-- migratie 097 voor de uitgebreide injury_category-lijst), plus een derde,
-- puur conservatief herstelplan voor de bestaande categorie rotator_cuff.
-- Zelfde format als de bestaande REVA-herstelplannen (migraties 055/078/094):
-- fases met een weekindicatie, criteria/mijlpalen/educatie per fase,
-- trainingsschema's gekoppeld aan nieuwe, protocolspecifieke oefeningen. NIET
-- geverifieerd door een bevoegd fysiotherapeut — clinically_reviewed blijft
-- false, mag niet aan echte patiënten worden toegewezen totdat een
-- fysiotherapeut de inhoud heeft gecontroleerd.
-- ============================================================================
--
-- Scheenbeenvliesklachten (shin_splints): overbelastingsklachten, veelal bij
-- hardlopers na een plotselinge toename in volume, intensiteit of een
-- verandering van ondergrond. Nadruk op relatieve rust (niet volledige
-- immobilisatie), kuitkracht en het aanpakken van bijdragende factoren
-- (schoeisel, ondergrond, cadans), gevolgd door een gestructureerde,
-- pijngestuurde opbouw van hardloopvolume.
--
-- Hielspoor / fasciitis plantaris (plantar_fasciitis): klassieke
-- overbelastingsklacht met de typerende ochtendpijn bij de eerste stappen.
-- Staat bekend als een hardnekkige, langzaam herstellende klacht, dat wordt
-- expliciet benoemd in de educatie. Nadruk op excentrische kuit- en
-- voetspiertraining naast rek- en belastingadvies.
--
-- Schouderoverbelasting (rotator_cuff, derde protocol): dit is een puur
-- conservatief traject voor overbelastingsgerelateerde subacromiale klachten
-- (impingement), volledig zonder operatie, in tegenstelling tot de twee
-- bestaande rotator_cuff-protocollen (de sling-fase peesreconstructie uit
-- migratie 078 en de subacromiale decompressie-operatie uit migratie 094).
-- Deze route wordt in de intake-wizard bewust onder dezelfde categorie
-- ondergebracht omdat het dezelfde anatomische structuur betreft.
--
-- Alle oefeningen in deze drie protocollen zijn nieuw en protocolspecifiek
-- toegevoegd aan de oefeningenbibliotheek (geen hergebruik van bestaande
-- oefeningen uit eerdere migraties).

do $$
declare
  -- ── Scheenbeenvliesklachten: nieuwe oefeningen ──────────────────────────
  v_ex_ss_hometrainer uuid;
  v_ex_ss_kuitrek_recht uuid;
  v_ex_ss_kuitrek_gebogen uuid;
  v_ex_ss_zelfmassage uuid;
  v_ex_ss_enkelmobiliteit uuid;
  v_ex_ss_kuitheffen_2been uuid;
  v_ex_ss_kuitheffen_1been uuid;
  v_ex_ss_tibialis uuid;
  v_ex_ss_excentrisch_kuit uuid;
  v_ex_ss_wandelen_opbouw uuid;
  v_ex_ss_hardlopen_opbouw uuid;
  v_ex_ss_kuitheffen_belast uuid;
  v_ex_ss_balans_onstabiel uuid;
  v_ex_ss_pogo_hops uuid;
  v_ex_ss_duurloop_ondergrond uuid;
  v_ex_ss_hoptest uuid;

  -- ── Hielspoor: nieuwe oefeningen ────────────────────────────────────────
  v_ex_pf_voetzoolrek uuid;
  v_ex_pf_kuitrek_recht uuid;
  v_ex_pf_bal_rollen uuid;
  v_ex_pf_wandelen_zolen uuid;
  v_ex_pf_hielheffen_excentrisch uuid;
  v_ex_pf_teenkrommen uuid;
  v_ex_pf_marmer_oprapen uuid;
  v_ex_pf_kuitheffen_2been uuid;
  v_ex_pf_hardlopen_opbouw uuid;
  v_ex_pf_voetzoolrek_onderhoud uuid;
  v_ex_pf_hielheffen_onderhoud uuid;
  v_ex_pf_balans_1been uuid;
  v_ex_pf_pogo_hops uuid;
  v_ex_pf_kuitheffen_belast uuid;

  -- ── Schouderoverbelasting (conservatief): nieuwe oefeningen ─────────────
  v_ex_ro_pendulum uuid;
  v_ex_ro_houding_scapula uuid;
  v_ex_ro_nekrek uuid;
  v_ex_ro_borststretch uuid;
  v_ex_ro_buitenrotatie uuid;
  v_ex_ro_binnenrotatie uuid;
  v_ex_ro_scapula_rij uuid;
  v_ex_ro_wallslides uuid;
  v_ex_ro_shoulderpress_licht uuid;
  v_ex_ro_pushup_plus uuid;
  v_ex_ro_cablerow uuid;
  v_ex_ro_schouderrollen uuid;
  v_ex_ro_latpulldown uuid;
  v_ex_ro_bovenhoofds_sportspecifiek uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Scheenbeenvliesklachten (mediaal tibiaal stresssyndroom)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Rustig fietsen op hometrainer', 'conditie',
     'Fiets op een hometrainer met lage weerstand in een rustig, gelijkmatig tempo. Belast het scheenbeen veel minder dan lopen of hardlopen.',
     'Goede manier om conditie te onderhouden zonder de scheenbeenvliezen extra te belasten. Bouw duur rustig op.', 600, array['scheenbeen', 'conditie'])
    returning id into v_ex_ss_hometrainer;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Kuitspier stretch (rechte knie)', 'rekken',
     'Sta met één been gestrekt naar achteren, hiel op de grond, en leun naar voren tegen een muur totdat je een rek voelt in de bovenste kuitspier.',
     'Houd de rek vast zonder te wippen. Voer dagelijks uit, ook op dagen zonder training.', 3, 30, array['scheenbeen', 'kuit', 'rekken'])
    returning id into v_ex_ss_kuitrek_recht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Kuitspier stretch (gebogen knie)', 'rekken',
     'Zelfde uitgangshouding als de kuitrek met rechte knie, maar nu met de achterste knie licht gebogen om de diepere kuitspier (soleus) te rekken.',
     'Houd de rek vast zonder te wippen. Voer dagelijks uit, ook op dagen zonder training.', 3, 30, array['scheenbeen', 'kuit', 'rekken'])
    returning id into v_ex_ss_kuitrek_gebogen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Zelfmassage scheenbeen met foamroller', 'mobiliteit',
     'Rol met een foamroller of massagebal rustig over de kuitspier en de zijkant van het onderbeen, op zoek naar gevoelige plekken.',
     'Rol rustig en gecontroleerd, niet direct over het scheenbeen zelf. Stop bij scherpe pijn.', 120, array['scheenbeen', 'mobiliteit'])
    returning id into v_ex_ss_zelfmassage;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkel mobiliteit in alle richtingen', 'mobiliteit',
     'Beweeg de voet actief op en neer, naar binnen en naar buiten, en maak rustige cirkels met de enkel.',
     'Beweeg binnen een pijnvrije uitslag, zonder te forceren.', 2, 10, array['scheenbeen', 'enkel', 'mobiliteit'])
    returning id into v_ex_ss_enkelmobiliteit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Kuitheffen (calf raise) tweebenig', 'kracht',
     'Sta rechtop en kom langzaam op de tenen omhoog op beide benen tegelijk, houd even vast en zak gecontroleerd terug.',
     'Voer rustig en gecontroleerd uit, geen snelle of verende beweging.', 3, 15, 'Lichaamsgewicht', array['scheenbeen', 'kuit', 'kracht'])
    returning id into v_ex_ss_kuitheffen_2been;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Kuitheffen (calf raise) eenbenig', 'kracht',
     'Sta op één been en kom langzaam op de tenen omhoog, houd even vast en zak gecontroleerd terug.',
     'Gebruik indien nodig lichte steun aan een muur voor balans. Bouw pas op naar eenbenig zodra tweebenig pijnvrij lukt.', 3, 10, 'Lichaamsgewicht', array['scheenbeen', 'kuit', 'kracht'])
    returning id into v_ex_ss_kuitheffen_1been;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Tibialis anterior versterking (tenenheffen)', 'kracht',
     'Zit of sta en til de voorvoet en tenen op terwijl de hiel op de grond blijft, om de spier aan de voorkant van het scheenbeen te versterken.',
     'Deze spier draagt mee in de dempende functie bij het lopen en is vaak onderontwikkeld bij scheenbeenvliesklachten.', 3, 15, array['scheenbeen', 'tibialis', 'kracht'])
    returning id into v_ex_ss_tibialis;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische kuitheffen op traprand', 'kracht',
     'Kom op beide benen omhoog op de tenen op een traprand, til één voet op en zak vervolgens langzaam op één been terug tot onder het treeniveau.',
     'De nadruk ligt op het langzaam zakken (excentrische fase). Bouw pas op naar deze variant als tweebenige kuitheffen pijnvrij lukt.', 3, 12, 'Lichaamsgewicht', array['scheenbeen', 'kuit', 'kracht'])
    returning id into v_ex_ss_excentrisch_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen met opbouw in duur', 'conditie',
     'Wandel in een rustig tempo, bij voorkeur op een zachte ondergrond, en bouw de duur geleidelijk op zolang dit pijnvrij blijft.',
     'Stop of bouw af zodra er pijn ontstaat tijdens het wandelen. Duur en tempo mogen alleen omhoog als de vorige belasting geen klachten gaf.', 900, array['scheenbeen', 'conditie', 'lopen'])
    returning id into v_ex_ss_wandelen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Hardlopen opbouwschema (loop-wandel intervallen)', 'conditie',
     'Wissel korte periodes rustig hardlopen af met wandelpauzes, op een zachte ondergrond zoals gras of een bospad indien mogelijk.',
     'Bouw alleen op naar meer hardloopminuten of minder wandelpauzes als de vorige sessie en de dag erna geen scheenbeenpijn gaf. Volg het advies van je fysiotherapeut voor het exacte opbouwtempo.', 1200, array['scheenbeen', 'conditie', 'hardlopen'])
    returning id into v_ex_ss_hardlopen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Kuitheffen met extra weerstand', 'kracht',
     'Voer de kuitheffen uit met extra gewicht, bijvoorbeeld een halterschijf vastgehouden tegen de borst of een gewichtsvest.',
     'Alleen toevoegen zodra kuitheffen zonder extra gewicht volledig pijnvrij en met goede controle lukt.', 3, 12, 'Halterschijf of gewichtsvest', array['scheenbeen', 'kuit', 'kracht'])
    returning id into v_ex_ss_kuitheffen_belast;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Eenbenige balans op onstabiele ondergrond', 'stabiliteit',
     'Sta op één been op een balanskussen of opgerolde handdoek en houd de positie zo stabiel mogelijk vast.',
     'Bouw de duur en instabiliteit van de ondergrond geleidelijk op naarmate de balans verbetert.', 3, 30, array['scheenbeen', 'stabiliteit', 'balans'])
    returning id into v_ex_ss_balans_onstabiel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Sprongoefeningen laag impact (pogo hops)', 'kracht',
     'Maak kleine, snelle sprongetjes met minimale kniebuiging, vooral vanuit de enkels, op een zachte ondergrond.',
     'Begin met een klein aantal herhalingen en bouw pas op als er geen nagevoelige pijn ontstaat na afloop.', 3, 15, array['scheenbeen', 'kracht', 'plyometrie'])
    returning id into v_ex_ss_pogo_hops;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Duurloop op wisselende ondergrond', 'conditie',
     'Loop een aaneengesloten duurloop, afgewisseld tussen verschillende, overwegend zachte ondergronden zoals gras, bospad of tartanbaan.',
     'Bouw de duur rustig verder op zolang er geen toename van scheenbeenklachten optreedt.', 1500, array['scheenbeen', 'conditie', 'hardlopen'])
    returning id into v_ex_ss_duurloop_ondergrond;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Sprong-voor-afstand test (functionele symmetrie)', 'stabiliteit',
     'Spring op één been zo ver mogelijk naar voren en land gecontroleerd op hetzelfde been.',
     'Vergelijk de afgelegde afstand met het andere been als maat voor functionele symmetrie en belastbaarheid.', 2, 3, array['scheenbeen', 'stabiliteit', 'test'])
    returning id into v_ex_ss_hoptest;

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'shin_splints', 'Herstelplan scheenbeenvliesklachten (mediaal tibiaal stresssyndroom)',
    'Herstelplan voor scheenbeenvliesklachten (mediaal tibiaal stresssyndroom), een overbelastingsklacht die vaak ontstaat door een plotselinge toename in hardloopvolume, intensiteit of een verandering van ondergrond of schoeisel. Opgebouwd in drie fases van relatieve rust en pijnreductie tot een gestructureerde, pijngestuurde terugkeer naar hardlopen (ca. 6 tot 10 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Belastingvermindering en pijnreductie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Belastingvermindering en pijnreductie',
    'De belasting op het scheenbeenvlies verminderen zodat de irritatie tot rust komt. Dit betekent relatieve rust, niet volledige immobilisatie: rustig bewegen op lage-impactvormen blijft toegestaan.',
    'Week 0-2',
    array['Hardlopen', 'Springen', 'Hoogintensieve balsporten', 'Trainen op hard oppervlak'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij wandelen duidelijk afgenomen', 0),
    (v_phase, 'Geen drukpijn meer bij lichte aanraking van het scheenbeen', 1),
    (v_phase, 'Fietsen op hometrainer pijnvrij mogelijk', 2),
    (v_phase, 'Geen nachtelijke of rustpijn meer', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije wandeling', 0),
    (v_phase, 'Zwelling en drukpijn afgenomen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Relatieve rust, geen volledige stilstand',
     'Scheenbeenvliesklachten ontstaan meestal doordat de belasting te snel is opgebouwd. Volledig stoppen met bewegen is niet nodig en vaak niet nuttig: fietsen en wandelen op een rustig tempo blijven meestal mogelijk. Vermijd wel hardlopen, springen en harde ondergronden totdat de pijn duidelijk is afgenomen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Belastingvermindering en pijnreductie, scheenbeenvliesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ss_hometrainer, 0, null, null, 600, null),
    (v_schedule, v_ex_ss_kuitrek_recht, 1, 3, null, 30, null),
    (v_schedule, v_ex_ss_kuitrek_gebogen, 2, 3, null, 30, null),
    (v_schedule, v_ex_ss_zelfmassage, 3, null, null, 120, null),
    (v_schedule, v_ex_ss_enkelmobiliteit, 4, 2, 10, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Kuitkracht opbouwen en bijdragende factoren aanpakken
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Kuitkracht opbouwen en bijdragende factoren aanpakken',
    'Kuitkracht en de kracht aan de voorkant van het scheenbeen opbouwen, en bijdragende factoren zoals schoeisel, ondergrond en looppatroon (cadans) bespreken en waar nodig aanpassen.',
    'Week 2-6',
    array['Hardlopen op hard oppervlak', 'Springen', 'Plotselinge volumesprongen in wandelen of fietsen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledig pijnvrij wandelen, ook langere afstanden', 0),
    (v_phase, 'Kuitheffen tweebenig pijnvrij, minimaal 3 sets van 15', 1),
    (v_phase, 'Schoeisel en trainingsondergrond besproken en indien nodig aangepast', 2),
    (v_phase, 'Geen drukpijn meer op het scheenbeen', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije sessie kuitheffen', 0),
    (v_phase, 'Looppatroon of cadans besproken met fysiotherapeut', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Schoeisel, ondergrond en cadans spelen een rol',
     'Naast kracht spelen ook praktische factoren mee bij het ontstaan van scheenbeenvliesklachten: verouderd of ongeschikt schoeisel, veel hardlopen op hard asfalt, en een lage pasfrequentie (cadans) die de schokbelasting per stap vergroot. Bespreek deze factoren met je fysiotherapeut, zodat de opbouw naar hardlopen in fase 3 op een steviger fundament start.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Kuitkracht en bijdragende factoren, scheenbeenvliesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ss_kuitheffen_2been, 0, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ss_kuitheffen_1been, 1, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ss_tibialis, 2, 3, 15, null, null),
    (v_schedule, v_ex_ss_excentrisch_kuit, 3, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ss_wandelen_opbouw, 4, null, null, 900, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Gestructureerde terugkeer naar hardlopen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Gestructureerde terugkeer naar hardlopen',
    'Stapsgewijs en pijngestuurd hardloopvolume opbouwen, met blijvende aandacht voor kuitkracht en een zachte ondergrond waar mogelijk.',
    'Week 6-10',
    array['Plotselinge volumesprongen', 'Hardlopen bij aanhoudende pijn tijdens het lopen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '20 minuten aaneengesloten hardlopen pijnvrij mogelijk', 0),
    (v_phase, 'Geen pijn de dag na een hardloopsessie', 1),
    (v_phase, 'Kuitkracht symmetrisch aan de andere zijde', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije hardloopsessie van 20 minuten', 0),
    (v_phase, 'Terug op het oude trainingsvolume', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bouw hardloopvolume rustig en stapsgewijs op',
     'Verhoog het wekelijkse hardloopvolume niet met meer dan ongeveer 10 procent per week, en verhoog nooit tegelijk volume, intensiteit en ondergrond. Gebruik pijn als stoplicht: lichte, snel verdwijnende spanning mag, aanhoudende of toenemende pijn tijdens of na het lopen betekent een stap terug in de opbouw.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar hardlopen, scheenbeenvliesklachten') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ss_hardlopen_opbouw, 0, null, null, 1200, null),
    (v_schedule, v_ex_ss_kuitheffen_belast, 1, 3, 12, null, 'Halterschijf of gewichtsvest'),
    (v_schedule, v_ex_ss_balans_onstabiel, 2, 3, null, 30, null),
    (v_schedule, v_ex_ss_pogo_hops, 3, 3, 15, null, null),
    (v_schedule, v_ex_ss_duurloop_ondergrond, 4, null, null, 1500, null),
    (v_schedule, v_ex_ss_hoptest, 5, 2, 3, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Hielspoor (fasciitis plantaris)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Voetzoolrek met handdoek', 'rekken',
     'Zit met het been gestrekt, sla een handdoek om de bal van de voet en trek de tenen rustig naar je toe totdat je een rek voelt onder de voetzool en in de kuit.',
     'Houd de rek vast zonder te wippen. Voer dagelijks uit, bij voorkeur ook direct na het opstaan.', 3, 30, array['hiel', 'voetzool', 'rekken'])
    returning id into v_ex_pf_voetzoolrek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Kuitspier stretch (rechte knie)', 'rekken',
     'Sta met één been gestrekt naar achteren, hiel op de grond, en leun naar voren tegen een muur totdat je een rek voelt in de bovenste kuitspier.',
     'Een strakke kuitspier verhoogt vaak de spanning op de voetzoolfascie. Houd de rek vast zonder te wippen.', 3, 30, array['hiel', 'kuit', 'rekken'])
    returning id into v_ex_pf_kuitrek_recht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Voetzool rollen over bal (myofasciale mobilisatie)', 'mobiliteit',
     'Rol met de blote voet rustig over een tennisbal of massagebal, van de hiel tot aan de bal van de voet.',
     'Rol met matige druk, niet direct op de meest pijnlijke plek. Kan ook met een gekoelde fles voor extra pijnverlichting.', 120, array['hiel', 'voetzool', 'mobiliteit'])
    returning id into v_ex_pf_bal_rollen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen met steunzolen, korte afstanden', 'conditie',
     'Wandel korte afstanden in goed passend schoeisel, eventueel met steunzolen of hielkussentjes, op een vlakke ondergrond.',
     'Vermijd blootsvoets lopen op harde ondergrond en langdurig staan zonder pauze in deze fase.', 600, array['hiel', 'conditie', 'lopen'])
    returning id into v_ex_pf_wandelen_zolen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Hielheffen op traprand (excentrisch)', 'kracht',
     'Kom op beide benen omhoog op de tenen op een traprand en zak vervolgens langzaam en gecontroleerd terug tot onder het treeniveau.',
     'De nadruk ligt op het langzaam zakken. Deze excentrische belasting is een kernonderdeel van herstel bij fasciitis plantaris.', 3, 15, 'Lichaamsgewicht, langzaam zakken', array['hiel', 'kuit', 'kracht'])
    returning id into v_ex_pf_hielheffen_excentrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Teenkrommen met handdoek (intrinsieke voetspieren)', 'kracht',
     'Zit met de voet op een handdoek op een gladde vloer en krom de tenen om de handdoek naar je toe te trekken.',
     'Versterkt de kleine voetspieren die de voetboog en de voetzoolfascie ondersteunen.', 3, 10, array['hiel', 'voetzool', 'kracht'])
    returning id into v_ex_pf_teenkrommen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Marmer oprapen met tenen', 'kracht',
     'Raap kleine voorwerpjes zoals marmers of knikkers met de tenen op en verplaats ze naar een bakje.',
     'Een laagdrempelige oefening voor de kleine voetspieren, goed te combineren met teenkrommen.', 2, 15, array['hiel', 'voetzool', 'kracht'])
    returning id into v_ex_pf_marmer_oprapen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Kuitheffen (calf raise) tweebenig', 'kracht',
     'Sta rechtop en kom langzaam op de tenen omhoog op beide benen tegelijk, houd even vast en zak gecontroleerd terug.',
     'Voer rustig en gecontroleerd uit, geen snelle of verende beweging.', 3, 15, 'Lichaamsgewicht', array['hiel', 'kuit', 'kracht'])
    returning id into v_ex_pf_kuitheffen_2been;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Hardlopen opbouwschema (rustige progressie)', 'conditie',
     'Bouw hardlopen rustig op met korte, lage-impactsessies, bij voorkeur op een zachte ondergrond.',
     'Start pas met hardlopen als wandelen, staan en de dagelijkse activiteiten volledig pijnvrij zijn.', 1200, array['hiel', 'conditie', 'hardlopen'])
    returning id into v_ex_pf_hardlopen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Voetzoolrek met handdoek (onderhoud)', 'rekken',
     'Zelfde uitvoering als de voetzoolrek in de eerdere fases, nu als vast onderdeel van een onderhoudsroutine.',
     'Blijf deze rek dagelijks doen, ook als de klachten volledig zijn verdwenen, om terugval te voorkomen.', 2, 30, array['hiel', 'voetzool', 'rekken'])
    returning id into v_ex_pf_voetzoolrek_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Hielheffen op traprand (onderhoud)', 'kracht',
     'Zelfde uitvoering als de excentrische hielheffen in fase 2, nu in lagere frequentie als onderhoudsoefening.',
     'Blijf dit twee keer per week doen om de opgebouwde kracht en belastbaarheid vast te houden.', 3, 15, 'Lichaamsgewicht', array['hiel', 'kuit', 'kracht'])
    returning id into v_ex_pf_hielheffen_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Balansoefening op één been', 'stabiliteit',
     'Sta op één been en houd de positie zo stabiel mogelijk vast, eventueel met de ogen dicht voor extra uitdaging.',
     'Draagt bij aan een stabiele voetboog en een goede voetplaatsing tijdens het lopen.', 3, 30, array['hiel', 'stabiliteit', 'balans'])
    returning id into v_ex_pf_balans_1been;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Sprongoefeningen laag impact (pogo hops)', 'kracht',
     'Maak kleine, snelle sprongetjes met minimale kniebuiging, vooral vanuit de enkels, op een zachte ondergrond.',
     'Begin met een klein aantal herhalingen en bouw pas op als er geen nagevoelige pijn ontstaat na afloop.', 3, 15, array['hiel', 'kracht', 'plyometrie'])
    returning id into v_ex_pf_pogo_hops;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Hielheffen met extra belasting', 'kracht',
     'Voer de hielheffen op een traprand uit met extra gewicht, bijvoorbeeld een halterschijf vastgehouden tegen de borst of een gewichtsvest.',
     'Alleen toevoegen zodra hielheffen zonder extra gewicht volledig pijnvrij en met goede controle lukt.', 3, 12, 'Halterschijf of gewichtsvest', array['hiel', 'kuit', 'kracht'])
    returning id into v_ex_pf_kuitheffen_belast;

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'plantar_fasciitis', 'Herstelplan hielspoor (fasciitis plantaris)',
    'Herstelplan voor hielspoor (fasciitis plantaris), een overbelastingsklacht van de voetzoolfascie met de typerende pijn bij de eerste stappen na het opstaan. Dit is een hardnekkige klacht die vaak langzaam herstelt. Opgebouwd in drie fases van pijnmanagement tot progressieve krachtopbouw en terugkeer naar volledige activiteit, met een blijvende onderhoudsroutine (ca. 8 tot 12 weken, soms langer).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnmanagement en belastingaanpassing
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnmanagement en belastingaanpassing',
    'De belasting op de voetzoolfascie verminderen en de acute pijn verminderen, onder andere via schoeisel- en steunzooladvies en rek- en mobiliteitsoefeningen.',
    'Week 0-3',
    array['Blootsvoets lopen op harde ondergrond', 'Hardlopen', 'Langdurig staan zonder pauze'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Ochtendpijn bij de eerste stappen duidelijk afgenomen', 0),
    (v_phase, 'Passend schoeisel of steunzolen besproken', 1),
    (v_phase, 'Kortere wandelingen mogelijk zonder toenemende pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste minder pijnlijke ochtend', 0),
    (v_phase, 'Schoeisel en steunzolen aangepast', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'De klassieke ochtendpijn en wat die betekent',
     'De typerende pijn bij de eerste stappen na het opstaan of na een periode van rust komt doordat de voetzoolfascie in rust verkort en bij belasting weer plots wordt opgerekt. Dit is een normaal kenmerk van fasciitis plantaris en geen teken dat er iets ernstig mis is. Rustig oplopen op de eerste stappen en consequent rekken helpen de klacht te verminderen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijnmanagement en belastingaanpassing, hielspoor') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_pf_voetzoolrek, 0, 3, null, 30, null),
    (v_schedule, v_ex_pf_kuitrek_recht, 1, 3, null, 30, null),
    (v_schedule, v_ex_pf_bal_rollen, 2, null, null, 120, null),
    (v_schedule, v_ex_pf_wandelen_zolen, 3, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Progressieve krachtopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Progressieve krachtopbouw',
    'Gericht kracht opbouwen in de kuit en de kleine voetspieren, met de nadruk op excentrische belasting van de kuit, een kernonderdeel van herstel bij fasciitis plantaris.',
    'Week 3-8',
    array['Hardlopen op hard oppervlak', 'Langdurig blootsvoets lopen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Excentrische hielheffen pijnvrij mogelijk, minimaal 3 sets van 15', 0),
    (v_phase, 'Langer staan of lopen mogelijk zonder toenemende pijn', 1),
    (v_phase, 'Ochtendpijn grotendeels of volledig verdwenen', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije set excentrische hielheffen', 0),
    (v_phase, 'Eerste volledige werkdag zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Excentrische belasting is de kern van dit herstel',
     'Onderzoek en de klinische praktijk laten zien dat langzaam, gecontroleerd zakken op de tenen (excentrische kuitbelasting) een van de meest effectieve oefeningen is bij fasciitis plantaris. Blijf hier consequent mee doorgaan, ook als de vooruitgang langzaam gaat: deze klacht herstelt doorgaans geleidelijk over meerdere maanden.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Progressieve krachtopbouw, hielspoor') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_pf_hielheffen_excentrisch, 0, 3, 15, null, 'Lichaamsgewicht, langzaam zakken'),
    (v_schedule, v_ex_pf_teenkrommen, 1, 3, 10, null, null),
    (v_schedule, v_ex_pf_marmer_oprapen, 2, 2, 15, null, null),
    (v_schedule, v_ex_pf_kuitheffen_2been, 3, 3, 15, null, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Terugkeer naar volledige activiteit en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar volledige activiteit en onderhoud',
    'Geleidelijk terugkeren naar volledige dagelijkse activiteit en eventueel hardlopen, met een blijvende onderhoudsroutine om terugval te voorkomen.',
    'Week 8-12',
    array['Plotselinge terugkeer naar hardlopen zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledig pijnvrij door de dag heen, inclusief lang staan', 0),
    (v_phase, 'Hardlopen of sportspecifieke belasting pijnvrij opgebouwd', 1),
    (v_phase, 'Onderhoudsroutine van rekken en kracht vastgesteld', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije hardloopsessie', 0),
    (v_phase, 'Terug op het oude activiteitenniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Herstel kan maanden duren, blijf onderhouden',
     'Fasciitis plantaris staat bekend als een klacht die soms weken, maar bij een deel van de mensen ook meerdere maanden nodig heeft om volledig te verdwijnen. Ook na herstel blijft de voetzoolfascie gevoelig voor hernieuwde overbelasting. Blijf daarom de rek- en krachtoefeningen als vaste routine aanhouden, ook zonder klachten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar activiteit en onderhoud, hielspoor') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_pf_hardlopen_opbouw, 0, null, null, 1200, null),
    (v_schedule, v_ex_pf_voetzoolrek_onderhoud, 1, 2, null, 30, null),
    (v_schedule, v_ex_pf_hielheffen_onderhoud, 2, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_pf_balans_1been, 3, 3, null, 30, null),
    (v_schedule, v_ex_pf_pogo_hops, 4, 3, 15, null, null),
    (v_schedule, v_ex_pf_kuitheffen_belast, 5, 3, 12, null, 'Halterschijf of gewichtsvest');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 3: Schouderoverbelasting (impingement, conservatief, rotator_cuff)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Pendulum-oefening (ontspannen slingeren)', 'mobiliteit',
     'Leun met een hand op steun voorover, laat de arm ontspannen naar beneden hangen en maak kleine, rustige slingerbewegingen vanuit de romp.',
     'De arm blijft volledig ontspannen, de beweging komt vanuit het lichaam, niet vanuit de schouderspieren.', 3, 60, array['schouder', 'mobiliteit'])
    returning id into v_ex_ro_pendulum;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Houding- en scapula-bewustwording oefening', 'stabiliteit',
     'Ga rechtop zitten of staan, trek de schouderbladen licht naar achteren en beneden, en houd deze houding enkele seconden vast.',
     'Herhaal dit meerdere keren per dag, ook los van de trainingsmomenten, om een betere schouderhouding aan te leren.', 3, 10, array['schouder', 'houding', 'stabiliteit'])
    returning id into v_ex_ro_houding_scapula;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Nekrek zijwaarts', 'rekken',
     'Kantel het hoofd rustig naar één zijde totdat een lichte rek in de nek en bovenste schouder voelbaar is.',
     'Voer rustig en zonder trekken uit, aan beide zijden.', 2, 20, array['schouder', 'nek', 'rekken'])
    returning id into v_ex_ro_nekrek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Borstspier stretch in deuropening', 'rekken',
     'Plaats de onderarm tegen een deurpost op schouderhoogte en draai het lichaam voorzichtig weg van de deur totdat een rek voelbaar is over de voorzijde van de schouder en borst.',
     'Een verkorte borstspier draagt vaak bij aan een naar voren hangende schouderhouding en kan impingementklachten verergeren.', 3, 30, array['schouder', 'borst', 'rekken'])
    returning id into v_ex_ro_borststretch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Schouder buitenrotatie met band', 'kracht',
     'Houd de elleboog tegen het lichaam in een hoek van 90 graden en draai de onderarm met een weerstandsband naar buiten.',
     'Houd de elleboog vast tegen het lichaam gedurende de hele beweging voor een gecontroleerde uitvoering.', 3, 12, 'Lichte weerstandsband', array['schouder', 'kracht'])
    returning id into v_ex_ro_buitenrotatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Schouder binnenrotatie met band', 'kracht',
     'Houd de elleboog tegen het lichaam in een hoek van 90 graden en draai de onderarm met een weerstandsband naar binnen.',
     'Houd de elleboog vast tegen het lichaam gedurende de hele beweging voor een gecontroleerde uitvoering.', 3, 12, 'Lichte weerstandsband', array['schouder', 'kracht'])
    returning id into v_ex_ro_binnenrotatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Scapula retractie (rij-beweging)', 'kracht',
     'Trek met een weerstandsband beide ellebogen naar achteren, alsof je roeit, en knijp de schouderbladen naar elkaar toe.',
     'Focus op het samentrekken van de schouderbladen, niet alleen op het buigen van de ellebogen.', 3, 12, 'Lichte weerstandsband', array['schouder', 'scapula', 'kracht'])
    returning id into v_ex_ro_scapula_rij;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Wall slides', 'mobiliteit',
     'Sta met de rug tegen de muur, armen tegen de muur in een lage W-positie, en schuif de armen omhoog en omlaag terwijl ze contact houden met de muur.',
     'Houd de onderrug licht tegen de muur en beweeg alleen zo ver als dit lukt zonder de romp te compenseren.', 3, 10, array['schouder', 'mobiliteit', 'scapula'])
    returning id into v_ex_ro_wallslides;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Shoulder press (licht, gecontroleerd)', 'kracht',
     'Druk met lichte gewichten of een lichte weerstandsband de armen gecontroleerd omhoog boven het hoofd en weer terug.',
     'Start met licht gewicht en volledige controle. Verhoog de belasting pas als dit volledig pijnvrij lukt.', 3, 10, 'Licht', array['schouder', 'kracht'])
    returning id into v_ex_ro_shoulderpress_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Push-up plus (scapulaire controle)', 'kracht',
     'Voer een push-up uit en duw aan het einde van de beweging de schouderbladen extra iets verder van elkaar af (de "plus").',
     'Kan op de knieën worden uitgevoerd indien een volledige push-up nog te zwaar is.', 3, 10, 'Lichaamsgewicht, op knieën indien nodig', array['schouder', 'scapula', 'kracht'])
    returning id into v_ex_ro_pushup_plus;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Cabel row (roeien aan kabel)', 'kracht',
     'Trek met een kabel of weerstandsband beide handen naar het lichaam toe in een roeibeweging, met de ellebogen dicht langs het lichaam.',
     'Houd de romp stabiel en trek de schouderbladen actief naar achteren tijdens de beweging.', 3, 12, 'Licht tot matig', array['schouder', 'rug', 'kracht'])
    returning id into v_ex_ro_cablerow;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Schouderrollen (onderhoud)', 'mobiliteit',
     'Maak rustige, ruime cirkels met de schouders, zowel naar voren als naar achteren.',
     'Een laagdrempelige onderhoudsoefening om de schouders soepel te houden, geschikt als dagelijkse gewoonte.', 2, 10, array['schouder', 'mobiliteit', 'onderhoud'])
    returning id into v_ex_ro_schouderrollen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Lat pulldown (licht tot matig)', 'kracht',
     'Trek met een kabel of weerstandsband een stang van boven het hoofd naar beneden richting de borst, met gecontroleerde schouderbladbeweging.',
     'Houd de romp stabiel en vermijd het gebruiken van zwaai om het gewicht omlaag te trekken.', 3, 12, 'Licht tot matig', array['schouder', 'kracht'])
    returning id into v_ex_ro_latpulldown;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Bovenhoofdse werp- of reikbeweging (sportspecifiek)', 'conditie',
     'Oefen een sport- of werkspecifieke bovenhoofdse beweging (bijvoorbeeld gooien, smashen of iets op een hoge plank zetten) op een rustig, gecontroleerd tempo.',
     'Bouw intensiteit en herhaling geleidelijk op, alleen zonder klachten tijdens of na afloop.', 900, array['schouder', 'sportspecifiek', 'bovenhoofds'])
    returning id into v_ex_ro_bovenhoofds_sportspecifiek;

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'rotator_cuff', 'Herstelplan schouderoverbelasting (impingement, conservatief)',
    'Herstelplan voor overbelastingsgerelateerde subacromiale schouderklachten (impingement), volledig conservatief en zonder operatie. Dit protocol verschilt daarmee wezenlijk van de twee andere rotator cuff-herstelplannen: het kent geen sling-fase zoals het protocol na een peesreconstructie, en geen postoperatieve fase zoals het protocol na een subacromiale decompressie. De klachten ontstaan door overbelasting, vaak in combinatie met een minder gunstige schouderhouding, en worden hier volledig via fysiotherapie behandeld. Opgebouwd in drie fases van pijn- en belastingmanagement tot volledige, begeleide terugkeer naar bovenhoofdse activiteit (ca. 8 tot 10 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijn- en belastingmanagement
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijn- en belastingmanagement',
    'De belasting op de irriteerbare schouderstructuren verminderen, bewustwording opbouwen van houding en scapulapositie, en pijn tot rust laten komen.',
    'Week 0-3',
    array['Bovenhoofds tillen', 'Langdurig werken met de arm boven schouderhoogte', 'Zwaar duwen of trekken'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn in rust duidelijk afgenomen', 0),
    (v_phase, 'Slapen op de aangedane zijde minder of niet meer verstoord', 1),
    (v_phase, 'Bewustwording van schouderhouding en scapulapositie aanwezig', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste nacht zonder schouderpijn wakker worden', 0),
    (v_phase, 'Houdingscorrectie routine opgebouwd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Overbelasting, geen scheur, geen operatie nodig',
     'Deze klacht ontstaat doorgaans doordat de pezen rond het schoudergewricht tijdelijk geïrriteerd raken door herhaalde of langdurige bovenhoofdse belasting, vaak in combinatie met een naar voren hangende schouderhouding die de ruimte onder het schouderdak verkleint. Anders dan bij een peesscheur is hier meestal geen structurele schade, en fysiotherapie alleen is doorgaans voldoende om volledig te herstellen. Een operatie is bij dit type klacht meestal niet nodig.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijn- en belastingmanagement, schouderoverbelasting') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ro_pendulum, 0, 3, null, 60, null),
    (v_schedule, v_ex_ro_houding_scapula, 1, 3, 10, null, null),
    (v_schedule, v_ex_ro_nekrek, 2, 2, null, 20, null),
    (v_schedule, v_ex_ro_borststretch, 3, 3, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Opbouw rotator cuff- en scapulaire kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Opbouw rotator cuff- en scapulaire kracht',
    'Gericht kracht opbouwen in de rotator cuff-spieren en de schouderbladstabilisatoren, om de ruimte onder het schouderdak te vergroten en herhaling van de klacht te voorkomen.',
    'Week 3-7',
    array['Bovenhoofdse krachttraining met zwaar gewicht', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Actieve mobiliteit pijnvrij tot boven schouderhoogte', 0),
    (v_phase, 'Buiten- en binnenrotatiekracht merkbaar verbeterd', 1),
    (v_phase, 'Scapulaire controle tijdens armbewegingen verbeterd', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije reik boven schouderhoogte', 0),
    (v_phase, 'Volledige krachtsessie afgerond zonder nawerking', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht in de rotator cuff en schouderbladspieren samen',
     'Impingementklachten verbeteren het best door niet alleen de rotator cuff-spieren te versterken, maar ook de spieren die het schouderblad stabiliseren. Een goed functionerend schouderblad zorgt voor voldoende ruimte onder het schouderdak tijdens bovenhoofdse bewegingen. Bouw de weerstand rustig op en stop bij scherpe pijn.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Opbouw rotator cuff- en scapulaire kracht, schouderoverbelasting') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ro_buitenrotatie, 0, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_ro_binnenrotatie, 1, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_ro_scapula_rij, 2, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_ro_wallslides, 3, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Terugkeer naar volledige bovenhoofdse activiteit en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar volledige bovenhoofdse activiteit en onderhoud',
    'Volledige, begeleide terugkeer naar werk, training of sport met bovenhoofdse belasting, met een onderhoudsprogramma om herhaling van de overbelastingsklacht te voorkomen.',
    'Week 7-10',
    array['Plotselinge terugkeer naar zware bovenhoofdse sport zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische kracht en mobiliteit', 0),
    (v_phase, 'Bovenhoofdse werk- of sportbeweging pijnvrij uitvoerbaar', 1),
    (v_phase, 'Onderhoudsroutine vastgesteld', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training of werkdag met bovenhoofdse belasting', 0),
    (v_phase, 'Terug op het oude niveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf de scapulaire kracht onderhouden',
     'Overbelastingsklachten aan de schouder keren geregeld terug wanneer de opgebouwde kracht en houding niet worden onderhouden. Blijf ook na volledig herstel twee keer per week gericht kracht- en houdingswerk doen, zeker bij werk of sport met veel bovenhoofdse belasting.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar activiteit en onderhoud, schouderoverbelasting') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ro_shoulderpress_licht, 0, 3, 10, null, 'Licht'),
    (v_schedule, v_ex_ro_pushup_plus, 1, 3, 10, null, 'Lichaamsgewicht, op knieën indien nodig'),
    (v_schedule, v_ex_ro_cablerow, 2, 3, 12, null, 'Licht tot matig'),
    (v_schedule, v_ex_ro_schouderrollen, 3, 2, 10, null, null),
    (v_schedule, v_ex_ro_latpulldown, 4, 3, 12, null, 'Licht tot matig'),
    (v_schedule, v_ex_ro_bovenhoofds_sportspecifiek, 5, null, null, 900, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 2, 0);

end $$;

notify pgrst, 'reload schema';
