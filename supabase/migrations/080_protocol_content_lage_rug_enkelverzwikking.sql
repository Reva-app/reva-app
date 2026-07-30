-- 080_protocol_content_lage_rug_enkelverzwikking.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Herstelplannen 5 en 6 van tien (zie migratie 077/078 voor context). NIET
-- geverifieerd door een bevoegd fysiotherapeut — clinically_reviewed blijft
-- false.
-- ============================================================================
--
-- Lage rugklachten (low_back_pain): opgebouwd volgens het in de
-- fysiotherapie breed gedragen actieve-behandelprincipe (blijf in beweging,
-- vermijd langdurige bedrust, bouw via motorische controle/core-stabiliteit
-- naar functionele belasting) i.p.v. een puur passieve benadering. Drie
-- nieuwe oefeningen toegevoegd aan de REVA-bibliotheek (bekkenkanteling,
-- knieën-naar-borst rek, McKenzie-rugstrekking) — de bestaande bibliotheek
-- had nog geen laagrug-specifieke items.
--
-- Enkelverzwikking (ankle_sprain, voetbalblessure): bewust een LICHTER en
-- korter traject dan het operatieve enkelbandprotocol (migratie 079,
-- ankle_ligament) — een acute, conservatief behandelde inversietrauma kent
-- een veel sneller herstel (weken, geen maanden) en verdient daarom een
-- eigen, minder uitgebreid protocol i.p.v. een verzwaarde kopie van het
-- operatieve traject. Alle oefeningen hergebruikt uit de bestaande
-- bibliotheek.

