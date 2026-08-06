-- 098_protocol_vrouwenblessures.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Eerste REVA-herstelplannen voor drie nieuwe injury_category-waarden uit
-- migratie 097: pelvic_instability, pelvic_floor_dysfunction en
-- rectus_diastasis. Dit zijn veelvoorkomende zwangerschaps- en postpartum-
-- gerelateerde indicaties, maar kunnen ook los van zwangerschap voorkomen
-- (bijvoorbeeld bekkeninstabiliteit door een andere oorzaak). NIET
-- geverifieerd door een bevoegd fysiotherapeut — clinically_reviewed blijft
-- false, mag niet aan echte patiënten worden toegewezen totdat een
-- fysiotherapeut de inhoud heeft gecontroleerd. Voor deze drie protocollen
-- geldt dit EXTRA nadrukkelijk: de inhoud moet specifiek worden beoordeeld
-- door een fysiotherapeut met bekkenbodem-/pelvic-health-specialisatie
-- voordat deze in de praktijk gebruikt wordt, gezien de gevoelige en
-- specialistische aard van deze indicaties.
-- ============================================================================
--
-- Bekkeninstabiliteit (pelvic_instability): gemodelleerd naar bekkenpijn
-- tijdens of na de zwangerschap (het meest voorkomende scenario in de
-- praktijk), met aandacht voor pijneducatie en belastingopbouw, geleidelijk
-- herstel van bekkenstabiliteit en core-/bilspiercontrole, en functionele
-- terugkeer naar dagelijkse activiteiten (en eventueel sport). Bekkenpijn
-- door een andere oorzaak dan zwangerschap past ook binnen dit plan, mits de
-- fysiotherapeut de fasering op de individuele situatie afstemt.
--
-- Bekkenbodemklachten (pelvic_floor_dysfunction): bewust beperkt tot wat een
-- algemeen fysiotherapeut veilig kan begeleiden: ademhaling en
-- bekkenbodembewustwording, lichte activatie-oefeningen, coördinatie tussen
-- kern en bekkenbodem, en een voorzichtige opbouw naar impactbelasting.
-- Specifiek inwendig onderzoek en behandeling (bijvoorbeeld bij
-- verzakkingsklachten of aanhoudend urineverlies) vallen buiten de scope van
-- dit protocol en vereisen verwijzing naar een bekkenfysiotherapeut — dit
-- wordt expliciet benoemd in de educatie-inhoud van fase 1.
--
-- Diastase recti (rectus_diastasis): postpartum buikwandscheiding, met
-- nadruk in de vroege fase op voorzichtige kernactivatie zonder de buikdruk
-- overmatig te verhogen (geen volledige sit-ups/crunches, geen zwaar tillen
-- met slechte bracing), gevolgd door progressieve training van de diepe
-- buikspieren (transversus abdominis) in coördinatie met de bekkenbodem, en
-- functionele terugkeer naar normale activiteit en training.
--
-- Alle oefeningen in deze drie protocollen zijn nieuw toegevoegd aan de
-- REVA-oefeningenbibliotheek — de bestaande bibliotheek had nog geen
-- items voor deze doelgroep.

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 1: Bekkeninstabiliteit — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_ademhaling uuid;
  v_ex_symmetrisch_bewegen uuid;
  v_ex_transversus_activatie uuid;
  v_ex_bekkenkanteling uuid;
  v_ex_glute_bridge uuid;
  v_ex_zijligging_abductie uuid;
  v_ex_wandzit uuid;
  v_ex_zijwaartse_stap_band uuid;
  v_ex_eenbeen_stand_kort uuid;
  v_ex_traplopen_gecontroleerd uuid;
  v_ex_wandelen_opbouw uuid;
  v_ex_eenbenige_brug uuid;
  v_ex_hardlopen_opbouw uuid;
  v_ex_functioneel_tillen_bekken uuid;
  v_ex_stepup_bekken uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Oefeningenbibliotheek: nieuwe oefeningen ────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Bekkenbodem- en buikademhaling', 'stabiliteit',
     'Ga rustig zitten of liggen en adem laag in de buik in en uit, met aandacht voor een zachte ontspanning en lichte aanspanning van de bekkenbodem bij de uitademing.',
     'Forceer niets. Het doel is bewustwording van de ademhaling en de bekkenbodem, niet kracht zetten.', 300, array['bekken', 'ademhaling', 'bewustwording'])
    returning id into v_ex_ademhaling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bewust symmetrisch bewegen aanleren', 'mobiliteit',
     'Oefen dagelijkse bewegingen zoals opstaan uit een stoel of van bed af, bewust met gelijke belasting op beide benen in plaats van steunend op één kant.',
     'Let op een rustig tempo en gelijke belasting links en rechts. Vermijd wijdbeense of eenzijdige bewegingen tijdens het oefenen.', 2, 8, array['bekken', 'bewegingspatroon', 'symmetrie'])
    returning id into v_ex_symmetrisch_bewegen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Transversus abdominis aanspanning (liggend)', 'stabiliteit',
     'Lig op je rug met gebogen knieën en span de diepe buikspier licht aan, alsof je de onderbuik voorzichtig naar binnen trekt, zonder de adem vast te houden.',
     'Span rustig aan tot ongeveer 30 procent van je maximale kracht en houd de ademhaling gewoon doorgaan.', 3, 10, array['core', 'bekken', 'stabiliteit'])
    returning id into v_ex_transversus_activatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bekkenkanteling (pelvic tilt)', 'mobiliteit',
     'Lig op je rug met gebogen knieën. Kantel het bekken rustig zodat de onderrug licht tegen de mat drukt, houd kort vast en ontspan weer.',
     'Een kleine, rustige beweging vanuit de buikspieren, niet vanuit de rug.', 2, 10, array['bekken', 'mobiliteit', 'thuis'])
    returning id into v_ex_bekkenkanteling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bruggetje (glute bridge)', 'kracht',
     'Lig op je rug met gebogen knieën en til de bekken symmetrisch op door de bilspieren aan te spannen, houd kort vast en laat rustig zakken.',
     'Til beide zijden gelijkmatig omhoog. Stop als er een schietende of stekende pijn in het bekken ontstaat.', 3, 12, 'Lichaamsgewicht', array['bekken', 'bilspieren', 'kracht'])
    returning id into v_ex_glute_bridge;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Zijligging heupabductie', 'kracht',
     'Lig op je zij met de benen gestrekt of licht gebogen en til het bovenste been rustig omhoog, zonder het bekken naar achteren te draaien.',
     'Houd het bekken stabiel en beweeg alleen het been. Voer per zijde uit.', 3, 12, 'Lichte weerstandsband', array['bekken', 'heup', 'kracht'])
    returning id into v_ex_zijligging_abductie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Lichte wandzit', 'stabiliteit',
     'Leun met de rug tegen de muur en zak rustig door de knieën tot een lichte hoek, zonder ver door te zakken, en houd de positie kort vast.',
     'Kies een hoek die pijnvrij aanvoelt. Bouw de duur pas op als dit zonder klachten lukt.', 3, 20, array['bekken', 'stabiliteit', 'been'])
    returning id into v_ex_wandzit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Zijwaartse stap met weerstandsband', 'kracht',
     'Plaats een lichte weerstandsband rond de onderbenen en zet rustige, gecontroleerde stappen zijwaarts, met behoud van een stabiel bekken.',
     'Houd de knieën licht gebogen en het bekken recht. Voer per richting uit.', 3, 10, 'Lichte weerstandsband', array['bekken', 'heup', 'kracht'])
    returning id into v_ex_zijwaartse_stap_band;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Kort eenbenig steunen', 'stabiliteit',
     'Sta op één been met een lichte kniebuiging en houd het bekken zo stabiel mogelijk, met eventueel steun van een muur of stoel indien nodig.',
     'Bouw de duur rustig op. Gebruik steun zolang balans nog onzeker voelt.', 3, 15, array['bekken', 'balans', 'stabiliteit'])
    returning id into v_ex_eenbeen_stand_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Traplopen gecontroleerd', 'conditie',
     'Loop rustig en gecontroleerd de trap op en af, met aandacht voor een symmetrisch bewegingspatroon en gebruik van de leuning indien nodig.',
     'Gebruik de leuning zolang dat prettig voelt. Bouw het aantal trappen rustig op.', 300, array['bekken', 'functioneel', 'conditie'])
    returning id into v_ex_traplopen_gecontroleerd;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen, opbouwschema', 'conditie',
     'Wandel in een rustig tempo, met een geleidelijk oplopende duur van sessie tot sessie op basis van hoe het bekken reageert.',
     'Bouw de duur op in kleine stappen. Neem een rustdag of stap terug als de klachten toenemen.', 1200, array['bekken', 'conditie', 'opbouw'])
    returning id into v_ex_wandelen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Eenbenige bruggetje', 'kracht',
     'Lig op je rug met gebogen knieën, strek één been en til het bekken op met het andere been, met behoud van een stabiel en symmetrisch bekken.',
     'Voer alleen uit als de gewone bruggetje al pijnvrij en gecontroleerd lukt. Voer per zijde uit.', 3, 10, array['bekken', 'bilspieren', 'kracht'])
    returning id into v_ex_eenbenige_brug;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Lichte hardloopopbouw (indien van toepassing)', 'conditie',
     'Wissel rustig joggen af met wandelen, in een schema dat stap voor stap meer aaneengesloten looptijd opbouwt.',
     'Start pas met dit schema na goedkeuring van de fysiotherapeut. Stop bij toename van bekkenklachten.', 1200, array['bekken', 'hardlopen', 'sport'])
    returning id into v_ex_hardlopen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Functioneel tillen en dragen (symmetrisch)', 'kracht',
     'Til een lichte tas of voorwerp met beide handen symmetrisch op en draag deze een korte afstand, met een stabiel en recht bekken.',
     'Verdeel het gewicht gelijk over beide zijden. Vermijd eenzijdig dragen zolang dit klachten geeft.', 3, 8, array['bekken', 'functioneel', 'kracht'])
    returning id into v_ex_functioneel_tillen_bekken;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-up met controle', 'kracht',
     'Stap met controle op en af een opstapje, met aandacht voor een stabiel, symmetrisch bekken tijdens de hele beweging.',
     'Kies een hoogte waarbij het bekken stabiel blijft. Bouw pas op naar een hoger opstapje als dit pijnvrij lukt.', 3, 10, 'Lichaamsgewicht', array['bekken', 'functioneel', 'kracht'])
    returning id into v_ex_stepup_bekken;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'pelvic_instability', 'Herstelplan bekkeninstabiliteit',
    'Herstelplan bij bekkeninstabiliteit, met bekkenpijn tijdens of na de zwangerschap als meest voorkomende situatie (bekkeninstabiliteit door een andere oorzaak past ook binnen dit plan). Opgebouwd van pijneducatie en belastingopbouw, via herstel van bekkenstabiliteit en core-/bilspiercontrole, naar functionele terugkeer in het dagelijks leven en eventueel sport (ca. 8-12 weken). Vereist beoordeling door een fysiotherapeut met bekkenbodem-/pelvic-health-specialisatie voordat het bij patiënten wordt ingezet.',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijneducatie en belastingopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijneducatie en belastingopbouw',
    'Inzicht krijgen in wat de klachten uitlokt, asymmetrische belasting vermijden en rustig starten met bewuste bekkenbodem- en kernactivatie.',
    'Week 0-3',
    array['Asymmetrisch belasten van één been, bijvoorbeeld lang op één been staan', 'Wijdbeens bewegen, zoals met gespreide benen uit de auto stappen', 'Hardlopen of springen', 'Zwaar of eenzijdig tillen', 'Lang staan zonder pauze'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij dagelijkse bewegingen onder controle', 0),
    (v_phase, 'Bekkenbodem en diepe buikspier bewust aan te spannen', 1),
    (v_phase, 'Symmetrisch kunnen staan en lopen zonder duidelijke compensatie', 2),
    (v_phase, 'Een korte wandeling mogelijk zonder toename van klachten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije wandeling van 10 minuten', 0),
    (v_phase, 'Bewuste bekkenbodemactivatie onder de knie', 1),
    (v_phase, 'Dagelijkse handelingen symmetrisch uitgevoerd', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom symmetrisch bewegen belangrijk is',
     'Bekkenpijn tijdens of na de zwangerschap is een veelvoorkomende en goed te behandelen klacht. In deze fase helpt het om asymmetrische bewegingen te vermijden: lang op één been staan, wijdbeens bewegen (zoals uit de auto stappen) en eenzijdig tillen kunnen de klachten uitlokken. Bouw de belasting rustig op en zoek de balans tussen actief blijven en het lichaam niet overvragen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijneducatie en belastingopbouw, bekkeninstabiliteit') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_ademhaling, 0, null, null, 300, null),
    (v_schedule, v_ex_symmetrisch_bewegen, 1, 2, 8, null, null),
    (v_schedule, v_ex_transversus_activatie, 2, 3, 10, null, null),
    (v_schedule, v_ex_bekkenkanteling, 3, 2, 10, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Opbouw van bekkenstabiliteit en spiercontrole
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Opbouw van bekkenstabiliteit en spiercontrole',
    'Geleidelijk kracht en controle opbouwen in bilspieren en core, als basis voor stabiliteit van het bekken bij dagelijkse bewegingen.',
    'Week 3-6',
    array['Hardlopen of springen', 'Zware asymmetrische tilbewegingen', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Bruggetje uitvoeren zonder compensatie of pijn', 0),
    (v_phase, 'Heupabductie met controle en zonder pijn', 1),
    (v_phase, 'Traplopen zonder toename van klachten', 2),
    (v_phase, 'Wandelen van 20 tot 30 minuten zonder toename van klachten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste keer traplopen zonder klachten', 0),
    (v_phase, '20 minuten wandelen zonder toename van pijn', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht opbouwen ondersteunt het bekken',
     'Sterke bilspieren en een goed functionerende core helpen het bekken stabiel te houden tijdens lopen, traplopen en tillen. Bouw de belasting geleidelijk op en stop met een oefening als deze pijn in het bekken oproept in plaats van gewone spiermoeheid.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Opbouw bekkenstabiliteit en spiercontrole') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_glute_bridge, 0, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_zijligging_abductie, 1, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_wandzit, 2, 3, null, 20, null),
    (v_schedule, v_ex_zijwaartse_stap_band, 3, 3, 10, null, 'Lichte weerstandsband');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele terugkeer naar dagelijkse activiteiten
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele terugkeer naar dagelijkse activiteiten',
    'De opgebouwde stabiliteit toepassen in functionele, dagelijkse bewegingen zoals tillen, langer staan en langere wandelingen.',
    'Week 6-9',
    array['Hardlopen op hoge snelheid', 'Zware til- of duwbewegingen zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Traplopen zonder leuning mogelijk', 0),
    (v_phase, 'Lichte voorwerpen symmetrisch kunnen tillen', 1),
    (v_phase, 'Balans op één been minimaal 15 tot 20 seconden', 2),
    (v_phase, 'Langere wandeling zonder toename van klachten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen weer mogelijk zonder klachten', 0),
    (v_phase, 'Volledige dagtaak zonder toename van klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Terug naar het dagelijks leven, stap voor stap',
     'In deze fase komt de nadruk te liggen op het toepassen van de opgebouwde stabiliteit in het dagelijks leven: tillen, langer staan, fietsen en langere wandelingen. Bouw elke nieuwe activiteit rustig op en overleg met de fysiotherapeut als een specifieke beweging klachten blijft geven.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele terugkeer, bekkeninstabiliteit') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_eenbeen_stand_kort, 0, 3, null, 15, null),
    (v_schedule, v_ex_traplopen_gecontroleerd, 1, null, null, 300, null),
    (v_schedule, v_ex_wandelen_opbouw, 2, null, null, 1200, null),
    (v_schedule, v_ex_eenbenige_brug, 3, 3, 10, null, null),
    (v_schedule, v_ex_functioneel_tillen_bekken, 4, 3, 8, null, null),
    (v_schedule, v_ex_stepup_bekken, 5, 3, 10, null, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar sport en volledige belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport en volledige belasting',
    'Voor wie dat van toepassing is: verdere opbouw naar hardlopen en sportspecifieke belasting, met behoud van symmetrische kracht en controle.',
    'Week 9-12',
    array['Wedstrijden zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '20 minuten hardlopen pijnvrij op vlakke ondergrond', 0),
    (v_phase, 'Sportspecifieke bewegingen zonder klachten', 1),
    (v_phase, 'Symmetrische kracht in bilspieren en core hersteld', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste sportspecifieke training afgerond', 0),
    (v_phase, 'Terug op het gewenste activiteiten- of sportniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf bouwen aan kracht en stabiliteit',
     'Ook na terugkeer naar sport of volledige belasting blijft het zinvol om regelmatig aan bekken- en kernstabiliteit te blijven werken. Dit verkleint de kans op terugkerende klachten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar sport, bekkeninstabiliteit') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_hardlopen_opbouw, 0, null, null, 1200, null),
    (v_schedule, v_ex_eenbenige_brug, 1, 3, 12, null, null),
    (v_schedule, v_ex_zijwaartse_stap_band, 2, 3, 12, null, 'Matige weerstandsband'),
    (v_schedule, v_ex_eenbeen_stand_kort, 3, 3, null, 20, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 2: Bekkenbodemklachten — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_bewustwording uuid;
  v_ex_diafragma_ademhaling uuid;
  v_ex_bb_activatie_licht uuid;
  v_ex_bb_langzame_aanspanning uuid;
  v_ex_core_bb_coordinatie uuid;
  v_ex_voorbelasten_hoesten_tillen uuid;
  v_ex_glute_bridge uuid;
  v_ex_wandzit uuid;
  v_ex_squat_functioneel uuid;
  v_ex_wandelen_opbouw uuid;
  v_ex_huppelen_licht uuid;
  v_ex_hardlopen_opbouw uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Oefeningenbibliotheek: nieuwe oefeningen ────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Bekkenbodem bewustwording', 'stabiliteit',
     'Ga rustig zitten of liggen en breng de aandacht naar het gebied van de bekkenbodem, zonder actief aan te spannen, gewoon om het gevoel ervan te herkennen.',
     'Er is geen goed of fout. Het doel is alleen bewustwording van het gebied.', 300, array['bekkenbodem', 'bewustwording'])
    returning id into v_ex_bewustwording;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Diafragmatische ademhaling', 'stabiliteit',
     'Adem rustig laag in de buik in, zodat de buik meebeweegt, en laat bij het uitademen de bekkenbodem zachtjes meebewegen naar boven.',
     'Adem rustig door de neus in en ontspannen uit. Forceer niets.', 300, array['bekkenbodem', 'ademhaling'])
    returning id into v_ex_diafragma_ademhaling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Lichte bekkenbodemactivatie (aanspannen en loslaten)', 'stabiliteit',
     'Span de bekkenbodemspieren licht aan, alsof je het plassen even onderbreekt, houd kort vast en laat daarna volledig los.',
     'Span rustig aan zonder de billen, buik of benen mee aan te spannen. Volledig loslaten is net zo belangrijk als aanspannen.', 3, 10, array['bekkenbodem', 'activatie'])
    returning id into v_ex_bb_activatie_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Langzame bekkenbodemaanspanning met vasthouden', 'stabiliteit',
     'Span de bekkenbodemspieren rustig aan en houd de aanspanning ongeveer 5 seconden vast, terwijl je gewoon blijft doorademen, en laat daarna volledig los.',
     'Bouw de duur van het vasthouden pas op als korte aanspanningen goed lukken. Stop als vermoeidheid het aanspannen bemoeilijkt.', 3, 8, array['bekkenbodem', 'activatie', 'opbouw'])
    returning id into v_ex_bb_langzame_aanspanning;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Coördinatie buik en bekkenbodem', 'stabiliteit',
     'Span tegelijk de diepe buikspier en de bekkenbodem licht aan, alsof beide zachtjes naar binnen en boven bewegen, en laat daarna samen weer los.',
     'Zoek naar een lichte, gelijktijdige aanspanning van beide gebieden, zonder de adem vast te houden.', 3, 10, array['bekkenbodem', 'core', 'coordinatie'])
    returning id into v_ex_core_bb_coordinatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bekkenbodem voorbelasten bij hoesten en tillen', 'stabiliteit',
     'Span de bekkenbodem licht aan vlak voordat je hoest, niest, tilt of opstaat, om het gebied voor te bereiden op de toegenomen druk.',
     'Oefen dit eerst bewust in rustige situaties, zodat het geleidelijk een automatisme wordt bij hoesten en tillen.', 2, 8, array['bekkenbodem', 'functioneel', 'preventie'])
    returning id into v_ex_voorbelasten_hoesten_tillen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bruggetje (glute bridge)', 'kracht',
     'Lig op je rug met gebogen knieën en til het bekken symmetrisch op door de bilspieren aan te spannen, houd kort vast en laat rustig zakken.',
     'Combineer het optillen met een lichte bekkenbodemactivatie.', 3, 12, 'Lichaamsgewicht', array['bekkenbodem', 'bilspieren', 'kracht'])
    returning id into v_ex_glute_bridge;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Wandzit (wall sit), kort', 'stabiliteit',
     'Leun met de rug tegen de muur en zak rustig door de knieën tot een lichte hoek, en houd de positie kort vast met een ontspannen ademhaling.',
     'Kies een hoek die comfortabel aanvoelt. Adem gewoon door tijdens het vasthouden.', 3, 20, array['bekkenbodem', 'stabiliteit', 'been'])
    returning id into v_ex_wandzit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Functionele squat met bekkenbodemcontrole', 'kracht',
     'Zak rustig door de knieën in een squatbeweging en kom weer omhoog, met aandacht voor een lichte bekkenbodemactivatie tijdens het omhoogkomen.',
     'Ga niet dieper dan wat comfortabel voelt en zonder gevoel van zwaarte of druk in de bekkenbodem.', 3, 10, array['bekkenbodem', 'functioneel', 'kracht'])
    returning id into v_ex_squat_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen, opbouwschema', 'conditie',
     'Wandel in een rustig tempo, met een geleidelijk oplopende duur op basis van hoe het lichaam reageert.',
     'Bouw de duur op in kleine stappen. Neem een rustdag bij toename van klachten zoals zwaartegevoel of lekkage.', 1200, array['bekkenbodem', 'conditie', 'opbouw'])
    returning id into v_ex_wandelen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Lichte huppel- en sprongoefeningen (opbouw impact)', 'kracht',
     'Voer kleine, lichte huppels of sprongen uit, bijvoorbeeld op de plaats, als eerste kennismaking met impactbelasting.',
     'Start met een klein aantal herhalingen en let goed op signalen als lekkage of een zwaar gevoel. Stop en bouw langzamer op als deze optreden.', 3, 10, array['bekkenbodem', 'impact', 'opbouw'])
    returning id into v_ex_huppelen_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Hardloopopbouwschema', 'conditie',
     'Wissel rustig joggen af met wandelen, in een schema dat stap voor stap meer aaneengesloten looptijd opbouwt.',
     'Start pas met dit schema als lichte impactoefeningen goed worden verdragen. Stop bij lekkage, zwaartegevoel of pijn.', 1200, array['bekkenbodem', 'hardlopen', 'sport'])
    returning id into v_ex_hardlopen_opbouw;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'pelvic_floor_dysfunction', 'Herstelplan bekkenbodemklachten',
    'Herstelplan gericht op algemene bekkenbodembewustwording en -kracht, vaak inzetbaar na de bevalling. Dit plan is opgebouwd rond wat een algemeen fysiotherapeut veilig kan begeleiden: ademhaling, activatie-oefeningen, coördinatie met de core en een voorzichtige opbouw naar impact (ca. 8-12 weken). Specifiek inwendig onderzoek en gerichte behandeling van bijvoorbeeld verzakkingsklachten of aanhoudend urineverlies vallen hier nadrukkelijk buiten en vereisen verwijzing naar een bekkenfysiotherapeut. Vereist beoordeling door een fysiotherapeut met bekkenbodem-/pelvic-health-specialisatie voordat het bij patiënten wordt ingezet.',
    false)
  returning id into v_protocol;

  -- Fase 1: Bewustwording en ademhaling
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bewustwording en ademhaling',
    'Bewustwording opbouwen van de bekkenbodem en een rustige, diafragmatische ademhaling aanleren als basis voor de verdere opbouw.',
    'Week 0-3',
    array['Zware buikspieroefeningen zoals sit-ups en crunches', 'Zwaar tillen', 'Hardlopen en springen', 'Langdurig persen bij toiletgang zonder aandacht voor ontspanning'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Bekkenbodem bewust te herkennen en licht aan te spannen', 0),
    (v_phase, 'Diafragmatische ademhaling toe te passen in rust', 1),
    (v_phase, 'Geen toename van klachten zoals zwaartegevoel of urineverlies bij dagelijkse activiteiten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste bewuste bekkenbodemaanspanning gevoeld', 0),
    (v_phase, 'Diafragmatische ademhaling toegepast in rust', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Wanneer een bekkenfysiotherapeut nodig is',
     'Dit herstelplan helpt bij algemene bewustwording, activatie en kracht van de bekkenbodem, zoals een algemeen fysiotherapeut dat veilig kan begeleiden. Voor specifiek inwendig onderzoek en gerichte behandeling, bijvoorbeeld bij verzakkingsklachten (een gevoel van zwaarte of druk) of aanhoudend urineverlies, is verwijzing naar een bekkenfysiotherapeut nodig. Bespreek met de fysiotherapeut of een dergelijke verwijzing in jouw situatie wenselijk is.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Bewustwording en ademhaling, bekkenbodem') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_bewustwording, 0, null, null, 300),
    (v_schedule, v_ex_diafragma_ademhaling, 1, null, null, 300),
    (v_schedule, v_ex_bb_activatie_licht, 2, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Actieve bekkenbodemactivatie en coördinatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Actieve bekkenbodemactivatie en coördinatie',
    'De bekkenbodem langer leren aanspannen en de samenwerking met de diepe buikspier oefenen, als basis voor functionele belasting.',
    'Week 3-6',
    array['Zware buikspieroefeningen', 'Hardlopen en springen', 'Zwaar tillen zonder bewuste bekkenbodemcontrole'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Bekkenbodem 5 seconden kunnen aanspannen en vasthouden', 0),
    (v_phase, 'Coördinatie tussen buik en bekkenbodem voelbaar', 1),
    (v_phase, 'Bruggetje uitvoeren zonder toename van klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Bewust voorbelasten bij tillen of hoesten toegepast', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bekkenbodem en kern werken samen',
     'De bekkenbodem werkt nauw samen met de diepe buikspieren en het middenrif. Door deze samen te trainen, bijvoorbeeld door de bekkenbodem licht voor te belasten vlak voor tillen of hoesten, ontstaat betere ondersteuning bij dagelijkse activiteiten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Actieve activatie en coördinatie, bekkenbodem') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_bb_langzame_aanspanning, 0, 3, 8, null),
    (v_schedule, v_ex_core_bb_coordinatie, 1, 3, 10, null),
    (v_schedule, v_ex_voorbelasten_hoesten_tillen, 2, 2, 8, null),
    (v_schedule, v_ex_glute_bridge, 3, 3, 12, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele coördinatie en opbouw impactbelasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele coördinatie en opbouw impactbelasting',
    'De opgebouwde controle toepassen tijdens functionele bewegingen en voorzichtig kennismaken met lichte impactbelasting.',
    'Week 6-9',
    array['Hardlopen op hoge snelheid', 'Zware sprongbelasting zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Functionele squat zonder toename van klachten', 0),
    (v_phase, 'Wandelen van 30 minuten zonder toename van klachten', 1),
    (v_phase, 'Lichte huppeloefeningen zonder lekkage of zwaartegevoel', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste lichte huppeloefeningen zonder klachten', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen naar impact',
     'Impactbelasting zoals huppelen en springen vraagt meer van de bekkenbodem dan rustig bewegen. Bouw dit in kleine stappen op en let goed op signalen zoals lekkage of een zwaar gevoel. Stap terug in belasting als deze signalen optreden en overleg bij aanhoudende klachten met de fysiotherapeut.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele opbouw impact, bekkenbodem') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_wandzit, 0, 3, null, 20),
    (v_schedule, v_ex_squat_functioneel, 1, 3, 10, null),
    (v_schedule, v_ex_wandelen_opbouw, 2, null, null, 1200),
    (v_schedule, v_ex_huppelen_licht, 3, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar impact en sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar impact en sport',
    'Verdere opbouw naar hardlopen en sportspecifieke belasting, met behoud van bekkenbodemcontrole onder hogere belasting.',
    'Week 9-12',
    array['Wedstrijden of intensieve training zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hardlopen zonder klachten', 0),
    (v_phase, 'Sportspecifieke bewegingen zonder lekkage of zwaartegevoel', 1),
    (v_phase, 'Bekkenbodem blijft functioneel bij hogere belasting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder klachten', 0),
    (v_phase, 'Terugkeer naar de gewenste sport of activiteit', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf alert op signalen',
     'Ook bij terugkeer naar sport blijft het belangrijk om te letten op signalen van de bekkenbodem, zoals lekkage of een zwaar gevoel. Bouw de belasting bij twijfel iets langzamer op en neem bij aanhoudende klachten contact op met een bekkenfysiotherapeut.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar impact en sport, bekkenbodem') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_hardlopen_opbouw, 0, null, null, 1200),
    (v_schedule, v_ex_huppelen_licht, 1, 3, 12, null),
    (v_schedule, v_ex_squat_functioneel, 2, 3, 12, null),
    (v_schedule, v_ex_glute_bridge, 3, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 3: Diastase recti (buikwandscheiding) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_bewuste_ademhaling uuid;
  v_ex_tva_activatie uuid;
  v_ex_bekkenkanteling uuid;
  v_ex_heel_slide_core uuid;
  v_ex_bb_tva_coordinatie uuid;
  v_ex_bridge_core uuid;
  v_ex_vogelhond uuid;
  v_ex_zijwaartse_plank_kort uuid;
  v_ex_functioneel_tillen uuid;
  v_ex_squat_licht uuid;
  v_ex_wandelen_opbouw uuid;
  v_ex_core_stabiliteit_progressief uuid;
  v_ex_hardlopen_of_trainen_opbouw uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Oefeningenbibliotheek: nieuwe oefeningen ────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Bewuste buik- en middenrifademhaling', 'stabiliteit',
     'Adem rustig laag in de buik in, zodat de buikwand meebeweegt, en adem rustig weer uit zonder de buikspieren te forceren.',
     'Adem rustig door en let op een ontspannen buikwand, zonder te persen.', 300, array['core', 'ademhaling', 'buikwand'])
    returning id into v_ex_bewuste_ademhaling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Transversus abdominis activatie (liggend)', 'stabiliteit',
     'Lig op je rug met gebogen knieën en span de diepe buikspier licht aan, alsof je de onderbuik voorzichtig naar binnen trekt, zonder de buik te laten opbollen.',
     'Span rustig aan tot ongeveer 30 procent van je maximale kracht. Stop als de buikwand zichtbaar opbolt (doming).', 3, 10, array['core', 'buikwand', 'stabiliteit'])
    returning id into v_ex_tva_activatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bekkenkanteling (pelvic tilt)', 'mobiliteit',
     'Lig op je rug met gebogen knieën. Kantel het bekken rustig zodat de onderrug licht tegen de mat drukt, houd kort vast en ontspan weer.',
     'Een kleine, rustige beweging vanuit de buikspieren, niet vanuit de rug.', 2, 10, array['core', 'mobiliteit', 'buikwand'])
    returning id into v_ex_bekkenkanteling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Hielglijden met kernactivatie', 'stabiliteit',
     'Lig op je rug met gebogen knieën, span de diepe buikspier licht aan en schuif één hiel rustig naar voren over de vloer en weer terug.',
     'Houd de aanspanning vast tijdens de hele beweging en stop als de buikwand opbolt. Voer per zijde uit.', 3, 8, array['core', 'buikwand', 'stabiliteit'])
    returning id into v_ex_heel_slide_core;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Coördinatie bekkenbodem en transversus abdominis', 'stabiliteit',
     'Span tegelijk de bekkenbodem en de diepe buikspier licht aan, alsof beide zachtjes naar binnen en boven bewegen, en laat daarna samen weer los.',
     'Zoek naar een lichte, gelijktijdige aanspanning van beide gebieden, zonder de adem vast te houden.', 3, 10, array['core', 'bekkenbodem', 'coordinatie'])
    returning id into v_ex_bb_tva_coordinatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bruggetje met kernactivatie', 'kracht',
     'Span eerst de diepe buikspier licht aan, til daarna het bekken op door de bilspieren aan te spannen, houd kort vast en laat rustig zakken.',
     'Houd de kernaanspanning vast tijdens de hele beweging en let op dat de buikwand niet opbolt.', 3, 12, 'Lichaamsgewicht', array['core', 'buikwand', 'kracht'])
    returning id into v_ex_bridge_core;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Vogelhond (bird dog), rustige uitvoering', 'stabiliteit',
     'Ga op handen en knieën staan en strek rustig één arm en het tegenovergestelde been, met een stabiele rug en buikwand, en breng daarna terug.',
     'Beweeg langzaam en gecontroleerd. Stop als de buikwand opbolt of de rug meedraait. Voer per zijde uit.', 3, 8, array['core', 'buikwand', 'stabiliteit'])
    returning id into v_ex_vogelhond;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Zijwaartse plank, kort en op de knieën', 'stabiliteit',
     'Steun op één onderarm en de knieën in zijligging en til de heup licht van de grond, met een stabiele buikwand, en houd kort vast.',
     'Houd de duur kort en stop zodra de vorm verslechtert of de buikwand opbolt. Voer per zijde uit.', 2, 15, array['core', 'buikwand', 'stabiliteit'])
    returning id into v_ex_zijwaartse_plank_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Functioneel tillen met kernbracing', 'kracht',
     'Span de diepe buikspier licht aan voordat je een voorwerp (bijvoorbeeld een tas of een kind) optilt, en til daarna met gebogen knieën en een rechte rug.',
     'Adem uit tijdens het optillen en vermijd het vasthouden van de adem of persen.', 3, 8, array['core', 'buikwand', 'functioneel'])
    returning id into v_ex_functioneel_tillen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Lichte squat met kernbracing', 'kracht',
     'Zak rustig door de knieën in een squatbeweging met een lichte, aanhoudende kernaanspanning, en kom weer omhoog.',
     'Ga niet dieper dan wat comfortabel voelt zonder dat de buikwand opbolt.', 3, 10, array['core', 'buikwand', 'kracht'])
    returning id into v_ex_squat_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen, opbouwschema', 'conditie',
     'Wandel in een rustig tempo, met een geleidelijk oplopende duur van sessie tot sessie op basis van hoe de buikwand reageert.',
     'Bouw de duur op in kleine stappen. Neem een rustdag bij toename van klachten.', 1200, array['core', 'conditie', 'opbouw'])
    returning id into v_ex_wandelen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Progressieve kernstabiliteitstraining (plankvariaties)', 'stabiliteit',
     'Bouw geleidelijk op van een korte plank op de knieën naar langere of zwaardere plankvarianten, steeds met behoud van een stabiele, niet-opbollende buikwand.',
     'Verhoog de duur of moeilijkheid pas als de huidige variant volledig gecontroleerd en zonder opbollen lukt.', 20, array['core', 'buikwand', 'stabiliteit'])
    returning id into v_ex_core_stabiliteit_progressief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Opbouw naar hardlopen of intensievere training', 'conditie',
     'Wissel rustig joggen of intensievere training af met wandelen of rust, in een schema dat stap voor stap meer belasting opbouwt.',
     'Start pas met dit schema als functionele kernstabiliteit goed wordt verdragen. Stop bij pijn of een zichtbare opbolling van de buikwand.', 1200, array['core', 'hardlopen', 'sport'])
    returning id into v_ex_hardlopen_of_trainen_opbouw;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'rectus_diastasis', 'Herstelplan diastase recti (buikwandscheiding)',
    'Herstelplan bij diastase recti (buikwandscheiding), vaak ontstaan tijdens de zwangerschap. Opgebouwd van voorzichtige kernactivatie zonder de buikdruk overmatig te verhogen, via progressieve training van de diepe buikspieren in coördinatie met de bekkenbodem, naar functionele terugkeer naar normale activiteit en training (ca. 10-12 weken). Vereist beoordeling door een fysiotherapeut met bekkenbodem-/pelvic-health-specialisatie voordat het bij patiënten wordt ingezet.',
    false)
  returning id into v_protocol;

  -- Fase 1: Vroege, voorzichtige kernactivatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Vroege, voorzichtige kernactivatie',
    'De diepe buikspier leren aanspannen zonder de buikdruk overmatig te verhogen, en dagelijkse bewegingen zoals opstaan aanpassen om de buikwand te ontlasten.',
    'Week 0-3',
    array['Volledige sit-ups of crunches', 'Zwaar tillen met slechte bracing', 'Buikspieroefeningen waarbij de buik zichtbaar opbolt (doming)', 'Zware inspanning die de buikdruk sterk verhoogt, zoals zwaar persen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Diepe buikspier bewust te activeren', 0),
    (v_phase, 'Geen zichtbare opbolling (doming) van de buik tijdens oefeningen', 1),
    (v_phase, 'Opstaan uit bed via zijligging toegepast', 2),
    (v_phase, 'Geen toename van rug- of bekkenklachten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste bewuste kernactivatie gevoeld', 0),
    (v_phase, 'Opstaan uit bed via zijligging aangeleerd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Voorkom druk op de buikwand',
     'In de eerste weken is het belangrijk om de buikwand niet onnodig te belasten. Vermijd volledige sit-ups en crunches, zwaar tillen zonder bracing en oefeningen waarbij de buik zichtbaar opbolt. Sta bij voorkeur op vanuit zijligging: rol op je zij, breng de benen over de rand en duw jezelf met de armen omhoog in plaats van rechtstreeks vanuit lig overeind te komen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Vroege kernactivatie, diastase recti') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_bewuste_ademhaling, 0, null, null, 300),
    (v_schedule, v_ex_tva_activatie, 1, 3, 10, null),
    (v_schedule, v_ex_bekkenkanteling, 2, 2, 10, null),
    (v_schedule, v_ex_heel_slide_core, 3, 3, 8, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Progressieve diepe core- en bekkenbodemcoördinatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Progressieve diepe core- en bekkenbodemcoördinatie',
    'De kernactivatie combineren met armen- en beenbewegingen, met behoud van een stabiele, niet-opbollende buikwand.',
    'Week 3-7',
    array['Volledige sit-ups of crunches', 'Zware buikspiertraining', 'Zwaar tillen zonder bracing'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kernactivatie te combineren met armen- of beenbewegingen', 0),
    (v_phase, 'Geen opbolling bij oefeningen op handen en knieën', 1),
    (v_phase, 'Bruggetje en vogelhond zonder compensatie', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste keer vogelhond zonder opbolling uitgevoerd', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kern en bekkenbodem werken samen',
     'De diepe buikspieren en de bekkenbodem ondersteunen samen de buikwand. Door ze gecoördineerd te trainen, wordt de basis gelegd voor stabiliteit bij functionele bewegingen zoals tillen en opstaan.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Progressieve core-coördinatie, diastase recti') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_bb_tva_coordinatie, 0, 3, 10, null, null),
    (v_schedule, v_ex_bridge_core, 1, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_vogelhond, 2, 3, 8, null, null),
    (v_schedule, v_ex_zijwaartse_plank_kort, 3, 2, null, 15, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele stabiliteit en tillen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele stabiliteit en tillen',
    'De opgebouwde kernstabiliteit toepassen bij functionele bewegingen zoals tillen en squatten, en de conditie geleidelijk uitbreiden.',
    'Week 7-10',
    array['Zwaar tillen zonder opbouw', 'Hoge impact activiteiten zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Functioneel tillen met correcte bracing', 0),
    (v_phase, 'Squat met kernstabiliteit zonder opbolling', 1),
    (v_phase, 'Wandelen van 30 minuten zonder toename van klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Dagelijkse tilbewegingen zonder klachten uitgevoerd', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig terug naar normale belasting',
     'Met een stabielere kern kan de belasting in het dagelijks leven geleidelijk toenemen: tillen, langer staan en langere wandelingen. Blijf letten op de buikwand tijdens inspanning en bouw op in kleine stappen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele stabiliteit en tillen, diastase recti') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_functioneel_tillen, 0, 3, 8, null),
    (v_schedule, v_ex_squat_licht, 1, 3, 10, null),
    (v_schedule, v_ex_wandelen_opbouw, 2, null, null, 1200),
    (v_schedule, v_ex_core_stabiliteit_progressief, 3, 3, null, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar volledige activiteit en training
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar volledige activiteit en training',
    'Verdere opbouw naar volledige dagelijkse activiteit en trainingsbelasting, met behoud van kernstabiliteit onder hogere belasting.',
    'Week 10-12',
    array['Intensieve training zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige kernstabiliteit bij dagelijkse en sportieve bewegingen', 0),
    (v_phase, 'Geen zichtbare opbolling meer bij belasting', 1),
    (v_phase, 'Hardlopen of trainen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige trainingssessie hervat', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf bouwen aan kernstabiliteit',
     'Ook na terugkeer naar volledige activiteit blijft het zinvol om regelmatig aan kernstabiliteit te blijven werken. Houd de buikwand in de gaten bij zware inspanning en overleg met de fysiotherapeut als er twijfel blijft bestaan over de mate van herstel van de buikwandscheiding.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar volledige activiteit, diastase recti') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_core_stabiliteit_progressief, 0, 3, null, 20),
    (v_schedule, v_ex_hardlopen_of_trainen_opbouw, 1, null, null, 1200),
    (v_schedule, v_ex_squat_licht, 2, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
