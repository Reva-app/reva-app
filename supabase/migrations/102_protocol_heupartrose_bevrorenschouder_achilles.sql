-- 102_protocol_heupartrose_bevrorenschouder_achilles.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Eerste REVA-herstelplannen voor drie van de nieuwe injury_category-waarden
-- uit migratie 097: hip_osteoarthritis, shoulder_chronic_pain en
-- achilles_tendinopathy. Zelfde format als de bestaande protocolcontent
-- (o.a. migratie 078): fases met een weekindicatie, criteria/mijlpalen/
-- educatie per fase, trainingsschema's gekoppeld aan nieuw aangemaakte
-- oefeningen. NIET geverifieerd door een bevoegd fysiotherapeut,
-- clinically_reviewed blijft false, mag niet aan echte patiënten worden
-- toegewezen totdat een fysiotherapeut de inhoud heeft gecontroleerd.
-- ============================================================================
--
-- Heupartrose: een chronische, degeneratieve aandoening. Dit protocol is
-- géén nazorgtraject na een heupoperatie (dat bestaat al elders), maar een
-- conservatief zelfmanagementprogramma voor mensen die (nog) niet worden
-- geopereerd. Nadruk op de boodschap dat bewegen goed is bij artrose,
-- zolang overbelasting en volledige rust allebei worden vermeden, gevolgd
-- door opbouw van kracht en laagbelaste conditie, en tot slot een blijvend
-- onderhoudsritme.
--
-- Bevroren schouder (frozen shoulder / adhesive capsulitis): een aandoening
-- met een eigen, goed beschreven natuurlijk beloop in drie stadia. De
-- fase-indeling van dit protocol volgt bewust dat klinische beloop
-- (pijnlijke fase, stijve fase, ontdooifase) in plaats van de gebruikelijke
-- acuut-naar-sportterugkeer-structuur, omdat dat beter aansluit bij hoe deze
-- aandoening zich daadwerkelijk ontwikkelt. Het traject is bewust lang
-- (6 tot 12 maanden) en de educatietekst is eerlijk over dat geduld een
-- kernonderdeel is van het herstel.
--
-- Achillespees-tendinopathie: een overbelastingsblessure, nadrukkelijk
-- anders dan een acute achillespeesruptuur (niet onderdeel van dit
-- protocol, met een korte waarschuwing dat plotselinge scherpe pijn met het
-- onvermogen om af te zetten dringend beoordeeld moet worden). Opbouw
-- volgens de in de literatuur goed onderbouwde route van isometrische
-- belasting, naar excentrische/zware langzame belasting (Alfredson-achtig),
-- naar een gestructureerde opbouw van hardloopvolume.
--
-- Alle oefeningen in deze drie protocollen zijn nieuw aangemaakt en niet
-- gekoppeld aan de bestaande gedeelde oefeningenbibliotheek.