do $$
declare
  -- ── Lage rugklachten: nieuwe oefeningen ─────────────────────────────────
  v_ex_bekkenkanteling uuid;
  v_ex_knie_naar_borst uuid;
  v_ex_mckenzie uuid;

  -- ── Lage rugklachten: hergebruikte oefeningen ───────────────────────────
  v_ex_katkoe uuid;
  v_ex_ademhaling uuid;
  v_ex_deadbug uuid;
  v_ex_birddog uuid;
  v_ex_glutebridge uuid;
  v_ex_rompdraai uuid;
  v_ex_plank uuid;
  v_ex_zijplank uuid;
  v_ex_superman uuid;
  v_ex_farmerscarry uuid;
  v_ex_rdl uuid;

  -- ── Enkelverzwikking: hergebruikte oefeningen ───────────────────────────
  v_ex_enkelpompen uuid;
  v_ex_enkelcirkel uuid;
  v_ex_enkeldorsiflexie uuid;
  v_ex_calfraise uuid;
  v_ex_enkel_inversie_eversie uuid;
  v_ex_eenbenige_balans uuid;
  v_ex_wiebelbord uuid;
  v_ex_balans_instabiel uuid;
  v_ex_cutting uuid;
  v_ex_agility_ladder uuid;
  v_ex_sportspecifiek uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — nieuwe oefeningen (lage rug)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bekkenkanteling (pelvic tilt)', 'mobiliteit',
     'Lig op je rug met gebogen knieën. Kantel het bekken zodat de onderrug licht tegen de mat drukt, houd kort vast en ontspan weer.',
     'Een rustige, kleine beweging — richt je op het aanspannen van de buikspieren, niet op kracht zetten met de rug.', 2, 12, array['rug', 'mobiliteit', 'thuis'])
    returning id into v_ex_bekkenkanteling;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Knieën-naar-borst rek', 'rekken',
     'Lig op je rug en trek beide knieën met de handen rustig naar de borst. Houd de rek vast en adem rustig door.',
     'Voer uit binnen een pijnvrije range — forceer de rek niet.', 2, 20, array['rug', 'rekken', 'thuis'])
    returning id into v_ex_knie_naar_borst;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'McKenzie-rugstrekking (press-up)', 'mobiliteit',
     'Lig op je buik en duw met de handen de bovenrug omhoog terwijl het bekken op de mat blijft rusten, in een rustige, gecontroleerde beweging.',
     'Bekend als een effectieve oefening bij lage rugklachten met name als de klachten verminderen bij strekken. Stop en overleg met je fysiotherapeut als de oefening pijn richting het been verergert.', 2, 10, array['rug', 'mobiliteit', 'fysio'])
    returning id into v_ex_mckenzie;

  -- ══════════════════════════════════════════════════════════════════════
  -- 1. Oefeningen ophalen (hergebruikt)
  -- ══════════════════════════════════════════════════════════════════════

  select id into v_ex_katkoe from public.exercise_library where scope = 'reva' and title = 'Kat-koe';
  select id into v_ex_ademhaling from public.exercise_library where scope = 'reva' and title = 'Diafragmatische ademhaling';
  select id into v_ex_deadbug from public.exercise_library where scope = 'reva' and title = 'Dead bug';
  select id into v_ex_birddog from public.exercise_library where scope = 'reva' and title = 'Bird dog';
  select id into v_ex_glutebridge from public.exercise_library where scope = 'reva' and title = 'Glute bridge';
  select id into v_ex_rompdraai from public.exercise_library where scope = 'reva' and title = 'Zittende rompdraai';
  select id into v_ex_plank from public.exercise_library where scope = 'reva' and title = 'Plank';
  select id into v_ex_zijplank from public.exercise_library where scope = 'reva' and title = 'Zijplank';
  select id into v_ex_superman from public.exercise_library where scope = 'reva' and title = 'Superman';
  select id into v_ex_farmerscarry from public.exercise_library where scope = 'reva' and title = 'Farmer''s carry';
  select id into v_ex_rdl from public.exercise_library where scope = 'reva' and title = 'Romeinse deadlift (RDL)';

  select id into v_ex_enkelpompen from public.exercise_library where scope = 'reva' and title = 'Enkelpompen';
  select id into v_ex_enkelcirkel from public.exercise_library where scope = 'reva' and title = 'Enkelcirkel (zittend)';
  select id into v_ex_enkeldorsiflexie from public.exercise_library where scope = 'reva' and title = 'Enkeldorsiflexie tegen muur (knie naar muur)';
  select id into v_ex_calfraise from public.exercise_library where scope = 'reva' and title = 'Calf raise op trede';
  select id into v_ex_enkel_inversie_eversie from public.exercise_library where scope = 'reva' and title = 'Enkel inversie en eversie met band';
  select id into v_ex_eenbenige_balans from public.exercise_library where scope = 'reva' and title = 'Eenbenige balans';
  select id into v_ex_wiebelbord from public.exercise_library where scope = 'reva' and title = 'Wiebelbord balanstraining';
  select id into v_ex_balans_instabiel from public.exercise_library where scope = 'reva' and title = 'Balans op instabiele ondergrond';
  select id into v_ex_cutting from public.exercise_library where scope = 'reva' and title = 'Richtingsveranderingen (cutting drill)';
  select id into v_ex_agility_ladder from public.exercise_library where scope = 'reva' and title = 'Agility ladder basis';
  select id into v_ex_sportspecifiek from public.exercise_library where scope = 'reva' and title = 'Sportspecifieke balvaardigheid';

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Lage rugklachten — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'low_back_pain', 'Herstelplan lage rugklachten',
    'Herstelplan voor aanhoudende of terugkerende lage rugklachten (aspecifieke lage rugpijn), opgebouwd volgens het actieve-behandelprincipe: in beweging blijven, motorische controle en core-stabiliteit opbouwen, en geleidelijk terugkeren naar volledige belasting (ca. 6-10 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijnreductie en actief blijven
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijnreductie en actief blijven',
    'De pijn naar een hanteerbaar niveau brengen en actief blijven in dagelijkse activiteiten — langdurige bedrust vertraagt het herstel.',
    'Week 0-2',
    array['Langdurig plat bedrust', 'Zwaar tillen', 'Diep voorover buigen met gestrekte benen', 'Langdurig zitten zonder onderbreking'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn verminderd tot een hanteerbaar niveau', 0),
    (v_phase, 'Dagelijkse activiteiten (opstaan, lopen, zitten) weer mogelijk', 1),
    (v_phase, 'Geen uitstralende pijn, tintelingen of krachtsverlies in het been', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Weer rechtop lopen zonder overmatige voorzichtigheid', 0),
    (v_phase, 'Weer normaal zitten mogelijk', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf in beweging',
     'Lage rugpijn is bijna altijd onschuldig en verbetert meestal vanzelf binnen enkele weken — bedrust vertraagt het herstel juist. Blijf zo veel mogelijk in beweging binnen de grenzen van de pijn. Zoek direct medische hulp bij uitstraling naar het been, krachtsverlies, of controleverlies over blaas of darm — dit zijn signalen die niet bij een gewoon rugklachtenbeloop horen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — lage rug') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_bekkenkanteling, 0, 2, 12, null),
    (v_schedule, v_ex_katkoe, 1, 2, 10, null),
    (v_schedule, v_ex_knie_naar_borst, 2, 2, null, 20),
    (v_schedule, v_ex_ademhaling, 3, 2, null, 60);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Motorische controle en core-stabiliteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Motorische controle en core-stabiliteit',
    'Actieve controle over de romp en het bekken opbouwen als basis voor een veerkrachtige rug.',
    'Week 2-6',
    array['Zwaar tillen zonder begeleiding', 'Plotselinge, ongecontroleerde bewegingen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijnvrij zitten langer dan 30 minuten', 0),
    (v_phase, 'Core-oefeningen uitvoerbaar zonder toename van pijn', 1),
    (v_phase, 'Volledige buiging en strekking van de rug mogelijk', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige wandeling zonder toename van klachten', 0),
    (v_phase, 'Dagelijkse activiteiten zonder aanpassing uitgevoerd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Actieve oefentherapie werkt beter dan alleen rust',
     'Onderzoek laat consistent zien dat actieve oefentherapie effectiever is dan rust of uitsluitend passieve behandelingen (zoals massage) bij aanhoudende lage rugklachten. De oefeningen in deze fase trainen de controle over romp en bekken — de basis voor een veerkrachtige rug.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Core-stabiliteit — lage rug') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_deadbug, 0, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_birddog, 1, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_glutebridge, 2, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_mckenzie, 3, 2, 10, null),
    (v_schedule, v_ex_rompdraai, 4, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht en functionele belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht en functionele belasting',
    'Algehele romp- en beenkracht opbouwen en veilige tiltechniek trainen, gericht op volledige terugkeer naar werk, sport en dagelijkse activiteiten.',
    'Week 6-10',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Plank en zijplank uitvoerbaar zonder pijn', 0),
    (v_phase, 'Tillen met correcte techniek mogelijk', 1),
    (v_phase, 'Werk-, sport- of hobbygerelateerde bewegingen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Werk hervat (indien van toepassing)', 0),
    (v_phase, 'Sport of hobby hervat', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Goede tiltechniek blijft belangrijk',
     'Til met gebogen knieën en een rechte rug, en houd het gewicht dicht bij je lichaam. Blijf ook na deze fase regelmatig aan je algehele romp- en beenkracht werken — dit is een van de beste manieren om een terugval te voorkomen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — lage rug') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_plank, 0, 3, null, 30, null),
    (v_schedule, v_ex_zijplank, 1, 3, null, 20, null),
    (v_schedule, v_ex_superman, 2, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_farmerscarry, 3, 3, null, 30, 'Matig gewicht per hand'),
    (v_schedule, v_ex_rdl, 4, 3, 10, null, 'Licht, focus op techniek');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Enkelverzwikking (voetbal) — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'ankle_sprain', 'Herstelplan enkelverzwikking (voetbal)',
    'Compact herstelplan voor een acute, conservatief behandelde enkelverzwikking (inversietrauma) bij voetballers, van RICE en vroege belasting tot volledige sportterugkeer (ca. 4-6 weken). Voor een operatief behandelde, chronische instabiliteit, zie het herstelplan ''Enkelbandletsel (chronisch/operatief)''.',
    false)
  returning id into v_protocol;

  -- Fase 1: RICE en vroege belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: RICE en vroege belasting',
    'Zwelling beperken met Rust, IJs, Compressie en Elevatie, en zo snel als de pijn het toelaat voorzichtig weer belasten.',
    'Dag 0-7',
    array['Hardlopen', 'Springen', 'Sporten', 'Langdurig staan zonder rust'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Zwelling onder controle', 0),
    (v_phase, 'Belasten mogelijk met minimale pijn', 1),
    (v_phase, 'Actieve dorsiflexie mogelijk binnen de pijngrens', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Lopen zonder hinken', 0),
    (v_phase, 'Zwelling duidelijk afgenomen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'RICE in de eerste 48 uur, daarna vroeg bewegen',
     'Pas in de eerste 48 uur Rust, IJs, Compressie en Elevatie toe om zwelling te beperken. Daarna is voorzichtige, vroege belasting (zodra de pijn het toelaat) beter voor het herstel dan langdurige rust of immobilisatie.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — enkelverzwikking') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_enkelpompen, 0, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelcirkel, 1, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Mobiliteit en kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Mobiliteit en kracht',
    'Volledige mobiliteit herwinnen en enkelkracht opbouwen, met de vroege start van balanstraining.',
    'Week 1-3',
    array['Sporten', 'Hardlopen op oneffen ondergrond'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige mobiliteit hersteld', 0),
    (v_phase, 'Lopen zonder hinken op alle ondergronden', 1),
    (v_phase, 'Hinkelen op de aangedane voet mogelijk zonder pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Hardlopen op een rechte lijn zonder pijn', 0),
    (v_phase, 'Calf raises pijnvrij uitgevoerd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Vroege balanstraining verkleint het risico op een nieuwe verzwikking',
     'Zo vroeg mogelijk starten met balans- en propriocepsistraining is een van de best onderbouwde adviezen bij enkelverzwikkingen — het verkleint de kans op een nieuwe verzwikking aanzienlijk, ook als de enkel al stabiel aanvoelt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en kracht — enkelverzwikking') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_enkeldorsiflexie, 0, 3, 10, null, null),
    (v_schedule, v_ex_calfraise, 1, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkel_inversie_eversie, 2, 3, 15, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_eenbenige_balans, 3, 3, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Terugkeer naar sport',
    'Balans, richtingsveranderingen en voetbalspecifieke bewegingen op snelheid trainen als voorbereiding op volledige sportterugkeer.',
    'Week 3-6',
    array['Wedstrijden zonder goedkeuring fysiotherapeut of trainer'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Balans op instabiele ondergrond minimaal 30 seconden', 0),
    (v_phase, 'Richtingsveranderingen zonder instabiliteitsgevoel', 1),
    (v_phase, 'Volledig meetrainen zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training meegedaan', 0),
    (v_phase, 'Terug op het veld voor een wedstrijd', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Preventie na terugkeer',
     'Overweeg preventieve taping of een brace bij de eerste wedstrijden na terugkeer, en blijf balanstraining als kort onderhoudsprogramma doen — dit halveert volgens onderzoek ongeveer het risico op een nieuwe verzwikking.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifieke training — enkelverzwikking') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_wiebelbord, 0, 3, null, 30, null),
    (v_schedule, v_ex_balans_instabiel, 1, 3, null, 30, null),
    (v_schedule, v_ex_cutting, 2, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_agility_ladder, 3, 2, null, 60, null),
    (v_schedule, v_ex_sportspecifiek, 4, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

notify pgrst, 'reload schema';
