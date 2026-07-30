-- 081_protocol_content_hamstring_lies.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Herstelplannen 7 en 8 van tien (zie migratie 077/078 voor context). NIET
-- geverifieerd door een bevoegd fysiotherapeut — clinically_reviewed blijft
-- false.
-- ============================================================================
--
-- Hamstringblessure: opgebouwd volgens het in de sportfysiotherapie breed
-- toegepaste principe van vroege, voorzichtige belasting binnen de pijngrens
-- gevolgd door progressieve excentrische training (bv. Nordic hamstring
-- curl) — een van de best onderbouwde methoden om zowel genezing te
-- versnellen als recidief te voorkomen. Volledig hergebruikt uit de
-- bestaande bibliotheek.
--
-- Liesblessure (adductoren): één nieuwe oefening toegevoegd (adductor
-- squeeze met bal) — de bestaande bibliotheek had nog geen isometrische
-- adductor-startoefening. De Copenhagen plank (al aanwezig, getagd 'lies')
-- is hier het kernonderdeel van de krachtopbouw, in lijn met onderzoek dat
-- adductorkracht een van de sterkste voorspellers is voor het risico op een
-- (herhaalde) liesblessure bij voetballers.

do $$
declare
  -- ── Hamstringblessure: hergebruikte oefeningen ──────────────────────────
  v_ex_hamstringcurl uuid;
  v_ex_glutebridge uuid;
  v_ex_birddog uuid;
  v_ex_nordic uuid;
  v_ex_rdl uuid;
  v_ex_hamstringstretch uuid;
  v_ex_legcurl uuid;
  v_ex_sprint_intervallen uuid;
  v_ex_hardlopen_opbouw uuid;
  v_ex_sportspecifiek uuid;

  -- ── Liesblessure: nieuwe + hergebruikte oefeningen ──────────────────────
  v_ex_adductor_squeeze uuid;
  v_ex_kabel_adductie uuid;
  v_ex_copenhagen uuid;
  v_ex_zijwaartse_lunges uuid;
  v_ex_cutting uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — nieuwe oefening (lies)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, tags) values
    ('reva', 'Adductor squeeze (bal tussen knieën)', 'kracht',
     'Lig op je rug met gebogen knieën en een bal (of opgerold kussen) tussen de knieën. Knijp de bal geleidelijk in en houd de spanning vast.',
     'Een veilige, isometrische startoefening bij liesklachten — bouw de duur en intensiteit van het knijpen rustig op, stop bij scherpe pijn.', 3, null, 10, array['lies', 'kracht', 'thuis'])
    returning id into v_ex_adductor_squeeze;

  -- ══════════════════════════════════════════════════════════════════════
  -- 1. Oefeningen ophalen (hergebruikt)
  -- ══════════════════════════════════════════════════════════════════════

  select id into v_ex_hamstringcurl from public.exercise_library where scope = 'reva' and title = 'Hamstringcurl (liggen)';
  select id into v_ex_glutebridge from public.exercise_library where scope = 'reva' and title = 'Glute bridge';
  select id into v_ex_birddog from public.exercise_library where scope = 'reva' and title = 'Bird dog';
  select id into v_ex_nordic from public.exercise_library where scope = 'reva' and title = 'Nordic hamstring curl';
  select id into v_ex_rdl from public.exercise_library where scope = 'reva' and title = 'Romeinse deadlift (RDL)';
  select id into v_ex_hamstringstretch from public.exercise_library where scope = 'reva' and title = 'Hamstringstretch liggend';
  select id into v_ex_legcurl from public.exercise_library where scope = 'reva' and title = 'Leg curl liggend (machine)';
  select id into v_ex_sprint_intervallen from public.exercise_library where scope = 'reva' and title = 'Sprint intervallen';
  select id into v_ex_hardlopen_opbouw from public.exercise_library where scope = 'reva' and title = 'Hardlopen opbouwschema';
  select id into v_ex_sportspecifiek from public.exercise_library where scope = 'reva' and title = 'Sportspecifieke balvaardigheid';

  select id into v_ex_kabel_adductie from public.exercise_library where scope = 'reva' and title = 'Kabel heupadductie';
  select id into v_ex_copenhagen from public.exercise_library where scope = 'reva' and title = 'Copenhagen plank';
  select id into v_ex_zijwaartse_lunges from public.exercise_library where scope = 'reva' and title = 'Zijwaartse lunges';
  select id into v_ex_cutting from public.exercise_library where scope = 'reva' and title = 'Richtingsveranderingen (cutting drill)';

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Hamstringblessure (voetbal) — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'hamstring_strain', 'Herstelplan hamstringblessure (voetbal)',
    'Herstelplan voor een hamstringblessure (spierverrekking) bij voetballers, van pijnreductie en isometrische activatie via progressieve excentrische training tot volledige sprint- en sportterugkeer (ca. 6-8 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Acute fase — pijnreductie en isometrische activatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnreductie en isometrische activatie',
    'Pijn en ontsteking laten afnemen terwijl de hamstring voorzichtig en isometrisch actief wordt gehouden.',
    'Week 0-1',
    array['Sprinten', 'Hardlopen op snelheid', 'Explosieve bewegingen', 'Diep voorover buigen met gestrekt been', 'Rekken/stretchen van de hamstring'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij lopen duidelijk afgenomen', 0),
    (v_phase, 'Isometrische aanspanning mogelijk zonder scherpe pijn', 1),
    (v_phase, 'Wandelen pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije wandeling', 0),
    (v_phase, 'Zwelling of verkleuring afgenomen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Voorzichtig actief, niet rekken',
     'Voorzichtige, pijnvrije belasting werkt beter dan volledige rust bij een hamstringblessure — maar vermijd rekken/stretchen van de hamstring in deze eerste fase, dit kan de genezing juist vertragen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — hamstringblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_glutebridge, 0, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_birddog, 1, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hamstringcurl, 2, 2, 10, 'Zonder weerstand, laag tempo, binnen de pijngrens');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Progressieve excentrische belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Progressieve excentrische belasting',
    'Kracht opbouwen met nadruk op excentrische training — een van de best onderbouwde methoden bij hamstringblessures — en starten met joggen op laag tempo.',
    'Week 1-4',
    array['Sprinten', 'Richtingsveranderingen op snelheid', 'Wedstrijdsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, pijnvrije mobiliteit', 0),
    (v_phase, 'Hamstringkracht minimaal 70% van het andere been', 1),
    (v_phase, 'Joggen op laag tempo pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste jogging-sessie afgerond', 0),
    (v_phase, 'Nordic hamstring curl (gedeeltelijk) uitvoerbaar', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Excentrische training versnelt herstel én voorkomt herhaling',
     'Excentrische oefeningen zoals de Nordic hamstring curl behoren tot de best onderzochte interventies bij hamstringblessures — ze versterken de spier precies in de positie waarin blessures vaak ontstaan (been gestrekt, hoge snelheid) en verlagen aantoonbaar het recidiefrisico.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Excentrische opbouw — hamstringblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_nordic, 0, 3, 4, 'Gedeeltelijke range, alleen zover als gecontroleerd lukt'),
    (v_schedule, v_ex_rdl, 1, 3, 10, 'Licht gewicht, focus op techniek'),
    (v_schedule, v_ex_legcurl, 2, 3, 12, null),
    (v_schedule, v_ex_hamstringstretch, 3, 2, null, 'Alleen lichte rek, pas vanaf deze fase toegestaan');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Sprintopbouw en terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Sprintopbouw en terugkeer naar sport',
    'Sprintsnelheid geleidelijk opbouwen en sportspecifieke acceleratie/deceleratie trainen als voorbereiding op volledige terugkeer.',
    'Week 4-8',
    array['Wedstrijden zonder goedkeuring fysiotherapeut of trainer'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sprinten op 80% snelheid pijnvrij', 0),
    (v_phase, 'Hoge-snelheid loopwerk zonder aarzeling', 1),
    (v_phase, 'Sportspecifieke acceleratie/deceleratie zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste sprint op volle snelheid', 0),
    (v_phase, 'Volledig meetrainen zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Let op: verhoogd recidiefrisico in de eerste weken na terugkeer',
     'Hamstringblessures kennen een relatief hoog risico op herhaling, met name in de eerste weken na sportterugkeer. Bouw sprintbelasting geleidelijk op en blijf ook na terugkeer excentrische training (bv. Nordic hamstring curl) onderhouden.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sprint- en sportopbouw — hamstringblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_hardlopen_opbouw, 0, null, null, 1200),
    (v_schedule, v_ex_sprint_intervallen, 1, null, null, 900),
    (v_schedule, v_ex_nordic, 2, 3, 6, null),
    (v_schedule, v_ex_sportspecifiek, 3, null, null, 1200);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Liesblessure / adductoren (voetbal) — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'groin_strain', 'Herstelplan liesblessure (voetbal)',
    'Herstelplan voor een liesblessure (adductorverrekking) bij voetballers, van pijnreductie en isometrische activatie via gerichte adductorkrachttraining tot volledige sprint- en sportterugkeer (ca. 6-8 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnreductie en isometrische activatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnreductie en isometrische activatie',
    'Pijn laten afnemen terwijl de adductoren voorzichtig isometrisch actief worden gehouden.',
    'Week 0-1',
    array['Sprinten', 'Richtingsveranderingen', 'Schieten', 'Wijdbeens bewegingen (brede uitvalspas of spagaatachtige belasting)'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij lopen duidelijk afgenomen', 0),
    (v_phase, 'Isometrische adductie mogelijk zonder scherpe pijn', 1),
    (v_phase, 'Wandelen pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije wandeling', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Isometrische training als startpunt',
     'Isometrische aanspanning van de adductoren (bijvoorbeeld een bal tussen de knieën knijpen) vermindert pijn op korte termijn en is een veilig startpunt bij een liesblessure, mits binnen de pijngrens uitgevoerd.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — liesblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_adductor_squeeze, 0, 3, null, 10),
    (v_schedule, v_ex_glutebridge, 1, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Krachtopbouw adductoren
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Krachtopbouw adductoren',
    'Adductorkracht gericht opbouwen — een van de belangrijkste beschermende factoren tegen een (herhaalde) liesblessure — en starten met joggen.',
    'Week 1-4',
    array['Sprinten', 'Richtingsveranderingen op snelheid', 'Wedstrijdsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, pijnvrije heupmobiliteit', 0),
    (v_phase, 'Adductorkracht minimaal 70% van het andere been', 1),
    (v_phase, 'Joggen pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste jogging-sessie afgerond', 0),
    (v_phase, 'Copenhagen plank (knieversie) uitvoerbaar', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Adductorkracht is de beste bescherming tegen herhaling',
     'Voetballers met sterke adductoren hebben een aantoonbaar lager risico op liesblessures. De Copenhagen plank is een van de best onderzochte oefeningen hiervoor — begin met de eenvoudigere knieversie en bouw op naar de volledige, gestrekte variant.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — liesblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_kabel_adductie, 0, 3, 12, 'Licht tot matig'),
    (v_schedule, v_ex_copenhagen, 1, 3, 6, 'Start met de knieversie (onderbeen op de bank)'),
    (v_schedule, v_ex_zijwaartse_lunges, 2, 3, 8, 'Binnen een pijnvrije, beperkte range');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Sprint- en richtingsveranderingsopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Sprint- en richtingsveranderingsopbouw',
    'Sprinten, richtingsveranderingen en voetbalspecifieke bewegingen (schieten, passen) op snelheid trainen als voorbereiding op volledige terugkeer.',
    'Week 4-8',
    array['Wedstrijden zonder goedkeuring fysiotherapeut of trainer'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sprinten pijnvrij', 0),
    (v_phase, 'Richtingsveranderingen zonder klachten', 1),
    (v_phase, 'Schieten en passen zonder pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training meegedaan', 0),
    (v_phase, 'Terug op het veld voor een wedstrijd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf adductorkracht onderhouden na terugkeer',
     'Blijf ook na terugkeer één tot twee keer per week gerichte adductorkracht trainen (bijvoorbeeld met de Copenhagen plank) — dit is het best onderbouwde preventiemiddel tegen een nieuwe liesblessure.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifieke training — liesblessure') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_copenhagen, 0, 3, 8, null),
    (v_schedule, v_ex_cutting, 1, 3, 6, null),
    (v_schedule, v_ex_sprint_intervallen, 2, null, null, 900),
    (v_schedule, v_ex_sportspecifiek, 3, null, null, 1200);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

notify pgrst, 'reload schema';
