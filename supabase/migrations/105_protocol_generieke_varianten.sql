-- 105_protocol_generieke_varianten.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Twee bewust generieke herstelplannen (zie migratie 104), bedoeld als
-- vangnet voor spier- en peesklachten die niet onder een van de al
-- bestaande, specifiekere categorieën vallen (hamstring/kuit/lies-
-- verrekking, achillespees-/elleboogtendinopathie, etc.). Nadrukkelijk een
-- startpunt: de fysiotherapeut past dit aan naar de specifieke spier/pees
-- van de patiënt. NIET geverifieerd door een bevoegd fysiotherapeut —
-- clinically_reviewed blijft false, mag niet aan echte patiënten worden
-- toegewezen totdat een fysiotherapeut de inhoud heeft gecontroleerd.
-- ============================================================================

do $$
declare
  -- ── Spierverrekking, algemeen ───────────────────────────────────────────
  v_ex_ms_iso uuid;
  v_ex_ms_rekken uuid;
  v_ex_ms_lopen_pijnvrij uuid;
  v_ex_ms_progressief_rekken uuid;
  v_ex_ms_licht_concentrisch uuid;
  v_ex_ms_fietsen uuid;
  v_ex_ms_excentrisch uuid;
  v_ex_ms_functioneel uuid;
  v_ex_ms_sportspecifiek uuid;
  v_ex_ms_onderhoud uuid;

  -- ── Peesklachten, algemeen ───────────────────────────────────────────────
  v_ex_pk_belasting_verminderen uuid;
  v_ex_pk_isometrisch uuid;
  v_ex_pk_rekken_licht uuid;
  v_ex_pk_isotonisch_licht uuid;
  v_ex_pk_isotonisch_zwaar uuid;
  v_ex_pk_excentrisch uuid;
  v_ex_pk_functioneel_belasten uuid;
  v_ex_pk_sportspecifiek uuid;
  v_ex_pk_onderhoud uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — spierverrekking, algemeen
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Isometrische aanspanning (algemeen)', 'kracht',
     'Span de aangedane spier rustig en gecontroleerd aan zonder beweging, in een voor de patiënt comfortabele stand.',
     'Pas de spiergroep en houding aan op de specifieke spier van de patiënt. Pijnvrij uitvoeren, geen kramp forceren.', 3, 15, array['spier', 'kracht', 'algemeen'])
    returning id into v_ex_ms_iso;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Licht rekken binnen pijnvrije grens', 'rekken',
     'Rek de aangedane spier voorzichtig tot een lichte spanning, niet tot pijn.',
     'In de acute fase kort en licht rekken, nooit doorveren of tot pijn doorzetten.', 2, 20, array['spier', 'rekken', 'algemeen'])
    returning id into v_ex_ms_rekken;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Dagelijkse activiteit binnen pijngrens', 'conditie',
     'Blijf zo veel mogelijk normaal bewegen binnen de grens van lichte, dragelijke pijn, in plaats van volledige rust.',
     'Volledige rust vertraagt het herstel van een spierverrekking. Pas het tempo aan, stop niet volledig met bewegen.', 600, array['spier', 'conditie', 'algemeen'])
    returning id into v_ex_ms_lopen_pijnvrij;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Progressief rekken', 'rekken',
     'Bouw de rek van de aangedane spier geleidelijk verder op naarmate de pijn afneemt.',
     'Elke week iets verder rekken zolang dit pijnvrij blijft, niet forceren.', 3, 20, array['spier', 'rekken', 'algemeen'])
    returning id into v_ex_ms_progressief_rekken;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Licht concentrisch krachtwerk', 'kracht',
     'Voer een langzame, gecontroleerde aanspanning van de aangedane spier uit met lichte weerstand.',
     'Kies een oefening passend bij de specifieke spiergroep. Rustig tempo, geen scherpe pijn tijdens uitvoering.', 3, 12, 'Lichaamsgewicht of lichte weerstand', array['spier', 'kracht', 'algemeen'])
    returning id into v_ex_ms_licht_concentrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Laagintensieve conditietraining', 'conditie',
     'Fiets of wandel in een rustig tempo als algemene conditietraining zonder de aangedane spier zwaar te belasten.',
     'Goede manier om actief te blijven terwijl de spier verder herstelt.', 900, array['spier', 'conditie', 'algemeen'])
    returning id into v_ex_ms_fietsen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische krachtopbouw', 'kracht',
     'Voer de aangedane spier gecontroleerd, langzaam verlengend onder belasting uit (de klassieke "afremmende" fase van een oefening).',
     'Excentrische training is een kernonderdeel van spierherstel en vermindert het risico op herverrekking. Pas de oefening aan op de specifieke spier.', 3, 10, 'Lichaamsgewicht of lichte weerstand', array['spier', 'kracht', 'excentrisch'])
    returning id into v_ex_ms_excentrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Functionele bewegingspatronen', 'stabiliteit',
     'Oefen dagelijkse of sportspecifieke bewegingspatronen waarin de aangedane spier een rol speelt, op een rustig tempo.',
     'Bouw op naar de bewegingen die de patiënt in het dagelijks leven of de sport weer nodig heeft.', 3, 10, array['spier', 'stabiliteit', 'functioneel'])
    returning id into v_ex_ms_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke belastingsopbouw', 'conditie',
     'Bouw de sport- of werkgerelateerde belasting van de aangedane spier stap voor stap op richting het oude niveau.',
     'Pas op aan de sport of activiteit van de patiënt. Alleen opbouwen zonder terugkerende pijn.', 900, array['spier', 'conditie', 'sportspecifiek'])
    returning id into v_ex_ms_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudskracht (algemeen)', 'kracht',
     'Voer twee keer per week een kort krachtprogramma uit gericht op de eerder aangedane spiergroep, als onderhoud.',
     'Voorkomt een nieuwe verrekking door de opgebouwde kracht en flexibiliteit vast te houden.', 3, 12, array['spier', 'kracht', 'onderhoud'])
    returning id into v_ex_ms_onderhoud;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Spierverrekking, algemeen — 4 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'muscle_strain_general', 'Herstelplan spierverrekking, algemeen',
    'Generiek basisherstelplan voor een spierverrekking die niet onder een van de specifiekere blessuretypen valt (voor hamstring, kuit of lies bestaan al eigen, meer toegespitste herstelplannen). Volgt de klassieke opbouw van pijnreductie via geleidelijke rek- en krachtopbouw naar functionele en sportspecifieke terugkeer (ca. 6 tot 8 weken). Pas de oefeningen en spiergroep aan op de specifieke situatie van de patiënt.',
    false)
  returning id into v_protocol;

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnreductie en vroege activatie',
    'Pijn en zwelling beperken terwijl de spier voorzichtig actief blijft, in plaats van volledige rust.',
    'Week 0-2',
    array['Maximale spierbelasting', 'Explosieve of ballistische bewegingen', 'Sport hervatten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lopen of dagelijkse activiteiten zonder duidelijk hinken of ontzien', 0),
    (v_phase, 'Pijn in rust duidelijk afgenomen', 1),
    (v_phase, 'Isometrische aanspanning pijnvrij mogelijk', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Dagelijkse activiteiten weer mogelijk zonder duidelijke ontzien-reactie', 0),
    (v_phase, 'Pijn in rust onder controle', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rust met mate, niet volledig stilzitten',
     'Volledige rust vertraagt het herstel van een spierverrekking. Blijf binnen de grens van lichte, dragelijke pijn in beweging, dat versnelt het herstel juist.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Vroege fase, pijnreductie: spierverrekking algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_ms_iso, 0, 3, 15),
    (v_schedule, v_ex_ms_rekken, 1, 2, 20),
    (v_schedule, v_ex_ms_lopen_pijnvrij, 2, null, 600);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Progressieve rek- en krachtopbouw',
    'De rek en spierkracht geleidelijk opbouwen richting het niveau van vóór de blessure.',
    'Week 2-5',
    array['Sprinten', 'Explosieve richtingsveranderingen', 'Wedstrijdsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, pijnvrije rek van de aangedane spier', 0),
    (v_phase, 'Licht concentrisch krachtwerk zonder pijn', 1),
    (v_phase, 'Wandelen of fietsen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Volledige rek pijnvrij bereikt', 0),
    (v_phase, 'Eerste krachttraining zonder klachten achteraf', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht vóór snelheid',
     'Bouw eerst kracht en controle op voordat je aan snelheid of explosiviteit denkt. Dit verkleint het risico op een nieuwe verrekking aanzienlijk.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Rek- en krachtopbouw: spierverrekking algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ms_progressief_rekken, 0, 3, null, null),
    (v_schedule, v_ex_ms_licht_concentrisch, 1, 3, 12, 'Lichaamsgewicht of lichte weerstand'),
    (v_schedule, v_ex_ms_fietsen, 2, null, null, null);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds) values
    (v_schedule, v_ex_ms_fietsen, 2, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Excentrische kracht en functionele belasting',
    'Excentrische kracht opbouwen en de spier weer belasten in functionele, dagelijkse of sportgerichte bewegingspatronen.',
    'Week 5-7',
    array['Wedstrijdsport zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Excentrische belasting pijnvrij mogelijk', 0),
    (v_phase, 'Functionele bewegingen zonder compensatie of ontzien', 1),
    (v_phase, 'Kracht subjectief vergelijkbaar met de andere zijde', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste functionele training zonder klachten', 0),
    (v_phase, 'Excentrische training zonder nagevoelde pijn', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Excentrische training verkleint herverrekking',
     'Excentrische (afremmende) spiertraining is aantoonbaar effectief om het risico op een nieuwe verrekking te verkleinen. Sla deze fase niet over, ook niet als de spier al goed aanvoelt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Excentrische kracht en functie: spierverrekking algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_ms_excentrisch, 0, 3, 10, 'Lichaamsgewicht of lichte weerstand'),
    (v_schedule, v_ex_ms_functioneel, 1, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport en onderhoud',
    'Volledige, begeleide terugkeer naar sport of werk, met een onderhoudsprogramma om herverrekking te voorkomen.',
    'Week 7-8',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sportspecifieke belasting zonder klachten', 0),
    (v_phase, 'Goedkeuring fysiotherapeut voor volledige hervatting', 1);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training of werkdag hervat', 0),
    (v_phase, 'Terug op het oude niveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden na terugkeer',
     'Ga ook na terugkeer door met gericht rek- en krachtwerk voor de eerder aangedane spier. Dit blijft het risico op een nieuwe verrekking beperken.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: spierverrekking algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_ms_onderhoud, 0, 3, 12, null),
    (v_schedule, v_ex_ms_sportspecifiek, 1, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — peesklachten, algemeen
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Isometrische belasting (pees, algemeen)', 'kracht',
     'Span de spier rond de aangedane pees rustig en langdurig aan zonder beweging.',
     'Isometrische belasting kan in de vroege fase pijnverlichtend werken. Pas de spiergroep aan op de specifieke pees van de patiënt.', 4, 30, array['pees', 'kracht', 'algemeen'])
    returning id into v_ex_pk_isometrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Belasting verminderen, niet volledig stoppen', 'conditie',
     'Verminder tijdelijk de activiteit die de klachten uitlokt, zonder de pees volledig stil te leggen.',
     'Volledige rust laat een pees juist verzwakken. Verminder de belasting in plaats van te stoppen.', 600, array['pees', 'conditie', 'algemeen'])
    returning id into v_ex_pk_belasting_verminderen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Licht rekken van de omliggende spier', 'rekken',
     'Rek de spier rond de aangedane pees voorzichtig, tot een lichte spanning.',
     'Niet doorveren, niet tot pijn doorzetten.', 2, 20, array['pees', 'rekken', 'algemeen'])
    returning id into v_ex_pk_rekken_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Isotonische belasting, licht', 'kracht',
     'Voer een langzame, gecontroleerde beweging uit met lichte belasting van de aangedane pees.',
     'Rustig tempo, geen scherpe pijn tijdens uitvoering. Pas de oefening aan op de specifieke pees.', 3, 12, 'Licht', array['pees', 'kracht', 'algemeen'])
    returning id into v_ex_pk_isotonisch_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Isotonische belasting, opbouwend', 'kracht',
     'Bouw de belasting van de isotonische oefening geleidelijk verder op.',
     'Verhoog gewicht of herhalingen alleen als de vorige belasting pijnvrij bleef, ook de dag erna.', 3, 12, 'Licht tot matig', array['pees', 'kracht', 'algemeen'])
    returning id into v_ex_pk_isotonisch_zwaar;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Excentrische pees-training', 'kracht',
     'Voer de spier rond de aangedane pees gecontroleerd, langzaam verlengend onder belasting uit.',
     'Excentrische training is de meest onderbouwde aanpak bij aanhoudende peesklachten (tendinopathie). Rustig tempo, dagelijks herhalen.', 3, 12, 'Lichaamsgewicht of licht', array['pees', 'kracht', 'excentrisch'])
    returning id into v_ex_pk_excentrisch;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Functionele belasting opbouwen', 'stabiliteit',
     'Oefen dagelijkse of sportspecifieke bewegingen waarin de aangedane pees een rol speelt, op een rustig tempo.',
     'Bouw stap voor stap op naar de belasting die de patiënt weer nodig heeft in het dagelijks leven of de sport.', 3, 10, array['pees', 'stabiliteit', 'functioneel'])
    returning id into v_ex_pk_functioneel_belasten;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke belastingsopbouw (pees)', 'conditie',
     'Bouw de sport- of werkgerelateerde belasting van de aangedane pees stap voor stap op richting het oude niveau.',
     'Alleen opbouwen zolang er geen toenemende klachten de volgende dag ontstaan.', 900, array['pees', 'conditie', 'sportspecifiek'])
    returning id into v_ex_pk_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudsbelasting (pees, algemeen)', 'kracht',
     'Voer twee keer per week een kort krachtprogramma uit gericht op de eerder aangedane pees, als onderhoud.',
     'Aanhoudende peesklachten hebben baat bij langdurig, regelmatig onderhoud van kracht en belastbaarheid.', 3, 12, array['pees', 'kracht', 'onderhoud'])
    returning id into v_ex_pk_onderhoud;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Peesklachten, algemeen — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'tendinopathy_general', 'Herstelplan peesklachten, algemeen',
    'Generiek basisherstelplan voor peesklachten (tendinopathie) die niet onder een van de specifiekere categorieën vallen (voor achillespees en elleboog bestaan al eigen, meer toegespitste herstelplannen). Volgt de evidence-based opbouw van isometrische belasting via progressieve isotonische en excentrische training naar functionele en sportspecifieke terugkeer (ca. 8 tot 12 weken, vaak een langzaam proces). Pas de oefeningen en pees aan op de specifieke situatie van de patiënt.',
    false)
  returning id into v_protocol;

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnmanagement en isometrische belasting',
    'Pijn verminderen en belastbaarheid onderhouden met isometrische oefeningen, in plaats van de pees volledig te ontzien.',
    'Week 0-3',
    array['Volledige rust', 'Plotselinge piekbelasting', 'Sport hervatten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Isometrische belasting uitvoerbaar zonder toename van pijn nadien', 0),
    (v_phase, 'Dagelijkse activiteiten mogelijk binnen een draaglijke pijngrens', 1);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste week isometrische training afgerond', 0),
    (v_phase, 'Pijn bij dagelijkse activiteiten afgenomen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Peesklachten hebben tijd en geduld nodig',
     'Een pees herstelt langzamer dan een spier. Verwacht geleidelijke vooruitgang over weken, niet dagen, en verminder de belasting in plaats van volledig te stoppen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Pijnmanagement, isometrisch: peesklachten algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_pk_isometrisch, 0, 4, 30);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds) values
    (v_schedule, v_ex_pk_belasting_verminderen, 1, 600);
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_duration_seconds) values
    (v_schedule, v_ex_pk_rekken_licht, 2, 2, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Isotonische en excentrische krachtopbouw',
    'De belastbaarheid van de pees geleidelijk opbouwen met isotonische en excentrische krachttraining.',
    'Week 3-8',
    array['Plotselinge sprongbelasting', 'Wedstrijdsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Isotonische training zonder toename van klachten de volgende dag', 0),
    (v_phase, 'Excentrische training gestart en pijnvrij opgebouwd', 1),
    (v_phase, 'Functionele bewegingen mogelijk zonder ontzien', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste excentrische trainingsweek afgerond', 0),
    (v_phase, 'Functionele belasting zonder nagevoelde klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Lichte, voorspelbare pijn tijdens training kan oké zijn',
     'Bij peesklachten is een lichte, voorspelbare pijn tijdens de training vaak acceptabel, zolang deze de volgende dag weer volledig is weggezakt. Neemt de pijn juist toe, bouw dan een stap terug.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Isotonisch en excentrisch: peesklachten algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_pk_isotonisch_licht, 0, 3, 12, 'Licht'),
    (v_schedule, v_ex_pk_isotonisch_zwaar, 1, 3, 12, 'Licht tot matig'),
    (v_schedule, v_ex_pk_excentrisch, 2, 3, 12, 'Lichaamsgewicht of licht'),
    (v_schedule, v_ex_pk_functioneel_belasten, 3, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar sport en onderhoud',
    'Volledige, begeleide terugkeer naar sport of werk, met een langdurig onderhoudsprogramma om de klachten niet te laten terugkeren.',
    'Week 8-12',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sportspecifieke belasting zonder klachten de volgende dag', 0),
    (v_phase, 'Goedkeuring fysiotherapeut voor volledige hervatting', 1);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training of werkdag hervat', 0),
    (v_phase, 'Terug op het oude niveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Onderhoud blijft nodig, ook na herstel',
     'Peesklachten keren makkelijk terug als de belastbaarheid niet wordt onderhouden. Blijf ook na volledig herstel regelmatig krachtwerk doen voor de eerder aangedane pees.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: peesklachten algemeen') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_pk_onderhoud, 0, 3, 12, null),
    (v_schedule, v_ex_pk_sportspecifiek, 1, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
