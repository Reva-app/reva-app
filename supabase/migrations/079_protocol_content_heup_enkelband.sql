-- 079_protocol_content_heup_enkelband.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Herstelplannen 3 en 4 van tien (zie migratie 077/078 voor context). NIET
-- geverifieerd door een bevoegd fysiotherapeut — clinically_reviewed blijft
-- false.
-- ============================================================================
--
-- Totale heupprothese: zelfde opzet als het bestaande knieprothese-protocol
-- (migratie 055), maar met heup-specifieke voorzorgen i.p.v. knie-specifieke
-- (geen been kruisen, niet diep buigen in de heup, niet naar binnen draaien
-- op het geopereerde been) — de klassieke "hip precautions" die na een
-- posterieure of anterieure benadering gelden, exacte details verschillen
-- per chirurg/benadering en worden daarom in de educatietekst bewust generiek
-- gehouden ("volgens het advies van je chirurg").
--
-- Enkelbandletsel (ankle_ligament): bewust gemodelleerd als een chronisch/
-- operatief traject (bv. na een Broström-achtige ligamentreconstructie voor
-- aanhoudende instabiliteit) — een langer en gestructureerder traject dan de
-- acute verzwikking uit migratie 080/081 (ankle_sprain), en dus terecht een
-- eigen categorie met een eigen klinisch profiel.
--
-- Alle oefeningen hergebruikt uit de bestaande REVA-oefeningenbibliotheek.

