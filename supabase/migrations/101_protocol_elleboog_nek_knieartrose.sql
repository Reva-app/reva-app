-- 101_protocol_elleboog_nek_knieartrose.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Eerste herstelplannen voor drie van de veertien nieuwe injury_category-
-- waarden uit migratie 097: elbow_tendinopathy, neck_pain_chronic en
-- knee_osteoarthritis. Voor deze drie categorieen bestond nog geen enkel
-- protocol. NIET geverifieerd door een bevoegd fysiotherapeut,
-- clinically_reviewed blijft false, mag niet aan echte patienten worden
-- toegewezen totdat een fysiotherapeut de inhoud heeft gecontroleerd.
-- ============================================================================
--
-- Elleboogklachten (elbow_tendinopathy): gemodelleerd als een generiek
-- peesoverbelastingsprotocol van de onderarmspieren rond de elleboog, van
-- toepassing op zowel de laterale variant (tennisarm, buitenzijde, de
-- polsstrekkers) als de mediale variant (golferselleboog, binnenzijde, de
-- polsbuigers). De opbouw volgt de in de literatuur breed onderbouwde route
-- isometrisch, dan isotoon, dan excentrisch belasten. Bewust een traag en
-- soms hardnekkig traject (8-12 weken), dat wordt ook in de educatie benoemd.
--
-- Chronische nekklachten (neck_pain_chronic): een langdurig, niet-traumatisch
-- beloop (houding, werkplek, spanning), nadrukkelijk anders van aard dan een
-- acuut trauma (er bestaat in deze app nog geen aparte acute-nekcategorie).
-- Aandacht voor houding/ergonomie en beeldschermwerk als onderhoudende
-- factor, met een opbouw van pijnmanagement naar diepe nekflexor- en
-- scapulaire kracht naar functioneel herstel met onderhoudsroutine.
--
-- Knieartrose (knee_osteoarthritis): een chronische, degeneratieve aandoening
-- die uitdrukkelijk wordt behandeld als iets om te managen, niet als een
-- traject met een eindpunt, en nadrukkelijk geen post-operatief traject (dat
-- bestaat al apart voor ACL/meniscus/MCL/knieprothese). Quadricepskracht is
-- de best onderbouwde interventie en staat centraal, aangevuld met
-- laagimpact conditie (fietsen, zwemmen) en een langdurige
-- onderhoudsfase die expliciet als doorlopend wordt geframed.
--
-- Alle oefeningen in deze drie protocollen zijn nieuw aangemaakt en niet
-- hergebruikt uit de bestaande gedeelde oefeningenbibliotheek.