do $$
declare
  -- ── Heupartrose: nieuwe oefeningen ──────────────────────────────────────
  v_ex_ha_educatie_wandelen uuid;
  v_ex_ha_bekkenkanteling uuid;
  v_ex_ha_heupabductie_lig uuid;
  v_ex_ha_bridge uuid;
  v_ex_ha_fietsen uuid;
  v_ex_ha_zwemmen uuid;
  v_ex_ha_sta_op uuid;
  v_ex_ha_stationaire_lunge uuid;
  v_ex_ha_heupabductie_staand uuid;
  v_ex_ha_traplopen uuid;
  v_ex_ha_eenbeens_balans uuid;
  v_ex_ha_onderhoud_wandelen uuid;
  v_ex_ha_onderhoud_kracht uuid;

  -- ── Bevroren schouder: nieuwe oefeningen ────────────────────────────────
  v_ex_bs_pendulum uuid;
  v_ex_bs_passieve_flexie uuid;
  v_ex_bs_passieve_buitenrot uuid;
  v_ex_bs_houding uuid;
  v_ex_bs_wandwandelen uuid;
  v_ex_bs_stokoefening_flexie uuid;
  v_ex_bs_stokoefening_buitenrot uuid;
  v_ex_bs_handdoekrek uuid;
  v_ex_bs_wallslides uuid;
  v_ex_bs_binnenrot_band uuid;
  v_ex_bs_buitenrot_band uuid;
  v_ex_bs_scapula uuid;
  v_ex_bs_bovenhoofds_reiken uuid;
  v_ex_bs_onderhoud_rek uuid;

  -- ── Achillespees-tendinopathie: nieuwe oefeningen ───────────────────────
  v_ex_at_isometrisch_kuit uuid;
  v_ex_at_fietsen uuid;
  v_ex_at_mobiliteit_enkel uuid;
  v_ex_at_excentrisch_gestrekt uuid;
  v_ex_at_excentrisch_gebogen uuid;
  v_ex_at_heffen_dubbel uuid;
  v_ex_at_heffen_enkel uuid;
  v_ex_at_wandelen_opbouw uuid;
  v_ex_at_hardlopen_opbouw uuid;
  v_ex_at_plyometrie uuid;
  v_ex_at_onderhoud_kuit uuid;
  v_ex_at_sprint_opbouw uuid;
  v_ex_at_hoptest uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Heupartrose, conservatief zelfmanagement, 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'hip_osteoarthritis', 'Herstelplan heupartrose',
    'Conservatief zelfmanagementprogramma bij heupartrose, gericht op pijnmanagement, geleidelijke opbouw van kracht en laagbelaste conditie, en een blijvend onderhoudsritme. Geen nazorgtraject na een operatie: dit plan is voor het managen van artrose zonder (of in afwachting van) een operatie.',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnmanagement en activiteitenopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnmanagement en activiteitenopbouw',
    'Leren dat bewegen goed is bij artrose, een dagritme vinden tussen volledige rust en overbelasting, en de eerste, voorzichtige oefeningen opstarten.',
    'Week 0-3',
    array['Langdurig hardlopen', 'Springen', 'Zware belasting bij een opspelende, gezwollen heup', 'Volledige bedrust bij pijn'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Dagelijkse pijn beter in kaart gebracht via een eenvoudig dagritme', 0),
    (v_phase, 'Wandelen van minimaal 10 minuten mogelijk zonder sterke pijntoename', 1),
    (v_phase, 'Bekkenkanteling en lichte heupoefeningen pijnvrij uit te voeren', 2),
    (v_phase, 'Begrip van het verschil tussen normale spierpijn en waarschuwende gewrichtspijn', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste wandeling van 10 minuten volbracht', 0),
    (v_phase, 'Vast dagritme met beweegmomenten gevonden', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bewegen is goed voor een artrotische heup',
     'Bij artrose lijkt rust logisch, maar te weinig bewegen maakt de heup juist stijver en zwakker. Te veel in één keer doen, kan de heup dan weer laten opspelen. Zoek de balans: verspreid activiteit over de dag in korte, regelmatige blokken, en bouw geleidelijk op in plaats van in één keer veel te doen. Lichte, voorbijgaande spierpijn na het sporten is normaal, aanhoudende of toenemende gewrichtspijn is een signaal om een stap terug te doen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijnmanagement en opstart, heupartrose') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Educatie: bewegen bij artrose', 'anders', 'Korte voorlichtingsmomenten over verstandig bewegen met een artrotische heup.', 'Lees of bekijk de voorlichting en noteer één actiepunt voor vandaag.', null, null, null, array['artrose', 'educatie', 'heup'])
  returning id into v_ex_ha_educatie_wandelen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bekkenkanteling (liggend)', 'mobiliteit', 'Zachte mobiliserende oefening voor het bekken en de lage rug, ter voorbereiding op verdere heupoefeningen.', 'Lig op je rug met de knieën gebogen. Kantel het bekken rustig achterover zodat de onderrug de vloer raakt, houd twee seconden vast en ontspan.', 3, 12, null, array['artrose', 'mobiliteit', 'heup'])
  returning id into v_ex_ha_bekkenkanteling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Heupabductie liggend', 'kracht', 'Lichte activatie van de heupabductoren in liggende positie, geschikt voor een gevoelige heup.', 'Lig op je zij met de onderste knie licht gebogen. Til het bovenste been recht omhoog zonder het lichaam te draaien en laat het rustig weer zakken.', 2, 10, 'Lichaamsgewicht', array['artrose', 'kracht', 'heup'])
  returning id into v_ex_ha_heupabductie_lig;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ha_educatie_wandelen, 0, null, null);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ha_bekkenkanteling, 1, 3, 12, null),
    (v_schedule, v_ex_ha_heupabductie_lig, 2, 2, 10, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 2: Progressieve heup- en bilkracht met laagbelaste conditie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Progressieve heup- en bilkracht met laagbelaste conditie',
    'Gericht opbouwen van kracht rond de heup en bil, aangevuld met laagbelaste conditievormen zoals fietsen, zwemmen of wandelen.',
    'Week 3-8',
    array['Hardlopen op harde ondergrond', 'Springen', 'Zwaar tillen met een gebogen rug', 'Trainen door aanhoudende gewrichtspijn heen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Bridge en heupabductie staand pijnvrij uit te voeren', 0),
    (v_phase, 'Minimaal twee laagbelaste conditiesessies per week volgehouden', 1),
    (v_phase, 'Traplopen merkbaar comfortabeler dan bij de start', 2),
    (v_phase, 'Geen toename van rustpijn na een trainingsweek', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste keer 20 minuten fietsen of zwemmen volbracht', 0),
    (v_phase, 'Duidelijke verbetering bij traplopen ervaren', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht rond de heup ontlast het gewricht',
     'Sterkere bil- en heupspieren nemen een deel van de belasting van het versleten gewricht over, wat klachten vaak vermindert. Kies daarnaast bewust voor laagbelaste conditievormen zoals fietsen, zwemmen of wandelen: deze houden je conditie en gewicht op peil zonder de heup zwaar te belasten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Kracht en laagbelaste conditie, heupartrose') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Bridge (bekkenlift)', 'kracht', 'Versterkt de bilspieren en onderrug in een gecontroleerde, heup-vriendelijke uitgangspositie.', 'Lig op je rug met de knieën gebogen en voeten plat op de vloer. Til het bekken op tot romp en bovenbenen een rechte lijn vormen, houd kort vast en laat gecontroleerd zakken.', 3, 12, null, 'Lichaamsgewicht', array['artrose', 'kracht', 'heup', 'bil'])
  returning id into v_ex_ha_bridge;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Fietsen op hometrainer', 'conditie', 'Laagbelaste conditietraining die de heup nauwelijks belast, ideaal bij artrose.', 'Fiets in een rustig tot matig tempo op lage weerstand. Stop of verlaag het tempo bij toenemende pijn.', null, 900, null, array['artrose', 'conditie', 'laagbelast'])
  returning id into v_ex_ha_fietsen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Zwemmen of aquajoggen', 'conditie', 'Conditietraining in het water, waarbij het water het lichaamsgewicht draagt en de heup ontlast.', 'Zwem rustig baantjes of beweeg in het water op een tempo dat comfortabel aanvoelt, bij voorkeur in warm water.', null, 1200, null, array['artrose', 'conditie', 'laagbelast', 'water'])
  returning id into v_ex_ha_zwemmen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Opstaan vanuit stoel zonder handen', 'kracht', 'Functionele beenkracht- en balansoefening die dagelijks opstaan vergemakkelijkt.', 'Ga op een stevige stoel zitten met de voeten plat op de vloer. Sta op zonder de handen te gebruiken en ga gecontroleerd weer zitten.', 3, 10, 'Lichaamsgewicht', array['artrose', 'kracht', 'functioneel'])
  returning id into v_ex_ha_sta_op;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Heupabductie staand met band', 'kracht', 'Versterkt de heupabductoren in een functionele, staande positie.', 'Bevestig een lichte weerstandsband rond de enkels. Sta stabiel op één been en beweeg het andere been zijwaarts, gecontroleerd terug.', 3, 12, 'Lichte weerstandsband', array['artrose', 'kracht', 'heup'])
  returning id into v_ex_ha_heupabductie_staand;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ha_bridge, 0, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ha_sta_op, 1, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ha_heupabductie_staand, 2, 3, 12, 'Lichte weerstandsband');
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds) values
    (v_schedule, v_ex_ha_fietsen, 3, 900),
    (v_schedule, v_ex_ha_zwemmen, 4, 1200);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele kracht en stabiliteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele kracht en stabiliteit',
    'Kracht en balans verder opbouwen richting het niveau dat nodig is voor traplopen, langere wandelingen en dagelijkse activiteiten.',
    'Week 8-11',
    array['Hoogintensieve sprongtraining', 'Zware, ongeleide krachttraining zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Traplopen zonder leuning mogelijk bij milde artrose', 0),
    (v_phase, 'Balans op één been minimaal 15 seconden', 1),
    (v_phase, 'Wandelen van 30 minuten mogelijk met acceptabele nabelasting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste wandeling van 30 minuten volbracht', 0),
    (v_phase, 'Merkbaar zekerder gevoel bij traplopen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Balans en kracht samen trainen',
     'Naast pure spierkracht helpt balanstraining om de heup stabieler te maken bij dagelijkse bewegingen zoals traplopen en oneffen ondergrond. Combineer beide vormen voor het beste functionele resultaat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele kracht en stabiliteit, heupartrose') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Statische lunge (steun mogelijk)', 'kracht', 'Functionele beenoefening die kracht en stabiliteit combineert, met steun beschikbaar indien nodig.', 'Zet een grote pas naar voren met beide knieën licht gebogen. Zak rustig door beide knieën en duw jezelf weer omhoog. Gebruik een stoel of muur als steun bij onzekerheid.', 3, 8, 'Lichaamsgewicht', array['artrose', 'kracht', 'functioneel'])
  returning id into v_ex_ha_stationaire_lunge;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Traplopen geoefend', 'kracht', 'Functionele oefening die traplopen direct oefent onder controle.', 'Loop een korte trap rustig op en af, gebruik de leuning zolang dat nodig voelt. Focus op een gelijkmatig tempo.', 2, 10, 'Lichaamsgewicht', array['artrose', 'functioneel', 'trap'])
  returning id into v_ex_ha_traplopen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Eenbenige balans (steun mogelijk)', 'stabiliteit', 'Balanstraining voor de heup, met een steunpunt in de buurt indien nodig.', 'Sta op één been in de buurt van een aanrecht of stoel als houvast. Houd de positie zo stabiel mogelijk vast en wissel van been.', 3, 20, array['artrose', 'balans', 'stabiliteit'])
  returning id into v_ex_ha_eenbeens_balans;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ha_stationaire_lunge, 0, 3, 8, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ha_traplopen, 1, 2, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_ha_heupabductie_staand, 2, 3, 12, 'Lichte tot matige weerstandsband');
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_ha_eenbeens_balans, 3, 3, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Langdurig zelfmanagement en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Langdurig zelfmanagement en onderhoud',
    'Heupartrose is een blijvende aandoening. Deze fase zet het opgebouwde kracht- en conditieniveau om in een vast onderhoudsritme dat langdurig wordt volgehouden.',
    'Week 11+',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Vast wekelijks beweegritme opgebouwd', 0),
    (v_phase, 'Dagelijkse activiteiten mogelijk met acceptabel klachtenniveau', 1),
    (v_phase, 'Zelf herkennen wanneer belasting tijdelijk verlaagd moet worden', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Drie maanden onderhoudsritme volgehouden', 0),
    (v_phase, 'Eigen signalen voor overbelasting leren herkennen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Heupartrose blijft, dit ritme ook',
     'Artrose gaat niet over, maar de klachten zijn met een blijvend actief leefpatroon vaak goed te managen. Bouw kracht- en conditietraining structureel in je week in, ook op momenten dat het goed gaat. Neem bij een opflakkering rustig een stap terug in belasting in plaats van volledig te stoppen, en bouw daarna weer op.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud, heupartrose') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Wandelen, onderhoudsritme', 'conditie', 'Regelmatig wandelen als kern van het langdurige onderhoudsprogramma bij artrose.', 'Wandel in een rustig tot stevig tempo, bij voorkeur meerdere keren per week op vaste momenten.', null, 1800, array['artrose', 'conditie', 'onderhoud'])
  returning id into v_ex_ha_onderhoud_wandelen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Onderhoudskracht heup en bil', 'kracht', 'Combinatieoefening van bridge, abductie en lunge als vast onderhoudsblok voor de heupspieren.', 'Doorloop de bridge, staande heupabductie en lunge in een vast blok, twee keer per week, om het opgebouwde krachtniveau vast te houden.', 3, 12, 'Lichaamsgewicht tot lichte weerstandsband', array['artrose', 'kracht', 'onderhoud'])
  returning id into v_ex_ha_onderhoud_kracht;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds) values
    (v_schedule, v_ex_ha_onderhoud_wandelen, 0, 1800),
    (v_schedule, v_ex_ha_zwemmen, 2, 1200);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ha_onderhoud_kracht, 1, 3, 12, 'Lichaamsgewicht tot lichte weerstandsband');
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_ha_eenbeens_balans, 3, 3, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Bevroren schouder (frozen shoulder), 3 fases naar natuurlijk beloop
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'shoulder_chronic_pain', 'Herstelplan bevroren schouder (frozen shoulder)',
    'Begeleidingsplan bij een bevroren schouder (adhesive capsulitis), opgebouwd rond het natuurlijke beloop van deze aandoening in drie stadia: een pijnlijke fase, een stijve fase en een ontdooifase. Dit traject duurt doorgaans 6 tot 12 maanden en soms langer, geduld is een kernonderdeel van het herstel.',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnlijke fase
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnlijke fase',
    'De schouder doet in deze fase het meest pijn, vaak ook in de nacht, en de beweeglijkheid begint af te nemen. Het doel is de pijn behapbaar houden en de schouder pijnvrij in beweging houden, zonder te forceren.',
    'Maand 0-3 (indicatief)',
    array['Agressief stretchen door de pijn heen', 'Zware belasting van de arm', 'Bovenhoofds tillen', 'Slapen op de aangedane schouder bij nachtpijn'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn overdag beter behapbaar dan bij de start', 0),
    (v_phase, 'Pendulum-oefening dagelijks uit te voeren zonder pijn erna', 1),
    (v_phase, 'Bewust zijn van welke bewegingen en houdingen de pijn uitlokken', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste week zonder verergering van de pijn', 0),
    (v_phase, 'Een houding gevonden die in de nacht minder pijn geeft', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom deze fase vooral om pijn draait, niet om rek',
     'Een bevroren schouder doorloopt doorgaans drie stadia: eerst een pijnlijke fase, dan een stijve fase, en tot slot een ontdooifase waarin de beweeglijkheid terugkeert. In deze eerste, pijnlijke fase is agressief stretchen vaak averechts: het lichaam reageert op prikkeling met meer pijn en soms meer stijfheid. Beweeg daarom binnen een pijnvrije zone en houd de schouder in lichte beweging, zonder de grenzen op te zoeken. Dit traject duurt in totaal vaak 6 tot 12 maanden of langer, en dat is normaal. Geduld is hier geen bijzaak, maar een kernonderdeel van het herstel.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijnlijke fase, bevroren schouder') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Pendulum-oefening', 'mobiliteit', 'Zachte, passieve mobiliteitsoefening met minimale spieractiviteit, geschikt voor een pijnlijke schouder.', 'Buig licht voorover, laat de arm ontspannen los hangen en maak kleine, rustige cirkels of zwaaibewegingen met de romp, niet actief met de schouder.', 3, 60, array['schouder', 'frozen shoulder', 'mobiliteit', 'pijnfase'])
  returning id into v_ex_bs_pendulum;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Passieve flexie met andere arm', 'mobiliteit', 'Passieve mobilisatie van de schouder binnen de pijnvrije zone, ondersteund door de andere arm.', 'Lig op je rug en ondersteun de aangedane arm met de andere arm of een stok. Beweeg de arm rustig omhoog tot net voor het punt van pijn en laat weer zakken.', 2, 10, array['schouder', 'frozen shoulder', 'mobiliteit', 'pijnfase'])
  returning id into v_ex_bs_passieve_flexie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Houdingscorrectie zittend', 'mobiliteit', 'Bewustwordingsoefening voor houding, helpt onnodige belasting van de schouder overdag te verminderen.', 'Ga rechtop zitten, trek de schouders licht naar achteren en beneden, en houd deze houding enkele minuten vast tijdens dagelijkse bezigheden.', 2, 5, array['schouder', 'frozen shoulder', 'houding'])
  returning id into v_ex_bs_houding;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_bs_pendulum, 0, 3, 60);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps) values
    (v_schedule, v_ex_bs_passieve_flexie, 1, 2, 10),
    (v_schedule, v_ex_bs_houding, 2, 2, 5);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Stijve fase
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Stijve fase',
    'De pijn neemt geleidelijk af, maar de schouder voelt nu duidelijk stijf en beperkt in beweging. Dit is het moment om, nu de pijn dat toelaat, geleidelijk meer rek en mobiliteit op te bouwen.',
    'Maand 3-9 (indicatief)',
    array['Plotselinge, forse rek', 'Bovenhoofdse belasting met gewicht', 'Trainen door een duidelijke pijnpiek heen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Rustpijn duidelijk minder dan in fase 1', 0),
    (v_phase, 'Stokoefeningen dagelijks uit te voeren met acceptabele stretch-sensatie', 1),
    (v_phase, 'Merkbare, langzame toename van bewegingsuitslag over de weken', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste meetbare toename in armheffing', 0),
    (v_phase, 'Dagelijkse taken zoals aankleden iets makkelijker geworden', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Nu de pijn zakt, is stretchen aan de beurt',
     'In de stijve fase is de pijn minder dominant, maar de schouder is nu het stijfst. Dit is de fase waarin geleidelijke, consequente stretchoefeningen het meeste verschil maken. Zoek een lichte, aanhoudende rek op, geen scherpe pijn. Vooruitgang gaat hier in kleine stapjes over weken, niet over dagen, en dat is normaal bij deze aandoening.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Stijve fase, bevroren schouder') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Stokoefening flexie', 'rekken', 'Actief-passieve mobiliteitsoefening met een stok om de armheffing geleidelijk te vergroten.', 'Houd een stok met beide handen vast, breedte iets meer dan schouderbreedte. Duw met de gezonde arm de aangedane arm rustig omhoog tot een duidelijke maar draaglijke rek.', 3, 10, array['schouder', 'frozen shoulder', 'rekken', 'stijve fase'])
  returning id into v_ex_bs_stokoefening_flexie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Stokoefening buitenrotatie', 'rekken', 'Rekoefening gericht op de buitenrotatie van de schouder, vaak een van de meest beperkte richtingen bij frozen shoulder.', 'Houd de bovenarm tegen het lichaam met de elleboog in 90 graden. Duw met een stok de onderarm van de aangedane kant naar buiten tot een duidelijke rek.', 3, 10, array['schouder', 'frozen shoulder', 'rekken', 'stijve fase'])
  returning id into v_ex_bs_stokoefening_buitenrot;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Handdoekrek achter de rug', 'rekken', 'Rekoefening voor binnenrotatie en reiken achter de rug, een veelvoorkomende beperking bij frozen shoulder.', 'Houd een handdoek vast met de ene hand achter de rug van onderen en de andere hand van boven over de schouder. Trek voorzichtig de handdoek omhoog tot een duidelijke rek.', 2, 20, array['schouder', 'frozen shoulder', 'rekken', 'stijve fase'])
  returning id into v_ex_bs_handdoekrek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Wall slides', 'mobiliteit', 'Gecontroleerde glijdende mobiliteitsoefening langs de muur voor actieve armheffing.', 'Sta met de rug van de handen tegen een muur op schouderhoogte. Glijd de armen rustig omhoog langs de muur zo ver als comfortabel voelt en laat weer zakken.', 3, 10, array['schouder', 'frozen shoulder', 'mobiliteit'])
  returning id into v_ex_bs_wallslides;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps) values
    (v_schedule, v_ex_bs_stokoefening_flexie, 0, 3, 10),
    (v_schedule, v_ex_bs_stokoefening_buitenrot, 1, 3, 10),
    (v_schedule, v_ex_bs_wallslides, 2, 3, 10);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_bs_handdoekrek, 3, 2, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Ontdooifase
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Ontdooifase',
    'De beweeglijkheid keert geleidelijk terug. Nu is de fase om, samen met verdere mobiliteit, actief kracht op te bouwen richting volledig, pijnvrij functioneren.',
    'Maand 9-12+ (indicatief)',
    array['Te snel terug naar volledige belasting bij aanhoudende stijfheid'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Bewegingsuitslag dicht bij die van de andere schouder', 0),
    (v_phase, 'Lichte weerstandsoefeningen pijnvrij uit te voeren', 1),
    (v_phase, 'Dagelijkse activiteiten, inclusief reiken boven schouderhoogte, weer mogelijk', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Bovenhoofds reiken weer mogelijk zonder pijn', 0),
    (v_phase, 'Kracht merkbaar toegenomen ten opzichte van de stijve fase', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Van mobiliteit naar kracht, met behoud van geduld',
     'In de ontdooifase neemt de stijfheid geleidelijk af en wordt het tijd om ook weer kracht op te bouwen, naast het onderhouden van de mobiliteit die je hebt teruggewonnen. Ook in deze fase kan herstel nog maanden duren voordat de schouder volledig als vanouds aanvoelt. Blijf de oefeningen consequent doen, ook als de vooruitgang soms traag lijkt te gaan.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Ontdooifase, bevroren schouder') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Schouder binnenrotatie met band', 'kracht', 'Krachtoefening voor de binnenrotatoren van de schouder, opgebouwd nu de mobiliteit is teruggekeerd.', 'Bevestig een lichte weerstandsband op ellebooghoogte. Houd de elleboog tegen het lichaam en trek de onderarm naar binnen, gecontroleerd terug.', 3, 12, 'Lichte weerstandsband', array['schouder', 'frozen shoulder', 'kracht', 'ontdooifase'])
  returning id into v_ex_bs_binnenrot_band;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Schouder buitenrotatie met band', 'kracht', 'Krachtoefening voor de buitenrotatoren van de schouder, belangrijk voor een stabiele schoudergordel.', 'Bevestig een lichte weerstandsband op ellebooghoogte. Houd de elleboog tegen het lichaam en trek de onderarm naar buiten, gecontroleerd terug.', 3, 12, 'Lichte weerstandsband', array['schouder', 'frozen shoulder', 'kracht', 'ontdooifase'])
  returning id into v_ex_bs_buitenrot_band;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Scapula retractie', 'kracht', 'Versterkt de schouderbladstabilisatoren, ondersteunt een goede uitgangspositie voor schouderbewegingen.', 'Knijp de schouderbladen rustig naar elkaar toe en naar beneden, houd twee seconden vast en ontspan.', 3, 12, array['schouder', 'frozen shoulder', 'kracht', 'scapula'])
  returning id into v_ex_bs_scapula;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bovenhoofds reiken en plaatsen', 'kracht', 'Functionele oefening die bovenhoofds reiken traint zoals nodig bij dagelijkse activiteiten.', 'Til een licht voorwerp van een lage plank naar een hogere plank op ooghoogte en weer terug, in een gecontroleerd tempo.', 3, 10, 'Licht voorwerp', array['schouder', 'frozen shoulder', 'functioneel', 'ontdooifase'])
  returning id into v_ex_bs_bovenhoofds_reiken;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_bs_binnenrot_band, 0, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_bs_buitenrot_band, 1, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_bs_scapula, 2, 3, 12, null),
    (v_schedule, v_ex_bs_bovenhoofds_reiken, 3, 3, 10, 'Licht voorwerp');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 3: Achillespees-tendinopathie, 3 fases, minimaal 12 weken
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'achilles_tendinopathy', 'Herstelplan achillespees-tendinopathie',
    'Herstelprogramma bij achillespees-tendinopathie (overbelastingsklachten van de achillespees, veelvoorkomend bij hardlopers), opgebouwd van pijnmanagement met isometrische belasting, via zware, langzame en excentrische belasting, naar een gestructureerde terugkeer naar hardlopen. Dit is geen protocol voor een acute achillespeesruptuur: plotselinge, scherpe pijn met het onvermogen om af te zetten vraagt om directe medische beoordeling. Vaak een langzaam herstellende blessure die minimaal 12 weken en geduld en consistentie vraagt.',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijn- en belastingmanagement
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijn- en belastingmanagement',
    'Pijn verminderen met isometrische belasting en de trainingsbelasting tijdelijk aanpassen, zonder de pees volledig te ontlasten.',
    'Week 0-3',
    array['Hardlopen', 'Springen', 'Heuvel- of trappentraining', 'Volledig stoppen met alle belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Ochtendstijfheid van de achillespees duidelijk verminderd', 0),
    (v_phase, 'Isometrische kuitoefening uit te voeren met acceptabele pijn (niet toenemend nadien)', 1),
    (v_phase, 'Dagelijkse activiteiten mogelijk zonder duidelijke pijntoename', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije ochtend na het opstaan', 0),
    (v_phase, 'Isometrische oefeningen dagelijks volgehouden', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Belangrijk: dit is geen protocol voor een acute achillespeesruptuur',
     'Achillespees-tendinopathie ontstaat geleidelijk door overbelasting en voelt aan als aanhoudende pijn en stijfheid, vooral in de ochtend of na een pauze. Dit is iets anders dan een achillespeesruptuur: bij een plotselinge, scherpe pijn (vaak beschreven als een schop tegen de kuit) waarbij je niet meer op de tenen kunt afzetten, is dit protocol niet van toepassing en is directe medische beoordeling nodig. Bij overbelastingsklachten helpt volledige rust meestal niet: isometrische oefeningen (aanspannen zonder beweging) verminderen vaak juist de pijn en houden de pees actief belast op een verdraagbaar niveau.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijnmanagement, achillespees-tendinopathie') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Isometrische kuitaanspanning', 'kracht', 'Statische kuitoefening die vaak op korte termijn pijn vermindert bij achillespeesklachten.', 'Sta op de tenen op de rand van een trede of tegen een muur en houd deze positie aan zonder te bewegen, op een intensiteit die duidelijk voelbaar maar draaglijk is.', 5, 45, 'Lichaamsgewicht', array['achillespees', 'kracht', 'isometrisch', 'pijnfase'])
  returning id into v_ex_at_isometrisch_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Fietsen op hometrainer', 'conditie', 'Laagbelaste conditievorm die de achillespees minder belast dan hardlopen, geschikt tijdens de vroege fase.', 'Fiets op een lichte tot matige weerstand in een rustig tempo, bouw duur geleidelijk op naarmate de pijn het toelaat.', null, 900, array['achillespees', 'conditie', 'laagbelast'])
  returning id into v_ex_at_fietsen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkelmobiliteit (dorsaalflexie)', 'mobiliteit', 'Zachte mobiliteitsoefening voor de enkel, ondersteunt een goede belastingsverdeling op de achillespees.', 'Zit of sta en buig de voet rustig zo ver mogelijk omhoog richting het scheenbeen, zonder pijn te forceren, en ontspan weer.', 2, 15, array['achillespees', 'mobiliteit', 'enkel'])
  returning id into v_ex_at_mobiliteit_enkel;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_at_isometrisch_kuit, 0, 5, 45, 'Lichaamsgewicht');
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps) values
    (v_schedule, v_ex_at_mobiliteit_enkel, 1, 2, 15);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds) values
    (v_schedule, v_ex_at_fietsen, 2, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Zware, langzame en excentrische belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Zware, langzame en excentrische belasting',
    'De kern van het herstel: geleidelijk opbouwende excentrische en zware, langzame belastingsoefeningen voor de kuit en achillespees, de in de literatuur best onderbouwde aanpak bij deze blessure.',
    'Week 3-9',
    array['Hardlopen', 'Springen en plyometrie', 'Snelle richtingsveranderingen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Excentrische hakoefeningen uit te voeren met acceptabele, niet-toenemende pijn', 0),
    (v_phase, 'Ochtendstijfheid grotendeels verdwenen', 1),
    (v_phase, 'Enkelbenige tenenheffen mogelijk met redelijke controle', 2),
    (v_phase, 'Geleidelijke toename van belastbaarheid over de weken merkbaar', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste week volledig excentrisch programma volgehouden', 0),
    (v_phase, 'Wandelen zonder enige achillespeesklachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom zware, langzame belasting hier zo goed werkt',
     'Excentrische kuitoefeningen (zoals de bekende hak-zak-oefening) en zware, langzame weerstandstraining zijn de best onderbouwde behandelvorm bij achillespees-tendinopathie. Deze oefeningen belasten de pees geleidelijk zwaarder, wat het weefsel stimuleert om sterker te worden. Enige spanning of milde pijn tijdens de oefening is vaak acceptabel, zolang deze niet aanhoudt of duidelijk toeneemt de dag erna. Consistentie is hier belangrijker dan snelheid: dit is een programma van weken, niet van dagen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Zware langzame en excentrische belasting, achillespees') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische hakoefening, gestrekte knie', 'kracht', 'Klassieke excentrische kuitoefening (Alfredson-protocol) met gestrekte knie, gericht op de gastrocnemius.', 'Ga op de tenen staan op de rand van een trede met gestrekte knie, verplaats het gewicht naar het aangedane been en laat de hiel langzaam zakken tot onder de trede. Gebruik de andere voet om weer omhoog te komen.', 3, 15, 'Lichaamsgewicht', array['achillespees', 'kracht', 'excentrisch'])
  returning id into v_ex_at_excentrisch_gestrekt;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische hakoefening, gebogen knie', 'kracht', 'Excentrische kuitoefening met gebogen knie, gericht op de diepere soleusspier.', 'Herhaal de excentrische hakoefening met een licht gebogen knie gedurende de hele beweging, om ook de soleusspier gericht te belasten.', 3, 15, 'Lichaamsgewicht', array['achillespees', 'kracht', 'excentrisch'])
  returning id into v_ex_at_excentrisch_gebogen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Tenenheffen op twee benen, langzaam', 'kracht', 'Zware, langzame belastingsoefening voor de kuitspieren op beide benen, opbouw richting eenbenige belasting.', 'Sta op beide voeten en kom langzaam omhoog op de tenen, houd kort vast en laat in drie tot vier seconden weer zakken.', 3, 12, 'Lichaamsgewicht, eventueel extra gewicht', array['achillespees', 'kracht', 'zware langzame belasting'])
  returning id into v_ex_at_heffen_dubbel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Tenenheffen op één been, langzaam', 'kracht', 'Progressie van de tweebenige variant, verhoogt de belasting op de aangedane achillespees.', 'Sta op één been en kom langzaam omhoog op de tenen, houd kort vast en laat in drie tot vier seconden weer zakken. Gebruik lichte steun voor balans indien nodig.', 3, 10, 'Lichaamsgewicht', array['achillespees', 'kracht', 'zware langzame belasting'])
  returning id into v_ex_at_heffen_enkel;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_at_excentrisch_gestrekt, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_at_excentrisch_gebogen, 1, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_at_heffen_dubbel, 2, 3, 12, 'Lichaamsgewicht, eventueel extra gewicht'),
    (v_schedule, v_ex_at_heffen_enkel, 3, 3, 10, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Terugkeer naar hardlopen en sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar hardlopen en sport',
    'Een gestructureerde, geleidelijke opbouw van hardloopvolume en, waar relevant, plyometrische belasting, met behoud van het krachtprogramma als onderhoud.',
    'Week 9-12+',
    array['Grote sprongen in hardloopvolume of -snelheid', 'Meteen terug naar het oude trainingsschema'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Eenbenige tenenheffen krachtig en gecontroleerd uit te voeren', 0),
    (v_phase, 'Wandelen en stevig doorlopen volledig klachtenvrij', 1),
    (v_phase, 'Eerste hardloopblokken zonder toename van klachten de dag erna', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie volgens opbouwschema afgerond', 0),
    (v_phase, 'Trainingsvolume van vóór de klachten weer benaderd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen voorkomt terugval',
     'Bouw het hardloopvolume gestructureerd op, bijvoorbeeld door eerst korte, rustige blokken te wisselen met wandelen en pas daarna geleidelijk afstand en tempo te verhogen. Een te snelle sprong in belasting is een van de meest voorkomende oorzaken van terugval bij achillespeesklachten. Blijf ook na terugkeer naar hardlopen het kracht- en belastingsprogramma twee keer per week onderhouden.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar hardlopen, achillespees') returning id into v_schedule;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Hardlopen, opbouwschema', 'conditie', 'Gestructureerde opbouw van hardloopvolume met afwisseling van lopen en wandelen, aangepast op het klachtenniveau.', 'Volg een opbouwschema dat rustige loopintervallen afwisselt met wandelpauzes, en verhoog de looptijd pas verder als de vorige stap klachtenvrij verliep.', null, 1200, array['achillespees', 'hardlopen', 'opbouw'])
  returning id into v_ex_at_hardlopen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Lage plyometrie, hinkelpasjes', 'kracht', 'Introductie van elastische, veerkrachtige belasting van de achillespees als voorbereiding op sportspecifieke sprongbelasting.', 'Voer korte, lage hinkelpasjes uit op een zachte ondergrond, met controle over de landing en zonder pijn nadien.', 3, 8, 'Lichaamsgewicht', array['achillespees', 'plyometrie', 'sportspecifiek'])
  returning id into v_ex_at_plyometrie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Onderhoud kuitkracht', 'kracht', 'Onderhoudsversie van het krachtprogramma om de achillespees ook na terugkeer naar hardlopen belastbaar te houden.', 'Voer twee keer per week een kort blok eenbenig en tweebenig tenenheffen uit, als onderhoud naast de hardlooptraining.', 3, 12, 'Lichaamsgewicht, eventueel extra gewicht', array['achillespees', 'kracht', 'onderhoud'])
  returning id into v_ex_at_onderhoud_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Tempo- en sprintopbouw', 'conditie', 'Geleidelijke introductie van snellere looppassages binnen de duurloop, als voorbereiding op wedstrijd- of trainingsintensiteit.', 'Alleen toevoegen als de basisopbouw van hardlopen volledig klachtenvrij verloopt. Bouw snelheid rustig op en vermijd abrupte sprints.', 900, array['achillespees', 'hardlopen', 'conditie'])
  returning id into v_ex_at_sprint_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Sprong-voor-afstand test (functionele symmetrie)', 'stabiliteit', 'Functionele test die de belastbaarheid en symmetrie van de achillespees onder sprongbelasting meet.', 'Spring op één been zo ver mogelijk naar voren en land gecontroleerd op hetzelfde been. Vergelijk de afgelegde afstand met het andere been.', 2, 3, array['achillespees', 'stabiliteit', 'test'])
  returning id into v_ex_at_hoptest;

  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds) values
    (v_schedule, v_ex_at_hardlopen_opbouw, 0, 1200),
    (v_schedule, v_ex_at_sprint_opbouw, 3, 900);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_at_plyometrie, 1, 3, 8, 'Lichaamsgewicht'),
    (v_schedule, v_ex_at_onderhoud_kuit, 2, 3, 12, 'Lichaamsgewicht, eventueel extra gewicht');
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps) values
    (v_schedule, v_ex_at_hoptest, 4, 2, 3);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

notify pgrst, 'reload schema';
