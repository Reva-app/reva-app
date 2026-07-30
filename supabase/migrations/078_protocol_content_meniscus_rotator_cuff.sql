-- 078_protocol_content_meniscus_rotator_cuff.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Eerste twee van tien nieuwe REVA-herstelplannen (zie migratie 077 voor de
-- uitgebreide injury_category-lijst). Zelfde format als de bestaande ACL-/
-- knieprothese-content (migratie 055): fases met een weekindicatie,
-- criteria/mijlpalen/educatie per fase, trainingsschema's gekoppeld aan de
-- gedeelde oefeningenbibliotheek. NIET geverifieerd door een bevoegd
-- fysiotherapeut — clinically_reviewed blijft false, mag niet aan echte
-- patiënten worden toegewezen totdat een fysiotherapeut de inhoud heeft
-- gecontroleerd.
-- ============================================================================
--
-- Meniscus: gemodelleerd naar een meniscushechting (meniscus repair) — het
-- klinisch veeleisendste scenario (een partiële meniscectomie kent doorgaans
-- een veel korter, minder belastingsgevoelig traject en heeft aan dit plan
-- minder houvast). Vandaar de nadruk in fase 1 op bescherming van de
-- hechting (beperkte flexie, geen diepe hurkzit, geen draaibewegingen).
--
-- Rotator cuff: gemodelleerd naar een rotator cuff-hechting (reconstructie),
-- met een klassieke sling-/bescherming-fase van 6 weken (uitsluitend
-- passieve mobiliteit) voordat actieve mobiliteit en belasting mogen
-- starten — een veelvoorkomend en goed gedocumenteerd protocolpatroon in de
-- fysiotherapie-literatuur.
--
-- Alle oefeningen in beide protocollen zijn hergebruikt uit de bestaande
-- 100-item REVA-oefeningenbibliotheek (migraties 048/055 + de latere
-- uitbreiding) — geen nieuwe oefeningen nodig voor deze twee protocollen.