do $$
declare
  -- ── Totale heupprothese ─────────────────────────────────────────────────
  v_ex_enkelpompen uuid;
  v_ex_quad uuid;
  v_ex_glutebridge uuid;
  v_ex_sittostand uuid;
  v_ex_heupflexie_band uuid;
  v_ex_zittende_abductie uuid;
  v_ex_heupextensie uuid;
  v_ex_wandelen_buiten uuid;
  v_ex_hometrainer uuid;
  v_ex_clamshell uuid;
  v_ex_monsterwalk uuid;
  v_ex_eenbenige_glutebridge uuid;
  v_ex_traplopen uuid;
  v_ex_onderhoud_kracht uuid;
  v_ex_birddog uuid;

  -- ── Enkelbandletsel (chronisch/operatief) ───────────────────────────────
  v_ex_enkelcirkel uuid;
  v_ex_kniehef uuid;
  v_ex_enkeldorsiflexie uuid;
  v_ex_calfraise uuid;
  v_ex_hielhef uuid;
  v_ex_fietsergometer uuid;
  v_ex_kuitstretch uuid;
  v_ex_enkel_inversie_eversie uuid;
  v_ex_eenbenige_balans uuid;
  v_ex_wiebelbord uuid;
  v_ex_balans_instabiel uuid;
  v_ex_optenenlopen uuid;
  v_ex_cutting uuid;
  v_ex_agility_ladder uuid;
  v_ex_hardlopen_opbouw uuid;
  v_ex_sportspecifiek uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningen ophalen
  -- ══════════════════════════════════════════════════════════════════════

  select id into v_ex_enkelpompen from public.exercise_library where scope = 'reva' and title = 'Enkelpompen';
  select id into v_ex_quad from public.exercise_library where scope = 'reva' and title = 'Quadriceps aanspanning';
  select id into v_ex_glutebridge from public.exercise_library where scope = 'reva' and title = 'Glute bridge';
  select id into v_ex_sittostand from public.exercise_library where scope = 'reva' and title = 'Opstaan vanuit zit (sit-to-stand)';
  select id into v_ex_heupflexie_band from public.exercise_library where scope = 'reva' and title = 'Heupflexie staand met band';
  select id into v_ex_zittende_abductie from public.exercise_library where scope = 'reva' and title = 'Zittende heupabductie met band';
  select id into v_ex_heupextensie from public.exercise_library where scope = 'reva' and title = 'Heupextensie liggend (buikligging)';
  select id into v_ex_wandelen_buiten from public.exercise_library where scope = 'reva' and title = 'Wandelen buiten (opbouwend)';
  select id into v_ex_hometrainer from public.exercise_library where scope = 'reva' and title = 'Fietsen op hometrainer';
  select id into v_ex_clamshell from public.exercise_library where scope = 'reva' and title = 'Clam shell';
  select id into v_ex_monsterwalk from public.exercise_library where scope = 'reva' and title = 'Zijwaartse band-walk (monster walk)';
  select id into v_ex_eenbenige_glutebridge from public.exercise_library where scope = 'reva' and title = 'Eenbenige glute bridge';
  select id into v_ex_traplopen from public.exercise_library where scope = 'reva' and title = 'Traplopen oefenen';
  select id into v_ex_onderhoud_kracht from public.exercise_library where scope = 'reva' and title = 'Onderhoudskrachttraining (functioneel)';
  select id into v_ex_birddog from public.exercise_library where scope = 'reva' and title = 'Bird dog';

  select id into v_ex_enkelcirkel from public.exercise_library where scope = 'reva' and title = 'Enkelcirkel (zittend)';
  select id into v_ex_kniehef from public.exercise_library where scope = 'reva' and title = 'Kniehef zittend (marcheren)';
  select id into v_ex_enkeldorsiflexie from public.exercise_library where scope = 'reva' and title = 'Enkeldorsiflexie tegen muur (knie naar muur)';
  select id into v_ex_calfraise from public.exercise_library where scope = 'reva' and title = 'Calf raise op trede';
  select id into v_ex_hielhef from public.exercise_library where scope = 'reva' and title = 'Hielhef (staand)';
  select id into v_ex_fietsergometer from public.exercise_library where scope = 'reva' and title = 'Fietsergometer';
  select id into v_ex_kuitstretch from public.exercise_library where scope = 'reva' and title = 'Kuitstretch tegen muur';
  select id into v_ex_enkel_inversie_eversie from public.exercise_library where scope = 'reva' and title = 'Enkel inversie en eversie met band';
  select id into v_ex_eenbenige_balans from public.exercise_library where scope = 'reva' and title = 'Eenbenige balans';
  select id into v_ex_wiebelbord from public.exercise_library where scope = 'reva' and title = 'Wiebelbord balanstraining';
  select id into v_ex_balans_instabiel from public.exercise_library where scope = 'reva' and title = 'Balans op instabiele ondergrond';
  select id into v_ex_optenenlopen from public.exercise_library where scope = 'reva' and title = 'Op tenen lopen';
  select id into v_ex_cutting from public.exercise_library where scope = 'reva' and title = 'Richtingsveranderingen (cutting drill)';
  select id into v_ex_agility_ladder from public.exercise_library where scope = 'reva' and title = 'Agility ladder basis';
  select id into v_ex_hardlopen_opbouw from public.exercise_library where scope = 'reva' and title = 'Hardlopen opbouwschema';
  select id into v_ex_sportspecifiek from public.exercise_library where scope = 'reva' and title = 'Sportspecifieke balvaardigheid';

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Totale heupprothese — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'total_hip_replacement', 'Totale heupprothese herstelprotocol',
    'Herstelprotocol na plaatsing van een totale heupprothese, van de ziekenhuisfase met heupvoorzorgen tot volledige functionele zelfstandigheid (ca. 3-4 maanden).',
    false)
  returning id into v_protocol;

  -- Fase 1: Ziekenhuisfase & vroege mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Ziekenhuisfase & vroege mobilisatie',
    'Pijn en zwelling onder controle brengen, de wond laten genezen en veilig starten met mobilisatie binnen de heupvoorzorgen van je chirurg.',
    'Week 0-2',
    array['Been kruisen', 'Diep buigen in de heup (bijv. lage stoel)', 'Draaien op het geopereerde been', 'Op de zij liggen zonder kussen tussen de knieën'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wond genezen zonder tekenen van infectie', 0),
    (v_phase, 'Zelfstandig transfers (bed, stoel) mogelijk', 1),
    (v_phase, 'Lopen met looprek of rollator zonder hinken', 2),
    (v_phase, 'Pijn onder controle met medicatie', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stap gezet na de operatie', 0),
    (v_phase, 'Zelfstandig transfers uitgevoerd', 1),
    (v_phase, 'Traplopen met leuning (onder begeleiding)', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Heupvoorzorgen strikt naleven',
     'Volg de heupvoorzorgen van je chirurg nauwkeurig: geen benen kruisen, niet diep buigen in de heup (bijv. lage stoelen of bukken) en niet naar binnen draaien op het geopereerde been. De exacte regels verschillen per operatietechniek — vraag je chirurg of fysiotherapeut welke voor jou gelden en hoelang.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — heupprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_enkelpompen, 0, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_quad, 1, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_glutebridge, 2, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_sittostand, 3, 3, 8, 'Lichaamsgewicht, armleuningen toegestaan');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 2: Functioneel herstel thuis
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Functioneel herstel thuis',
    'Zelfstandigheid in dagelijkse activiteiten uitbreiden en hulpmiddelen geleidelijk afbouwen, met behoud van de heupvoorzorgen.',
    'Week 2-6',
    array['Hardlopen', 'Springen', 'Sporten met impact', 'Been kruisen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen binnenshuis zonder hulpmiddel', 0),
    (v_phase, 'Zelfstandig aan- en uitkleden', 1),
    (v_phase, 'Traplopen met leuning zonder pijn', 2),
    (v_phase, 'Heupflexie tot minimaal 90° zonder pijn', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer', 0),
    (v_phase, 'Autorijden hervat (in overleg met chirurg)', 1),
    (v_phase, 'Eerste wandeling buitenshuis', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Dagelijkse activiteiten als oefening',
     'Gewone bewegingen — opstaan, lopen, traplopen — zijn in deze fase al waardevolle training. Bouw de afstand en frequentie rustig op, en blijf de heupvoorzorgen naleven totdat je chirurg of fysiotherapeut aangeeft dat dit niet meer nodig is.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en kracht — heupprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_heupflexie_band, 0, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_zittende_abductie, 1, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_hometrainer, 2, null, null, 600, null),
    (v_schedule, v_ex_wandelen_buiten, 3, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht en uithoudingsvermogen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht en uithoudingsvermogen',
    'Heupkracht en conditie verder opbouwen richting volledige zelfstandigheid, met een stabiel looppatroon zonder hulpmiddel.',
    'Week 6-12',
    array['Hardlopen', 'Springen'])
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
    (v_phase, 'Zwelling na training is normaal, aanhoudende pijn niet',
     'Lichte, tijdelijke zwelling na een actieve dag is in deze fase normaal. Neem contact op met je fysiotherapeut bij aanhoudende of toenemende pijn die niet binnen een dag afneemt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — heupprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_clamshell, 0, 3, 15, null),
    (v_schedule, v_ex_monsterwalk, 1, 3, 12, null),
    (v_schedule, v_ex_heupextensie, 2, 3, 12, null),
    (v_schedule, v_ex_traplopen, 3, 1, null, 'Dagelijks oefenen, rustig tempo'),
    (v_schedule, v_ex_eenbenige_glutebridge, 4, 3, 10, 'Alleen als volledige glute bridge al pijnvrij en stabiel lukt');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Onderhoud en terugkeer naar activiteiten
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Onderhoud en terugkeer naar activiteiten',
    'Terugkeer naar gewenste hobby''s en activiteiten, met een onderhoudsprogramma om het bereikte niveau vast te houden.',
    'Week 12+',
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

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud en conditie — heupprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_onderhoud_kracht, 0, 3, 12, null),
    (v_schedule, v_ex_birddog, 1, 3, 10, null),
    (v_schedule, v_ex_wandelen_buiten, 2, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Enkelbandletsel (chronisch/operatief) — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'ankle_ligament', 'Enkelbandletsel herstelprotocol (chronisch/operatief)',
    'Herstelprotocol na een operatieve enkelbandreconstructie (bv. na aanhoudende instabiliteit), van bescherming van de hersteldde band tot volledige, begeleide terugkeer naar sport (ca. 14-16 weken). Voor een acute verzwikking zonder operatie, zie het herstelplan ''Enkelverzwikking''.',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en vroege mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en vroege mobilisatie',
    'De gereconstrueerde band beschermen (vaak in brace of boot) terwijl zwelling afneemt en voorzichtig wordt gestart met mobiliteit binnen de toegestane grenzen.',
    'Week 0-3',
    array['Inversie-bewegingen (naar binnen zwikken)', 'Belasten buiten het toegestane schema', 'Hardlopen', 'Springen', 'Sporten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wond genezen zonder tekenen van infectie', 0),
    (v_phase, 'Zwelling duidelijk afgenomen', 1),
    (v_phase, 'Belasten volgens het opgebouwde schema van de chirurg', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste keer belast volgens schema', 0),
    (v_phase, 'Brace of boot correct gedragen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bescherming van de gereconstrueerde band',
     'Een enkelbandreconstructie heeft tijd nodig om te herstellen. Vermijd draai- en inversiebewegingen strikt in deze fase, ook als de enkel stabiel aanvoelt, en houd je aan het belastingsschema van je chirurg.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — enkelbandreconstructie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_enkelpompen, 0, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelcirkel, 1, 2, 10, null),
    (v_schedule, v_ex_kniehef, 2, 2, 10, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Mobiliteit en belastingopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Mobiliteit en belastingopbouw',
    'De brace geleidelijk afbouwen, volledige mobiliteit herwinnen en lopen zonder hulpmiddel hervatten.',
    'Week 3-8',
    array['Hardlopen', 'Springen', 'Inversie-bewegingen', 'Sporten op oneffen ondergrond'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische dorsiflexie bereikt', 0),
    (v_phase, 'Lopen zonder hulpmiddel, zonder hinken', 1),
    (v_phase, 'Traplopen met leuning zonder pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Brace afgebouwd volgens schema', 0),
    (v_phase, 'Fietsen op hometrainer', 1),
    (v_phase, 'Eerste wandeling buiten', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Zwelling als signaal',
     'Bouw de belasting stap voor stap op en let op zwelling aan het eind van de dag — dit is een goed signaal om een stap terug te doen of het tempo te vertragen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit — enkelbandreconstructie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_enkeldorsiflexie, 0, 3, 10, null, null),
    (v_schedule, v_ex_calfraise, 1, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hielhef, 2, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_fietsergometer, 3, null, null, 600, null),
    (v_schedule, v_ex_kuitstretch, 4, 2, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht en propriocepsis
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht en propriocepsis',
    'Spierkracht symmetrisch opbouwen en het gevoel voor de enkel (propriocepsis) herstellen — een van de belangrijkste voorwaarden om herverzwikking te voorkomen.',
    'Week 8-14',
    array['Hardlopen op onvoorspelbare ondergrond', 'Richtingsveranderingen op snelheid', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht inversie/eversie minimaal 80% van de andere zijde', 0),
    (v_phase, 'Balans op één been minimaal 30 seconden', 1),
    (v_phase, 'Wandelen 30 minuten pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Balans op instabiele ondergrond mogelijk', 0),
    (v_phase, 'Wiebelbordtraining zonder pijn', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Propriocepsis is net zo belangrijk als kracht',
     'De doorgesneden en herstelde ligamentvezels leverden ook gevoel (propriocepsis) over de stand van je enkel. Dit gevoel moet opnieuw worden aangeleerd via balans- en instabiliteitstraining — vandaar de nadruk op deze oefeningen in plaats van alleen kracht.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Kracht en balans — enkelbandreconstructie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_enkel_inversie_eversie, 0, 3, 15, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_eenbenige_balans, 1, 3, null, 30, null),
    (v_schedule, v_ex_wiebelbord, 2, 3, null, 30, null),
    (v_schedule, v_ex_balans_instabiel, 3, 3, null, 30, null),
    (v_schedule, v_ex_optenenlopen, 4, 2, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport',
    'Richtingsveranderingen, hardlopen en sportspecifieke bewegingen op snelheid trainen als voorbereiding op een veilige sportterugkeer.',
    'Week 14+',
    array['Wedstrijden zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptest-symmetrie boven 90%', 0),
    (v_phase, 'Richtingsveranderingen op snelheid zonder instabiliteitsgevoel', 1),
    (v_phase, 'Volledig sportspecifiek trainen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie op snelheid', 0),
    (v_phase, 'Eerste sportspecifieke training afgerond', 1),
    (v_phase, 'Terug op het oude sportniveau', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Overweeg taping of brace bij sporthervatting',
     'Het risico op een nieuwe verzwikking blijft de eerste maanden na terugkeer verhoogd. Bespreek met je fysiotherapeut of preventieve taping of een brace bij sporthervatting zinvol is, en blijf balansoefeningen als onderhoud doen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifieke training — enkelbandreconstructie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_cutting, 0, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_agility_ladder, 1, 2, null, 60, null),
    (v_schedule, v_ex_hardlopen_opbouw, 2, null, null, 1200, null),
    (v_schedule, v_ex_sportspecifiek, 3, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

notify pgrst, 'reload schema';