do $$
declare
  -- ── Elleboogklachten: nieuwe oefeningen ─────────────────────────────────
  v_ex_eb_isom_ext uuid;
  v_ex_eb_isom_flex uuid;
  v_ex_eb_rek_ext uuid;
  v_ex_eb_rek_flex uuid;
  v_ex_eb_iso_ext uuid;
  v_ex_eb_iso_flex uuid;
  v_ex_eb_pronsup uuid;
  v_ex_eb_grip uuid;
  v_ex_eb_eccentric_ext uuid;
  v_ex_eb_eccentric_flex uuid;
  v_ex_eb_functioneel_grip uuid;
  v_ex_eb_sportspecifiek uuid;
  v_ex_eb_flexbar_twist uuid;
  v_ex_eb_progressieve_last uuid;

  -- ── Chronische nekklachten: nieuwe oefeningen ───────────────────────────
  v_ex_nek_kinknik uuid;
  v_ex_nek_zijwaartse_rek uuid;
  v_ex_nek_rotatie_rek uuid;
  v_ex_nek_schouderrollen uuid;
  v_ex_nek_deep_flexor_hold uuid;
  v_ex_nek_scapula_retractie uuid;
  v_ex_nek_borstwervel_mob uuid;
  v_ex_nek_isometrisch uuid;
  v_ex_nek_functioneel uuid;
  v_ex_nek_onderhoud uuid;
  v_ex_nek_rotatie_weerstand uuid;
  v_ex_nek_houding_zelfcontrole uuid;

  -- ── Knieartrose: nieuwe oefeningen ──────────────────────────────────────
  v_ex_koa_quad_isometrisch uuid;
  v_ex_koa_wandelen uuid;
  v_ex_koa_rek_kuit uuid;
  v_ex_koa_rek_hamstring uuid;
  v_ex_koa_wandzit uuid;
  v_ex_koa_minisquat uuid;
  v_ex_koa_stepup uuid;
  v_ex_koa_beenpers uuid;
  v_ex_koa_hometrainer uuid;
  v_ex_koa_zwemmen uuid;
  v_ex_koa_balans uuid;
  v_ex_koa_onderhoud uuid;
  v_ex_koa_traplopen_onderhoud uuid;
  v_ex_koa_zwemmen_onderhoud uuid;
  v_ex_koa_vrije_activiteit uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Elleboogklachten (tennis-/golferselleboog): 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Isometrische polsstrekking', 'kracht',
     'Houd de pols in een neutrale, licht gestrekte positie stilstaand aangespannen tegen weerstand, zonder de pols te bewegen.',
     'Voor tennisarm (buitenzijde): duw met de handpalm naar boven tegen een vaste weerstand of tafelrand. Bouw rustig op in intensiteit, isometrische belasting werkt in de vroege fase vaak pijnverlichtend.', 5, 45, 'Lichte tot matige weerstand, geen beweging', array['elleboog', 'pols', 'kracht'])
    returning id into v_ex_eb_isom_ext;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Isometrische polsbuiging', 'kracht',
     'Houd de pols in een neutrale, licht gebogen positie stilstaand aangespannen tegen weerstand, zonder de pols te bewegen.',
     'Voor golferselleboog (binnenzijde): duw met de handpalm naar beneden tegen een vaste weerstand of tafelrand. Bouw rustig op in intensiteit.', 5, 45, 'Lichte tot matige weerstand, geen beweging', array['elleboog', 'pols', 'kracht'])
    returning id into v_ex_eb_isom_flex;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Rek onderarm strekspieren', 'rekken',
     'Strek de arm, buig de pols naar de binnenkant van de onderarm met de andere hand tot een lichte rek aan de buitenzijde van de elleboog voelbaar is.',
     'Relevant bij tennisarm. Houd de rek rustig vast en forceer niet door pijn heen.', 3, 20, array['elleboog', 'rekken', 'thuis'])
    returning id into v_ex_eb_rek_ext;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Rek onderarm buigspieren', 'rekken',
     'Strek de arm, buig de pols naar de buitenkant van de onderarm met de andere hand tot een lichte rek aan de binnenzijde van de elleboog voelbaar is.',
     'Relevant bij golferselleboog. Houd de rek rustig vast en forceer niet door pijn heen.', 3, 20, array['elleboog', 'rekken', 'thuis'])
    returning id into v_ex_eb_rek_flex;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Polsstrekking met licht gewicht', 'kracht',
     'Zittend, onderarm ondersteund op een tafel met de handpalm naar beneden, de pols langzaam strekken en weer laten zakken.',
     'Voor tennisarm. Beweeg traag en gecontroleerd, gebruik een licht gewicht of dumbbell.', 3, 12, 'Licht gewicht (0,5-1 kg)', array['elleboog', 'pols', 'kracht'])
    returning id into v_ex_eb_iso_ext;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Polsbuiging met licht gewicht', 'kracht',
     'Zittend, onderarm ondersteund op een tafel met de handpalm naar boven, de pols langzaam buigen en weer laten zakken.',
     'Voor golferselleboog. Beweeg traag en gecontroleerd, gebruik een licht gewicht of dumbbell.', 3, 12, 'Licht gewicht (0,5-1 kg)', array['elleboog', 'pols', 'kracht'])
    returning id into v_ex_eb_iso_flex;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Onderarm pronatie en supinatie met gewicht', 'kracht',
     'Onderarm ondersteund op een tafel, pols in het verlengde, de onderarm langzaam draaien van handpalm omhoog naar handpalm omlaag met een licht gewicht in de hand.',
     'Houd de beweging traag en gecontroleerd, dit traint de dieper gelegen onderarmspieren die de elleboog mede stabiliseren.', 3, 12, 'Licht gewicht of hamer aan een kant', array['elleboog', 'onderarm', 'kracht'])
    returning id into v_ex_eb_pronsup;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Handknijp training', 'kracht',
     'Knijp met de hand rustig en gecontroleerd in een grip trainer of stressbal, houd kort vast en ontspan weer.',
     'Bouw de weerstand van de grip trainer geleidelijk op naarmate de klachten afnemen.', 3, 15, 'Grip trainer of stressbal, lichte weerstand', array['elleboog', 'grip', 'kracht'])
    returning id into v_ex_eb_grip;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische polsstrekking', 'kracht',
     'Til de pols met de gezonde hand actief omhoog naar gestrekte positie, laat vervolgens de pols met het aangedane been langzaam en gecontroleerd zakken tegen de zwaartekracht in.',
     'Voor tennisarm. De nadruk ligt op het langzame, controleerde laten zakken (excentrische fase), dit is het meest onderbouwde onderdeel van pees-revalidatie.', 3, 15, 'Licht tot matig gewicht', array['elleboog', 'pols', 'kracht', 'excentrisch'])
    returning id into v_ex_eb_eccentric_ext;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische polsbuiging', 'kracht',
     'Til de pols met de gezonde hand actief omhoog naar gebogen positie, laat vervolgens de pols met het aangedane been langzaam en gecontroleerd zakken tegen de zwaartekracht in.',
     'Voor golferselleboog. De nadruk ligt op het langzame, gecontroleerde laten zakken (excentrische fase).', 3, 15, 'Licht tot matig gewicht', array['elleboog', 'pols', 'kracht', 'excentrisch'])
    returning id into v_ex_eb_eccentric_flex;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Functionele grip- en tiltraining', 'kracht',
     'Loop een korte afstand terwijl je in elke hand een gewicht draagt, met een rechte pols en ontspannen schouders.',
     'Bouw het gewicht en de afstand rustig op. Dit traint de grip en onderarm in een functionele, dagelijkse context.', 3, 30, 'Matig gewicht per hand', array['elleboog', 'grip', 'functioneel'])
    returning id into v_ex_eb_functioneel_grip;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke slagbeweging opbouw', 'conditie',
     'Bouw de sport- of werkspecifieke beweging (bijvoorbeeld een tennisslag, golfswing of gereedschapsgebruik) stap voor stap op in intensiteit en volume.',
     'Start rustig en zonder volle kracht, verhoog pas als de vorige stap zonder toename van klachten is verlopen.', 1, 900, array['elleboog', 'sport', 'functioneel'])
    returning id into v_ex_eb_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische onderarmrotatie (flexbar twist)', 'kracht',
     'Houd een flexibele staaf of stevig opgerolde handdoek met beide handen vast, draai deze actief met de gezonde hand en laat de aangedane pols de rotatie langzaam en gecontroleerd terugdraaien.',
     'De nadruk ligt op het langzame, gecontroleerde terugdraaien met de aangedane arm. Een bekende, effectieve excentrische oefening bij zowel tennisarm als golferselleboog.', 3, 10, 'Flexbar of stevig opgerolde handdoek', array['elleboog', 'pols', 'kracht', 'excentrisch'])
    returning id into v_ex_eb_flexbar_twist;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Progressieve draagbelasting op afstand', 'kracht',
     'Loop een geleidelijk langere afstand terwijl je in elke hand een iets zwaarder gewicht draagt dan in de vorige fase, met een rechte pols.',
     'Bouw gewicht en afstand in kleine stappen op, als voorbereiding op de volledige grip- en tilbelasting van fase 4.', 3, 45, 'Matig tot zwaar gewicht per hand', array['elleboog', 'grip', 'functioneel'])
    returning id into v_ex_eb_progressieve_last;

  -- ── Protocol ─────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'elbow_tendinopathy', 'Herstelplan elleboogklachten (tennis-/golferselleboog)',
    'Herstelplan voor peesoverbelasting van de onderarmspieren rond de elleboog, van toepassing op zowel tennisarm (laterale epicondylalgie, buitenzijde) als golferselleboog (mediale epicondylalgie, binnenzijde). De opbouw volgt de stappen isometrisch, isotoon en excentrisch belasten. Dit is vaak een traag en soms hardnekkig herstel, reken op ongeveer 8-12 weken.',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijn en belasting reduceren
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijn en belasting reduceren',
    'De belastende activiteiten (grijpen, tillen, herhaaldelijke polsbewegingen) tijdelijk aanpassen en starten met pijnverlichtende isometrische belasting.',
    'Week 0-2',
    array['Zwaar tillen met de aangedane arm', 'Langdurig, herhaaldelijk grijpen of knijpen', 'Sport- of werkbeweging die de klachten uitlokt', 'Massage of drukbelasting direct op de pijnlijke plek'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn in rust duidelijk afgenomen', 0),
    (v_phase, 'Isometrische oefeningen uitvoerbaar zonder toename van pijn', 1),
    (v_phase, 'Dagelijkse, lichte handelingen weer mogelijk', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste isometrische oefening zonder pijntoename', 0),
    (v_phase, 'Belastende activiteit succesvol aangepast', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Tennisarm en golferselleboog: hetzelfde principe, andere kant',
     'Tennisarm en golferselleboog zijn beide een overbelasting van de peesaanhechting bij de elleboog, alleen aan tegenovergestelde zijden: tennisarm aan de buitenzijde (de polsstrekkers), golferselleboog aan de binnenzijde (de polsbuigers). Dit herstelplan bevat oefeningen voor beide varianten, kies steeds de kant die bij jouw klacht past. Dit is doorgaans een geleidelijk herstel dat weken tot maanden kan duren, ook als de pijn eerder terugkomt dan verwacht is dat geen teken dat er iets stuk is.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: pijn en belasting elleboog') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_eb_isom_ext, 0, 5, 45, 'Lichte weerstand, kies de pijnlijke zijde'),
    (v_schedule, v_ex_eb_isom_flex, 1, 5, 45, 'Lichte weerstand, kies de pijnlijke zijde'),
    (v_schedule, v_ex_eb_rek_ext, 2, 3, 20, null),
    (v_schedule, v_ex_eb_rek_flex, 3, 3, 20, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Isometrische naar isotone belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Isometrische naar isotone belasting',
    'De belasting geleidelijk opbouwen van stilstaand aanspannen naar bewegend (isotoon) kracht opbouwen door het volledige polsbewegingstraject.',
    'Week 2-6',
    array['Sport- of werkbeweging die de klachten uitlokt', 'Plotselinge zware belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Isotone oefeningen uitvoerbaar zonder toename van pijn de volgende dag', 0),
    (v_phase, 'Gripkracht merkbaar verbeterd', 1),
    (v_phase, 'Lichte dagelijkse tilhandelingen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste isotone training afgerond', 0),
    (v_phase, 'Grip merkbaar sterker', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Een beetje pijn tijdens de oefening is oké',
     'Bij peesklachten is lichte, stabiele pijn tijdens het trainen (die niet toeneemt en de volgende dag weer weg is) doorgaans geen probleem en soms zelfs onderdeel van een gezonde belastingsopbouw. Neemt de pijn toe na de oefening of blijft die de volgende dag duidelijk aanwezig, bouw dan een stap terug in gewicht of herhalingen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Isotone opbouw elleboog') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_eb_iso_ext, 0, 3, 12, 'Licht gewicht, kies de pijnlijke zijde'),
    (v_schedule, v_ex_eb_iso_flex, 1, 3, 12, 'Licht gewicht, kies de pijnlijke zijde'),
    (v_schedule, v_ex_eb_pronsup, 2, 3, 12, 'Licht gewicht'),
    (v_schedule, v_ex_eb_grip, 3, 3, 15, 'Lichte weerstand');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Excentrische belasting en functionele grip
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Excentrische belasting en functionele grip',
    'Excentrische polsbelasting toevoegen, het meest onderbouwde onderdeel van pees-revalidatie, en de grip functioneel belasten.',
    'Week 6-10',
    array['Plotselinge maximale krachtsbelasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Excentrische oefeningen uitvoerbaar met matig gewicht', 0),
    (v_phase, 'Functionele tiltraining zonder klachten', 1),
    (v_phase, 'Gripkracht dicht bij de andere zijde', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste excentrische training afgerond', 0),
    (v_phase, 'Functionele til- en draaghandeling pijnvrij', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Excentrisch trainen is de kern van pees-herstel',
     'Excentrische training, waarbij de pees onder controle wordt uitgerekt terwijl hij belast wordt, is het meest onderzochte en effectieve onderdeel van herstel bij peesklachten zoals tennisarm en golferselleboog. Blijf de nadruk leggen op de langzame, gecontroleerde beweging in plaats van op het totale gewicht.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Excentrische belasting elleboog') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_eb_eccentric_ext, 0, 3, 15, null, 'Licht tot matig gewicht, kies de pijnlijke zijde'),
    (v_schedule, v_ex_eb_eccentric_flex, 1, 3, 15, null, 'Licht tot matig gewicht, kies de pijnlijke zijde'),
    (v_schedule, v_ex_eb_functioneel_grip, 2, 3, null, 30, 'Matig gewicht per hand'),
    (v_schedule, v_ex_eb_rek_ext, 3, 3, null, 20, null),
    (v_schedule, v_ex_eb_flexbar_twist, 4, 3, 10, null, 'Flexbar of stevig opgerolde handdoek'),
    (v_schedule, v_ex_eb_progressieve_last, 5, 3, null, 45, 'Matig tot zwaar gewicht per hand');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar volledige grip en activiteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar volledige grip en activiteit',
    'Sport- of werkspecifieke bewegingen geleidelijk opbouwen naar volledige belasting, met behoud van een onderhoudsroutine.',
    'Week 10-12',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Gripkracht symmetrisch met de andere zijde', 0),
    (v_phase, 'Sport- of werkspecifieke beweging op volle intensiteit zonder klachten', 1),
    (v_phase, 'Geen pijn meer bij dagelijkse activiteiten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training of werkdag hervat', 0),
    (v_phase, 'Terug op het oude niveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden na terugkeer',
     'Peesklachten aan de elleboog keren regelmatig terug als de kracht- en rekoefeningen na herstel volledig worden gestaakt. Blijf ook na terugkeer twee keer per week de excentrische en isotone oefeningen doen, dit houdt de pees bestand tegen de belasting van sport of werk.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar activiteit elleboog') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_eb_sportspecifiek, 0, 1, null, 900, null),
    (v_schedule, v_ex_eb_functioneel_grip, 1, 3, null, 30, 'Matig tot zwaar gewicht per hand'),
    (v_schedule, v_ex_eb_grip, 2, 3, 15, null, 'Matige weerstand'),
    (v_schedule, v_ex_eb_eccentric_ext, 3, 3, 15, null, 'Matig gewicht, onderhoud');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Chronische nekklachten: 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Kin tucks (chin tuck)', 'kracht',
     'Trek de kin recht naar achteren, alsof je een dubbele kin maakt, zonder het hoofd te kantelen. Houd kort vast en ontspan weer.',
     'Een kleine, subtiele beweging, de diepe nekflexoren doen het werk, niet de oppervlakkige nekspieren.', 3, 10, array['nek', 'kracht', 'houding'])
    returning id into v_ex_nek_kinknik;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Nekrek zijwaarts', 'rekken',
     'Buig het hoofd rustig zijwaarts richting de schouder tot een lichte rek aan de andere kant van de nek voelbaar is.',
     'Voer de rek rustig en pijnvrij uit, forceer niet.', 2, 20, array['nek', 'rekken', 'thuis'])
    returning id into v_ex_nek_zijwaartse_rek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Nekrek rotatie', 'rekken',
     'Draai het hoofd rustig zijwaarts tot een lichte rek in de nek voelbaar is, houd vast en draai daarna naar de andere kant.',
     'Voer de beweging traag en gecontroleerd uit.', 2, 20, array['nek', 'rekken', 'thuis'])
    returning id into v_ex_nek_rotatie_rek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Schouderrollen', 'mobiliteit',
     'Rol de schouders rustig in een cirkelbeweging naar achteren, gevolgd door een aantal herhalingen naar voren.',
     'Een goede korte oefening tussendoor bij lang zitten of beeldschermwerk.', 2, 10, array['nek', 'schouder', 'mobiliteit'])
    returning id into v_ex_nek_schouderrollen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Diepe nekflexor houding (craniocervical flexion hold)', 'stabiliteit',
     'Lig op je rug, kin licht ingetrokken, en houd deze houding een aantal seconden vast zonder de oppervlakkige nekspieren te gebruiken.',
     'Adem rustig door tijdens het vasthouden. Dit traint specifiek de diepe stabiliserende spieren van de nek.', 3, 10, array['nek', 'stabiliteit', 'houding'])
    returning id into v_ex_nek_deep_flexor_hold;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Scapulaire retractie met band', 'kracht',
     'Houd een elastische band met beide handen op schouderhoogte en trek de schouderbladen naar elkaar toe, houd kort vast en ontspan weer.',
     'Let op een rechte rug en ontspannen nek tijdens de beweging.', 3, 12, 'Lichte weerstandsband', array['nek', 'schouder', 'kracht', 'houding'])
    returning id into v_ex_nek_scapula_retractie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Borstwervelmobilisatie', 'mobiliteit',
     'Zittend op een stoel met de handen achter het hoofd, draai de bovenrug rustig naar één kant en dan naar de andere kant.',
     'Houd het bekken stabiel, de beweging komt uit de bovenrug. Een stijve bovenrug belast vaak de nek extra.', 2, 10, array['nek', 'rug', 'mobiliteit'])
    returning id into v_ex_nek_borstwervel_mob;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Isometrische nekoefening (vier richtingen)', 'kracht',
     'Duw met de hand rustig tegen het voorhoofd, achterhoofd, en beide zijkanten van het hoofd, telkens zonder dat het hoofd meebeweegt.',
     'Bouw de druk rustig op, dit traint de nekspieren stabiel in alle richtingen zonder de nek te belasten met beweging.', 3, 10, array['nek', 'kracht', 'stabiliteit'])
    returning id into v_ex_nek_isometrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Functionele nek- en schouderkracht', 'kracht',
     'Voer roeibewegingen en gecontroleerde nekrotaties tegen lichte weerstand uit, gericht op de bewegingen die in werk of sport worden gebruikt.',
     'Kies bewegingen die aansluiten bij de dagelijkse belasting, bijvoorbeeld beeldschermwerk of het dragen van een tas.', 3, 12, 'Lichte tot matige weerstandsband', array['nek', 'schouder', 'kracht', 'functioneel'])
    returning id into v_ex_nek_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Dagelijkse onderhoudsroutine nek', 'anders',
     'Een korte, vaste routine van kin tucks, scapulaire retracties en een rek, uit te voeren als vast onderdeel van de dag.',
     'Combineer bij voorkeur met een bewegingspauze tijdens langdurig beeldschermwerk.', 1, 300, array['nek', 'onderhoud', 'houding'])
    returning id into v_ex_nek_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Nekrotatie tegen lichte weerstand', 'kracht',
     'Duw met de hand lichte weerstand tegen de zijkant van het hoofd terwijl je de nek langzaam en gecontroleerd probeert te draaien tegen die weerstand in.',
     'Bouw de weerstand rustig op, dit traint de nekspieren functioneel in een gecontroleerde draaibeweging.', 3, 10, 'Lichte handweerstand', array['nek', 'kracht', 'functioneel'])
    returning id into v_ex_nek_rotatie_weerstand;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Houdingscontrole tijdens beeldschermwerk', 'stabiliteit',
     'Zet elk half uur tijdens beeldschermwerk kort bewust de kin tuck en schouderbladpositie in, als geheugensteun voor een goede houding.',
     'Koppel dit bij voorkeur aan een vaste pauzemelding of gewoonte, zodat het geleidelijk een automatisme wordt.', 60, array['nek', 'houding', 'functioneel'])
    returning id into v_ex_nek_houding_zelfcontrole;

  -- ── Protocol ─────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'neck_pain_chronic', 'Herstelplan chronische nekklachten',
    'Herstelplan voor aanhoudende, niet-traumatische nekklachten, bijvoorbeeld door houding, werkplek of langdurig beeldschermwerk. Opgebouwd van pijnmanagement en zachte mobiliteit, via houding en kracht van de diepe nekflexoren en schouderbladspieren, naar functioneel herstel met een blijvende onderhoudsroutine (ca. 8-10 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnmanagement en zachte mobiliteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnmanagement en zachte mobiliteit',
    'De pijn naar een hanteerbaar niveau brengen en voorzichtig de mobiliteit van nek en schouders onderhouden.',
    'Week 0-2',
    array['Langdurig in dezelfde houding zonder pauze', 'Plotselinge, snelle nekbewegingen', 'Zware belasting van nek of schouders'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn verminderd tot een hanteerbaar niveau', 0),
    (v_phase, 'Nek vrij te bewegen binnen een comfortabel bereik', 1),
    (v_phase, 'Geen uitstraling, tintelingen of krachtsverlies in de arm', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste dag met merkbaar minder spanning in de nek', 0),
    (v_phase, 'Volledige, pijnvrije nekrotatie hersteld', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Beeldschermwerk als onderhoudende factor',
     'Bij chronische nekklachten speelt langdurig in dezelfde houding zitten, vaak achter een beeldscherm, meestal een grote rol in het aanhouden van de klachten. Los van de oefeningen in dit plan is regelmatig kort onderbreken van lang zitten, elke 30 tot 60 minuten, een van de meest effectieve dingen die je zelf kunt doen. Zoek medische hulp bij uitstraling, tintelingen of krachtsverlies in de arm, dit hoort niet bij een gewoon nekklachtenbeloop.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: pijnmanagement nek') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_nek_kinknik, 0, 2, 10, null),
    (v_schedule, v_ex_nek_zijwaartse_rek, 1, 2, null, 20),
    (v_schedule, v_ex_nek_rotatie_rek, 2, 2, null, 20),
    (v_schedule, v_ex_nek_schouderrollen, 3, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Houding, ergonomie en kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Houding, ergonomie en kracht',
    'De diepe nekflexoren en schouderbladspieren gericht trainen als basis voor een veerkrachtige nek, met aandacht voor houding en werkplekinrichting.',
    'Week 2-6',
    array['Langdurig in dezelfde houding zonder pauze', 'Zware, ongecontroleerde belasting van de nek'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Diepe nekflexor houding minimaal 10 seconden vol te houden', 0),
    (v_phase, 'Langer zitten mogelijk zonder toename van klachten', 1),
    (v_phase, 'Scapulaire oefeningen uitvoerbaar zonder compensatie', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Werkplek aangepast (beeldschermhoogte, stoel, pauzes)', 0),
    (v_phase, 'Volledige werkdag zonder toename van klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Werkplek en houding actief aanpassen',
     'Zet het beeldscherm op ooghoogte, houd de onderarmen ondersteund, en sta minimaal elk half uur even op. Een goede werkplekinrichting vermindert de belasting op de nek aanzienlijk en versterkt het effect van de oefeningen in deze fase. De diepe nekflexoren en schouderbladspieren zijn de spieren die de nek in een goede houding ondersteunen, gerichte training hiervan is een van de meest onderbouwde interventies bij chronische nekklachten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Houding en kracht nek') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_nek_deep_flexor_hold, 0, 3, null, 10, null),
    (v_schedule, v_ex_nek_scapula_retractie, 1, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_nek_borstwervel_mob, 2, 2, 10, null, null),
    (v_schedule, v_ex_nek_isometrisch, 3, 3, null, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele terugkeer en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele terugkeer en onderhoud',
    'Volledige terugkeer naar werk en dagelijkse activiteiten, met een blijvende, korte onderhoudsroutine ter preventie van terugval.',
    'Week 6-10',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige werkdag of dagelijkse belasting zonder klachten', 0),
    (v_phase, 'Functionele nek- en schouderkracht symmetrisch en voldoende', 1),
    (v_phase, 'Onderhoudsroutine zelfstandig ingebouwd in de week', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Volledige werkweek zonder toename van klachten', 0),
    (v_phase, 'Onderhoudsroutine drie weken achter elkaar volgehouden', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Onderhoud blijft nodig',
     'Chronische nekklachten hebben de neiging terug te keren zodra de oefeningen worden gestaakt, zeker bij aanhoudend beeldschermwerk. Blijf de korte onderhoudsroutine minstens twee tot drie keer per week doen, ook als de klachten volledig weg zijn, dit is geen fase om helemaal af te ronden maar een blijvend onderdeel van je routine.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele terugkeer en onderhoud nek') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_nek_functioneel, 0, 3, 12, null, 'Lichte tot matige weerstandsband'),
    (v_schedule, v_ex_nek_scapula_retractie, 1, 3, 12, null, 'Matige weerstandsband'),
    (v_schedule, v_ex_nek_kinknik, 2, 2, 10, null, null),
    (v_schedule, v_ex_nek_onderhoud, 3, 1, null, 300, null),
    (v_schedule, v_ex_nek_rotatie_weerstand, 4, 3, 10, null, 'Lichte handweerstand'),
    (v_schedule, v_ex_nek_houding_zelfcontrole, 5, null, null, 60, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 3: Knieartrose: 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Quadricepsaanspanning (knieartrose)', 'kracht',
     'Lig of zit met het been gestrekt, span de bovenbeenspier aan door de knie licht in de mat te drukken, houd kort vast en ontspan weer.',
     'Een veilige startoefening, ook bij een pijnlijke of stijve knie meestal goed uitvoerbaar.', 3, 15, array['knie', 'kracht', 'artrose'])
    returning id into v_ex_koa_quad_isometrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Dagelijks wandelen (opbouwschema)', 'conditie',
     'Wandel dagelijks een vaste tijdsduur op een rustig tempo, op een ondergrond die comfortabel aanvoelt voor de knie.',
     'Bouw de duur geleidelijk op. Regelmatig bewegen is bij knieartrose beter dan veel rust, ook op dagen dat de knie wat stijver aanvoelt.', 1, 900, array['knie', 'conditie', 'artrose'])
    returning id into v_ex_koa_wandelen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Kuitrek', 'rekken',
     'Sta met één voet naar achteren, hiel op de grond, en leun met gestrekt been rustig naar voren tot een rek in de kuit voelbaar is.',
     'Houd de rek rustig vast, herhaal aan beide zijden.', 2, 20, array['knie', 'kuit', 'rekken'])
    returning id into v_ex_koa_rek_kuit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Hamstringrek', 'rekken',
     'Zittend met één been gestrekt naar voren, buig rustig voorover vanuit de heup tot een rek aan de achterzijde van het bovenbeen voelbaar is.',
     'Houd de rug zo recht mogelijk, forceer de rek niet.', 2, 20, array['knie', 'hamstring', 'rekken'])
    returning id into v_ex_koa_rek_hamstring;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Wandzit (wall sit)', 'kracht',
     'Leun met de rug tegen een muur en zak door de knieen tot een hoek die comfortabel is, houd deze positie vast.',
     'Kies een hoek waarbij de knie geen scherpe pijn geeft, een lichte spierbrandende vermoeidheid is normaal.', 3, 20, 'Lichaamsgewicht', array['knie', 'kracht', 'artrose'])
    returning id into v_ex_koa_wandzit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Mini squat gecontroleerd', 'kracht',
     'Zak vanuit stand langzaam een klein stukje door de knieen, tot een comfortabele diepte, en kom weer rustig omhoog.',
     'Houd de knieen in lijn met de voeten en ga niet dieper dan comfortabel is.', 3, 12, 'Lichaamsgewicht', array['knie', 'kracht', 'artrose'])
    returning id into v_ex_koa_minisquat;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-up lage opstap', 'kracht',
     'Stap met het aangedane been op een lage opstap of onderste traptrede, kom rustig omhoog en daal weer gecontroleerd af.',
     'Kies een lage opstap zodat de beweging pijnvrij en gecontroleerd blijft.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht', 'artrose'])
    returning id into v_ex_koa_stepup;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Beenpers (leg press) lichte weerstand', 'kracht',
     'Op de beenpers, duw het platform langzaam weg door de knieen te strekken en laat het gecontroleerd weer terugzakken.',
     'Start met lichte weerstand en bouw geleidelijk op, gecontroleerde beweging is belangrijker dan het gewicht.', 3, 12, 'Lichte weerstand, geleidelijk opbouwen', array['knie', 'kracht', 'artrose'])
    returning id into v_ex_koa_beenpers;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Fietsen op hometrainer (lage weerstand)', 'conditie',
     'Fiets op een hometrainer met een lage, comfortabele weerstand en zadel op de juiste hoogte.',
     'Laagimpact conditietraining die de knie nauwelijks belast, ideaal bij knieartrose.', 1, 900, 'Lage weerstand', array['knie', 'conditie', 'artrose'])
    returning id into v_ex_koa_hometrainer;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Zwemmen of aquajoggen', 'conditie',
     'Zwem rustig baantjes of jog in het water, in een tempo dat comfortabel aanvoelt voor de knie.',
     'Het water ondersteunt het lichaamsgewicht, waardoor de knie minder belast wordt dan bij bewegen op het land.', 1, 1200, array['knie', 'conditie', 'artrose', 'water'])
    returning id into v_ex_koa_zwemmen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Balanstraining (eenbenig, met steun)', 'stabiliteit',
     'Sta op het aangedane been met een hand lichte steun bij een stoel of aanrecht, en probeer de balans zo lang mogelijk vast te houden.',
     'Bouw de duur op en verminder de steun geleidelijk als de balans verbetert.', 3, 20, array['knie', 'balans', 'stabiliteit'])
    returning id into v_ex_koa_balans;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Onderhoudsroutine kracht en conditie knieartrose', 'anders',
     'Een vaste, korte combinatie van quadricepskracht, balans en laagimpact conditie, bedoeld om structureel vol te houden.',
     'Deze routine is bedoeld als blijvend onderdeel van je week, niet als iets om na verloop van tijd af te bouwen.', 1, 1200, array['knie', 'onderhoud', 'artrose'])
    returning id into v_ex_koa_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Traplopen functioneel (onderhoud)', 'kracht',
     'Loop in een rustig tempo een aantal keer de trap op en af, met aandacht voor een gecontroleerde afzet en landing.',
     'Een laagdrempelige, functionele oefening die het dagelijkse traplopen makkelijker houdt. Gebruik de leuning zolang gewenst.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht', 'functioneel', 'onderhoud'])
    returning id into v_ex_koa_traplopen_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Zwemmen of aquajoggen (onderhoud)', 'conditie',
     'Zwem rustig baantjes of jog in het water, als vast, laagimpact onderdeel van de wekelijkse onderhoudsroutine.',
     'Blijf dit structureel doen, ook zonder klachten, als aanvulling op de kracht- en balansoefeningen.', 1200, array['knie', 'conditie', 'onderhoud', 'water'])
    returning id into v_ex_koa_zwemmen_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Vrije keuze laagimpact activiteit', 'conditie',
     'Kies een laagimpact activiteit naar voorkeur, zoals wandelen, fietsen of tuinieren, en houd deze een vaste tijd per week vol.',
     'De beste onderhoudsactiviteit is er een die je vol blijft houden, kies daarom bewust iets dat prettig aanvoelt.', 1200, array['knie', 'conditie', 'onderhoud'])
    returning id into v_ex_koa_vrije_activiteit;

  -- ── Protocol ─────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'knee_osteoarthritis', 'Herstelplan knieartrose',
    'Herstelplan voor het managen van knieartrose, een chronische, degeneratieve aandoening. Niet bedoeld voor een post-operatief traject (zie de aparte plannen voor ACL, meniscus, MCL of knieprothese) en niet elke patient met knieartrose heeft of wil een operatie. Opgebouwd van pijnmanagement en activiteitopbouw, via quadricepskracht en laagimpact conditie, naar een langdurige onderhoudsroutine (ca. 10-12 weken gestructureerd programma, met oefeningen die op de lange termijn blijven doorlopen).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnmanagement en activiteit opbouwen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnmanagement en activiteit opbouwen',
    'De pijn naar een hanteerbaar niveau brengen en dagelijks in beweging blijven, zonder de knie volledig te ontzien of juist te overbelasten.',
    'Week 0-3',
    array['Langdurige, volledige rust van de knie', 'Hardlopen of springen bij duidelijke pijntoename', 'Zware belasting zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn verminderd tot een hanteerbaar niveau', 0),
    (v_phase, 'Dagelijks wandelen mogelijk zonder duidelijke pijntoename', 1),
    (v_phase, 'Basisoefeningen uitvoerbaar zonder zwelling achteraf', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste week dagelijks bewogen', 0),
    (v_phase, 'Quadricepsaanspanning goed voelbaar', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bewegen is goed voor een artrotische knie',
     'Het is een veelvoorkomend misverstand dat een knie met artrose zoveel mogelijk ontzien moet worden. Onderzoek laat juist zien dat regelmatig, passend bewogen bewegen de klachten op de lange termijn vermindert en de functie van de knie verbetert. Zowel volledige rust als forceren door pijn heen werkt averechts, het gaat om een balans: actief blijven binnen een niveau dat de volgende dag geen duidelijke pijntoename geeft.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: pijnmanagement knieartrose') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_koa_quad_isometrisch, 0, 3, 15, null),
    (v_schedule, v_ex_koa_wandelen, 1, 1, null, 900),
    (v_schedule, v_ex_koa_rek_kuit, 2, 2, null, 20),
    (v_schedule, v_ex_koa_rek_hamstring, 3, 2, null, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Quadricepskracht opbouwen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Quadricepskracht opbouwen',
    'Progressief quadricepskracht opbouwen, de best onderbouwde interventie bij knieartrose, om de knie beter te ondersteunen.',
    'Week 3-7',
    array['Hardlopen of springen bij pijntoename', 'Zware belasting zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wandzit minimaal 20 seconden vol te houden', 0),
    (v_phase, 'Mini squat en step-up uitvoerbaar zonder duidelijke pijntoename', 1),
    (v_phase, 'Traplopen merkbaar makkelijker', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige krachttraining afgerond', 0),
    (v_phase, 'Traplopen zonder steun aan de leuning', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Quadricepskracht is de sterkste bondgenoot bij knieartrose',
     'Van alle interventies bij knieartrose heeft het versterken van de quadriceps (bovenbeenspier) het meeste wetenschappelijke bewijs voor pijnvermindering en functieverbetering. Een sterkere quadriceps vangt een deel van de belasting op die anders door het gewricht zelf gedragen wordt. Bouw de belasting rustig op, een lichte spierpijn na het trainen is normaal, aanhoudende gewrichtspijn niet.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Quadricepskracht knieartrose') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_koa_wandzit, 0, 3, null, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_koa_minisquat, 1, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_koa_stepup, 2, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_koa_beenpers, 3, 3, 12, null, 'Lichte weerstand');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Laagimpact conditie en functionele belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Laagimpact conditie en functionele belasting',
    'De algehele conditie opbouwen met knievriendelijke, laagimpact vormen van beweging en de balans en functionele belasting verbeteren.',
    'Week 7-10',
    array['Hardlopen of springen bij pijntoename', 'Hoge-impact sport zonder opbouw'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Fietsen of zwemmen minimaal 20 minuten volgehouden', 0),
    (v_phase, 'Balans op één been minimaal 20 seconden met lichte steun', 1),
    (v_phase, 'Dagelijkse activiteiten zonder duidelijke pijntoename', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige conditiesessie afgerond', 0),
    (v_phase, 'Merkbaar meer uithoudingsvermogen bij dagelijkse activiteiten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Laagimpact conditie ontziet het gewricht',
     'Fietsen en zwemmen belasten het kniegewricht veel minder dan hardlopen of springen, terwijl ze wel de conditie en het gewicht helpen beheersen, wat op zijn beurt weer de belasting op de knie vermindert. Combineer dit met de krachtoefeningen uit de vorige fase voor het beste resultaat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Laagimpact conditie knieartrose') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_koa_hometrainer, 0, 1, null, 1200, 'Lage tot matige weerstand'),
    (v_schedule, v_ex_koa_zwemmen, 1, 1, null, 1200, null),
    (v_schedule, v_ex_koa_balans, 2, 3, null, 20, null),
    (v_schedule, v_ex_koa_stepup, 3, 3, 12, null, 'Lichaamsgewicht, hogere opstap');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 4: Langdurig zelfmanagement en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Langdurig zelfmanagement en onderhoud',
    'Een blijvende onderhoudsroutine van kracht en laagimpact conditie vasthouden, als doorlopend onderdeel van het leven met knieartrose.',
    'Week 10+',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Onderhoudsroutine zelfstandig twee tot drie keer per week uitgevoerd', 0),
    (v_phase, 'Dagelijkse activiteiten uitvoerbaar met een hanteerbaar klachtenniveau', 1);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste maand onderhoudsroutine volgehouden', 0),
    (v_phase, 'Vast beweegritme opgebouwd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Knieartrose is iets om te managen, geen traject om af te ronden',
     'In tegenstelling tot veel andere blessures is knieartrose een chronische aandoening die niet op een vast moment klaar is. De oefeningen uit dit plan zijn bedoeld om blijvend deel uit te maken van je week, ook als de klachten op een goed moment zijn. Perioden met meer pijn horen bij het beloop en betekenen niet dat het herstel opnieuw moet beginnen, bouw in die perioden de belasting tijdelijk iets terug en pak daarna de routine weer op.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud knieartrose') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_koa_onderhoud, 0, 1, null, 1200, null),
    (v_schedule, v_ex_koa_minisquat, 1, 3, 12, null, 'Lichaamsgewicht, onderhoud'),
    (v_schedule, v_ex_koa_hometrainer, 2, 1, null, 1200, 'Matige weerstand'),
    (v_schedule, v_ex_koa_balans, 3, 3, null, 20, null),
    (v_schedule, v_ex_koa_traplopen_onderhoud, 4, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_koa_zwemmen_onderhoud, 5, null, null, 1200, null),
    (v_schedule, v_ex_koa_vrije_activiteit, 6, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