do $$
declare
  -- ── Meniscus: hergebruikte oefeningen ───────────────────────────────────
  v_ex_quad uuid;
  v_ex_slr uuid;
  v_ex_enkelpompen uuid;
  v_ex_patella_mob uuid;
  v_ex_hielglijden uuid;
  v_ex_minisquat uuid;
  v_ex_stepup uuid;
  v_ex_wandzit uuid;
  v_ex_hamstringcurl uuid;
  v_ex_hometrainer uuid;
  v_ex_stepdown uuid;
  v_ex_bulgaarse_split uuid;
  v_ex_eenbenige_balans uuid;
  v_ex_wiebelbord uuid;
  v_ex_hardlopen_opbouw uuid;
  v_ex_cutting uuid;
  v_ex_dropjump uuid;
  v_ex_agility_ladder uuid;
  v_ex_sportspecifiek uuid;
  v_ex_onderhoud_kracht uuid;

  -- ── Rotator cuff: hergebruikte oefeningen ───────────────────────────────
  v_ex_pendulum uuid;
  v_ex_polscirkels uuid;
  v_ex_nekrek uuid;
  v_ex_wallslides uuid;
  v_ex_scapula uuid;
  v_ex_schouder_in uuid;
  v_ex_schouder_uit uuid;
  v_ex_shoulderpress uuid;
  v_ex_chestpress uuid;
  v_ex_cablerow uuid;
  v_ex_latpulldown uuid;
  v_ex_pushup uuid;
  v_ex_schouderrollen uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningen ophalen
  -- ══════════════════════════════════════════════════════════════════════

  select id into v_ex_quad from public.exercise_library where scope = 'reva' and title = 'Quadriceps aanspanning';
  select id into v_ex_slr from public.exercise_library where scope = 'reva' and title = 'Rechtebeen-hef';
  select id into v_ex_enkelpompen from public.exercise_library where scope = 'reva' and title = 'Enkelpompen';
  select id into v_ex_patella_mob from public.exercise_library where scope = 'reva' and title = 'Patella mobilisatie (zelf)';
  select id into v_ex_hielglijden from public.exercise_library where scope = 'reva' and title = 'Hielglijden (heel slides)';
  select id into v_ex_minisquat from public.exercise_library where scope = 'reva' and title = 'Mini squat (0 tot 45°)';
  select id into v_ex_stepup from public.exercise_library where scope = 'reva' and title = 'Step-up op opstapje';
  select id into v_ex_wandzit from public.exercise_library where scope = 'reva' and title = 'Wandzit (wall sit)';
  select id into v_ex_hamstringcurl from public.exercise_library where scope = 'reva' and title = 'Hamstringcurl (liggen)';
  select id into v_ex_hometrainer from public.exercise_library where scope = 'reva' and title = 'Fietsen op hometrainer';
  select id into v_ex_stepdown from public.exercise_library where scope = 'reva' and title = 'Step-down (excentrisch)';
  select id into v_ex_bulgaarse_split from public.exercise_library where scope = 'reva' and title = 'Bulgaarse split squat';
  select id into v_ex_eenbenige_balans from public.exercise_library where scope = 'reva' and title = 'Eenbenige balans';
  select id into v_ex_wiebelbord from public.exercise_library where scope = 'reva' and title = 'Wiebelbord balanstraining';
  select id into v_ex_hardlopen_opbouw from public.exercise_library where scope = 'reva' and title = 'Hardlopen opbouwschema';
  select id into v_ex_cutting from public.exercise_library where scope = 'reva' and title = 'Richtingsveranderingen (cutting drill)';
  select id into v_ex_dropjump from public.exercise_library where scope = 'reva' and title = 'Sprong-landtechniek (drop jump)';
  select id into v_ex_agility_ladder from public.exercise_library where scope = 'reva' and title = 'Agility ladder basis';
  select id into v_ex_sportspecifiek from public.exercise_library where scope = 'reva' and title = 'Sportspecifieke balvaardigheid';
  select id into v_ex_onderhoud_kracht from public.exercise_library where scope = 'reva' and title = 'Onderhoudskrachttraining (functioneel)';

  select id into v_ex_pendulum from public.exercise_library where scope = 'reva' and title = 'Pendulum-oefening';
  select id into v_ex_polscirkels from public.exercise_library where scope = 'reva' and title = 'Polscirkels';
  select id into v_ex_nekrek from public.exercise_library where scope = 'reva' and title = 'Nekrek zijwaarts';
  select id into v_ex_wallslides from public.exercise_library where scope = 'reva' and title = 'Wall slides';
  select id into v_ex_scapula from public.exercise_library where scope = 'reva' and title = 'Scapula retractie (rij-beweging)';
  select id into v_ex_schouder_in from public.exercise_library where scope = 'reva' and title = 'Schouder binnenrotatie met band';
  select id into v_ex_schouder_uit from public.exercise_library where scope = 'reva' and title = 'Schouder buitenrotatie met band';
  select id into v_ex_shoulderpress from public.exercise_library where scope = 'reva' and title = 'Shoulder press (machine)';
  select id into v_ex_chestpress from public.exercise_library where scope = 'reva' and title = 'Chest press (machine)';
  select id into v_ex_cablerow from public.exercise_library where scope = 'reva' and title = 'Cabel row (roeien aan kabel)';
  select id into v_ex_latpulldown from public.exercise_library where scope = 'reva' and title = 'Lat pulldown';
  select id into v_ex_pushup from public.exercise_library where scope = 'reva' and title = 'Push-up (opdrukken)';
  select id into v_ex_schouderrollen from public.exercise_library where scope = 'reva' and title = 'Schouderrollen';

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Meniscushechting — 4 fases, week 0 t/m sportterugkeer
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'meniscus', 'Meniscusoperatie herstelprotocol',
    'Herstelprotocol na een artroscopische meniscusoperatie (met nadruk op bescherming van een meniscushechting), opgebouwd in vier fases van vroege mobilisatie tot volledige, begeleide terugkeer naar sport (ca. 10-14 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en vroege mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en vroege mobilisatie',
    'De gehechte meniscus beschermen terwijl zwelling afneemt en de eerste mobiliteit en spieraansturing worden opgebouwd.',
    'Week 0-2',
    array['Diepe hurkzit', 'Draaien op het belaste been', 'Hardlopen', 'Springen', 'Knielen op het geopereerde been'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige passieve knie-extensie (0°) bereikt', 0),
    (v_phase, 'Flexie tot minimaal 90° zonder pijn', 1),
    (v_phase, 'Zwelling duidelijk afgenomen', 2),
    (v_phase, 'Quadriceps actief aan te spannen', 3),
    (v_phase, 'Lopen zonder hinken (met of zonder kruk)', 4);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stap gezet na de operatie', 0),
    (v_phase, 'Zwelling onder controle', 1),
    (v_phase, 'Quadricepscontrole hervonden', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bescherm de hechting in de eerste weken',
     'Een meniscushechting heeft tijd nodig om vast te groeien. Vermijd diepe kniebuiging, hurken en draaibewegingen op het belaste been in deze fase, ook als de knie zich al sterker voelt — dit voorkomt schade aan de hechting.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — meniscus vroege fase') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_quad, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_slr, 1, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelpompen, 2, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_patella_mob, 3, 2, 10, null),
    (v_schedule, v_ex_hielglijden, 4, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Functionele mobiliteit en kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Functionele mobiliteit en kracht',
    'Volledige beweeglijkheid herwinnen, lopen zonder hulpmiddel en starten met gecontroleerde functionele belasting.',
    'Week 2-6',
    array['Hardlopen', 'Springen', 'Draaien op het belaste been', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische flexie bereikt', 0),
    (v_phase, 'Lopen zonder hulpmiddel, zonder hinken', 1),
    (v_phase, 'Traplopen met leuning zonder pijn', 2),
    (v_phase, 'Mini squat tot 45° pijnvrij', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer (10 minuten)', 0),
    (v_phase, 'Eerste wandeling buiten', 1),
    (v_phase, 'Squat tot 45° zonder pijn', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen van belasting',
     'Ook als lopen weer soepel voelt, blijft de meniscus in deze fase nog kwetsbaar voor draai- en hurkbelasting. Bouw de belasting stap voor stap op volgens het advies van je fysiotherapeut.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Opbouw kracht en mobiliteit — meniscus') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_minisquat, 0, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_stepup, 1, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_wandzit, 2, 3, null, 30, null),
    (v_schedule, v_ex_hamstringcurl, 3, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_hometrainer, 4, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht- en stabiliteitsopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht- en stabiliteitsopbouw',
    'Spierkracht symmetrisch opbouwen, stabiliteit verbeteren en voorzichtig starten met joggen.',
    'Week 6-10',
    array['Springen en landen', 'Richtingsveranderingen op snelheid', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Quadricepskracht minimaal 80% van het andere been', 0),
    (v_phase, 'Balans op één been minimaal 30 seconden', 1),
    (v_phase, 'Geen zwelling na training', 2),
    (v_phase, '20 minuten hardlopen pijnvrij op vlakke ondergrond', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder pijn', 0),
    (v_phase, 'Balans op instabiele ondergrond mogelijk', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Symmetrische kracht vóór sportbelasting',
     'Voordat je overgaat naar richtingsveranderingen en sprongbelasting, moet de kracht van het geopereerde been vergelijkbaar zijn met de andere kant. Dit voorkomt overbelasting en verkleint het risico op een nieuwe blessure.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — meniscus') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_stepdown, 0, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_bulgaarse_split, 1, 3, 8, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_eenbenige_balans, 2, 3, null, 30, null),
    (v_schedule, v_ex_wiebelbord, 3, 3, null, 30, null),
    (v_schedule, v_ex_hardlopen_opbouw, 4, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport',
    'Richtingsveranderingen, sprongen en sportspecifieke bewegingen trainen als voorbereiding op een veilige terugkeer naar training en wedstrijd.',
    'Week 10-14',
    array['Wedstrijden zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptest-symmetrie boven 90%', 0),
    (v_phase, 'Richtingsveranderingen op snelheid zonder instabiliteit', 1),
    (v_phase, 'Volledig sportspecifiek trainen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste sportspecifieke training afgerond', 0),
    (v_phase, 'Terug op het oude sportniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden na terugkeer',
     'Ga ook na terugkeer naar sport door met gericht kracht- en stabiliteitswerk — dit blijft het risico op een nieuwe meniscusblessure beperken.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifieke training — meniscus') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_cutting, 0, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_dropjump, 1, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_agility_ladder, 2, 2, null, 60, null),
    (v_schedule, v_ex_sportspecifiek, 3, null, null, 1200, null),
    (v_schedule, v_ex_onderhoud_kracht, 4, 3, 12, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Rotator cuff-hechting — 4 fases, week 0 t/m onderhoud
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'rotator_cuff', 'Rotator cuff schouderoperatie herstelprotocol',
    'Herstelprotocol na een rotator cuff-hechting (reconstructie), van de beschermende sling-fase met uitsluitend passieve mobiliteit tot volledige, begeleide terugkeer naar werk of sport (ca. 5-6 maanden).',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en passieve mobiliteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en passieve mobiliteit',
    'De hechting beschermen in de sling terwijl uitsluitend passieve mobiliteit wordt onderhouden — actieve belasting van de gehechte pees is in deze fase niet toegestaan.',
    'Week 0-6',
    array['Actief de arm heffen', 'Tillen met de geopereerde arm', 'Steunen op de arm', 'Reiken achter de rug', 'Autorijden'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn onder controle in rust', 0),
    (v_phase, 'Wond genezen zonder tekenen van infectie', 1),
    (v_phase, 'Passieve flexie tot minimaal 90-120° bereikt', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Sling grotendeels volgens schema gedragen', 0),
    (v_phase, 'Passieve mobiliteit hersteld', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Geduld beschermt de hechting',
     'De eerste zes weken zijn cruciaal voor het vastgroeien van de gehechte pees. Til niets met de geopereerde arm, ook niet als het geen pijn doet, en houd je strikt aan het sling-advies van je chirurg of fysiotherapeut — dit voorkomt een nieuwe scheur.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Passieve mobiliteit — rotator cuff') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_pendulum, 0, 3, null, 60),
    (v_schedule, v_ex_polscirkels, 1, 2, 10, null),
    (v_schedule, v_ex_nekrek, 2, 2, null, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 2: Actieve mobiliteit en lichte belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Actieve mobiliteit en lichte belasting',
    'Actieve mobiliteit opbouwen en starten met lichte isometrische en scapulaire training, onder schouderhoogte.',
    'Week 6-12',
    array['Zwaar tillen', 'Bovenhoofdse belasting', 'Plotselinge krachtsbelasting', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Actieve flexie tot minimaal 150°', 0),
    (v_phase, 'Geen pijn bij dagelijkse activiteiten onder schouderhoogte', 1),
    (v_phase, 'Scapulaire controle hersteld', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Arm actief tot schouderhoogte geheven', 0),
    (v_phase, 'Autorijden hervat (in overleg met chirurg)', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Actieve controle vóór kracht',
     'Voordat kracht wordt opgebouwd, moet de schouder eerst weer gecontroleerd en zonder compensatie kunnen bewegen. Overslaan van deze stap verhoogt het risico op overbelasting van andere schouderstructuren.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Actieve mobiliteit — rotator cuff') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_wallslides, 0, 3, 10, null),
    (v_schedule, v_ex_scapula, 1, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_schouder_in, 2, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_schouder_uit, 3, 3, 12, 'Lichte weerstandsband');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Krachtopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Krachtopbouw',
    'Progressieve krachttraining opbouwen richting functionele en bovenhoofdse belasting.',
    'Week 12-20',
    array['Contactsport', 'Onbegeleide zware belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht buiten- en binnenrotatie minimaal 80% van de andere zijde', 0),
    (v_phase, 'Boven schouderhoogte reiken zonder compensatie', 1),
    (v_phase, 'Volledige actieve mobiliteit', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Bovenhoofdse beweging zonder pijn', 0),
    (v_phase, 'Lichte gewichten tillen zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht opbouwen kost maanden, geen weken',
     'De pees blijft ook na zes weken nog volop aan het herstellen. Bouw gewicht en herhalingen rustig op en overleg bij twijfel altijd met je fysiotherapeut voordat je een stap overslaat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — rotator cuff') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_shoulderpress, 0, 3, 10, 'Licht'),
    (v_schedule, v_ex_chestpress, 1, 3, 12, 'Licht'),
    (v_schedule, v_ex_cablerow, 2, 3, 12, 'Licht tot matig'),
    (v_schedule, v_ex_schouder_uit, 3, 3, 15, 'Matige weerstandsband');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar activiteit en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar activiteit en onderhoud',
    'Volledige, begeleide terugkeer naar werk of sport, met een onderhoudsprogramma om het opgebouwde niveau vast te houden.',
    'Week 20+',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische kracht en mobiliteit', 0),
    (v_phase, 'Sportspecifieke of werkgerelateerde bewegingen zonder klachten', 1),
    (v_phase, 'Goedkeuring fysiotherapeut voor volledige hervatting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training of werkdag hervat', 0),
    (v_phase, 'Terug op het oude niveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden, ook na terugkeer',
     'Een schouder die een rotator cuff-hechting heeft ondergaan, blijft gebaat bij regelmatig onderhoudswerk. Blijf ook na terugkeer twee keer per week gericht kracht- en stabiliteitswerk doen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud — rotator cuff') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_pushup, 0, 3, 10, 'Lichaamsgewicht, op knieën indien nodig'),
    (v_schedule, v_ex_latpulldown, 1, 3, 12, 'Licht tot matig'),
    (v_schedule, v_ex_schouderrollen, 2, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 2, 0);

end $$;

notify pgrst, 'reload schema';
