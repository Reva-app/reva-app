-- 082_protocol_content_mcl_hersenschudding.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Herstelplannen 9 en 10 van tien, de laatste van de reeks (zie migratie
-- 077/078 voor context). NIET geverifieerd door een bevoegd fysiotherapeut
-- — clinically_reviewed blijft false, en voor hersenschudding geldt dat
-- extra nadrukkelijk: dit protocol vervangt op geen enkele manier medische
-- beoordeling.
-- ============================================================================
--
-- Kniebandletsel (MCL): een conservatief behandelde mediale kniebandblessure
-- (graad I-II), qua opzet vergelijkbaar met de bestaande knieprotocollen
-- maar met valgus-belasting (zijwaartse druk op de knie) als kernrisico
-- i.p.v. flexie-/rotatiebeperkingen. Volledig hergebruikt uit de bestaande
-- bibliotheek.
--
-- Hersenschudding: bewust een ANDER soort protocol dan de overige negen —
-- geen sets/herhalingen-oefenschema, maar het internationaal erkende
-- gefaseerde "return to sport"-model uit de Concussion in Sport Group-
-- consensusverklaringen (Berlin/Amsterdam): rust en symptoommonitoring →
-- lichte aerobe activiteit → sportspecifieke training zonder impact →
-- volledige, medisch goedgekeurde terugkeer. Elke stap mag pas gezet worden
-- na minimaal 24 uur zonder toename van symptomen; bij terugkeer van
-- klachten gaat de patiënt een stap terug. Twee nieuwe, niet-fysieke
-- "oefeningen" toegevoegd (activiteit-opbouw, niet-contact drills) omdat de
-- bestaande 100-item-bibliotheek uitsluitend musculoskeletale oefeningen
-- bevat.

do $$
declare
  -- ── MCL: hergebruikte oefeningen ────────────────────────────────────────
  v_ex_quad uuid;
  v_ex_slr uuid;
  v_ex_enkelpompen uuid;
  v_ex_minisquat uuid;
  v_ex_wandzit uuid;
  v_ex_stepup uuid;
  v_ex_hamstringcurl uuid;
  v_ex_terminalext uuid;
  v_ex_hometrainer uuid;
  v_ex_wandelen_buiten uuid;
  v_ex_eenbenige_balans uuid;
  v_ex_wiebelbord uuid;
  v_ex_bulgaarse_split uuid;
  v_ex_cutting uuid;
  v_ex_hardlopen_opbouw uuid;
  v_ex_sportspecifiek uuid;

  -- ── Hersenschudding: nieuwe + hergebruikte oefeningen ───────────────────
  v_ex_activiteit_opbouw uuid;
  v_ex_niet_contact uuid;
  v_ex_wandelen_laag_tempo uuid;
  v_ex_hometrainer2 uuid;
  v_ex_teamtraining uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oefeningenbibliotheek — nieuwe oefeningen (hersenschudding)
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Geleidelijke terugkeer naar dagelijkse activiteiten', 'anders',
     'Bouw dagelijkse activiteiten (school, werk, schermtijd, huishouden) stap voor stap op, in het tempo dat de symptomen toelaten.',
     'Verhoog de belasting alleen als de vorige stap minimaal 24 uur geen toename van klachten (hoofdpijn, duizeligheid, concentratieproblemen) heeft gegeven. Neem bij twijfel contact op met een arts.', array['hersenschudding', 'rust', 'cognitief'])
    returning id into v_ex_activiteit_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, tags) values
    ('reva', 'Niet-contact trainingsonderdelen', 'anders',
     'Neem deel aan trainingsonderdelen zonder enige kans op hoofdcontact (bv. passing- en looponderdelen, geen kopballen of duels).',
     'Uitsluitend in overleg met een arts en trainer. Bouw pas op naar contactmomenten na uitdrukkelijke medische goedkeuring.', array['hersenschudding', 'sportspecifiek'])
    returning id into v_ex_niet_contact;

  -- ══════════════════════════════════════════════════════════════════════
  -- 1. Oefeningen ophalen (hergebruikt)
  -- ══════════════════════════════════════════════════════════════════════

  select id into v_ex_quad from public.exercise_library where scope = 'reva' and title = 'Quadriceps aanspanning';
  select id into v_ex_slr from public.exercise_library where scope = 'reva' and title = 'Rechtebeen-hef';
  select id into v_ex_enkelpompen from public.exercise_library where scope = 'reva' and title = 'Enkelpompen';
  select id into v_ex_minisquat from public.exercise_library where scope = 'reva' and title = 'Mini squat (0 tot 45°)';
  select id into v_ex_wandzit from public.exercise_library where scope = 'reva' and title = 'Wandzit (wall sit)';
  select id into v_ex_stepup from public.exercise_library where scope = 'reva' and title = 'Step-up op opstapje';
  select id into v_ex_hamstringcurl from public.exercise_library where scope = 'reva' and title = 'Hamstringcurl (liggen)';
  select id into v_ex_terminalext from public.exercise_library where scope = 'reva' and title = 'Terminalextensie met band';
  select id into v_ex_hometrainer from public.exercise_library where scope = 'reva' and title = 'Fietsen op hometrainer';
  select id into v_ex_wandelen_buiten from public.exercise_library where scope = 'reva' and title = 'Wandelen buiten (opbouwend)';
  select id into v_ex_eenbenige_balans from public.exercise_library where scope = 'reva' and title = 'Eenbenige balans';
  select id into v_ex_wiebelbord from public.exercise_library where scope = 'reva' and title = 'Wiebelbord balanstraining';
  select id into v_ex_bulgaarse_split from public.exercise_library where scope = 'reva' and title = 'Bulgaarse split squat';
  select id into v_ex_cutting from public.exercise_library where scope = 'reva' and title = 'Richtingsveranderingen (cutting drill)';
  select id into v_ex_hardlopen_opbouw from public.exercise_library where scope = 'reva' and title = 'Hardlopen opbouwschema';
  select id into v_ex_sportspecifiek from public.exercise_library where scope = 'reva' and title = 'Sportspecifieke balvaardigheid';

  select id into v_ex_wandelen_laag_tempo from public.exercise_library where scope = 'reva' and title = 'Loopband wandelen (laag tempo)';
  select id into v_ex_hometrainer2 from public.exercise_library where scope = 'reva' and title = 'Fietsen op hometrainer';
  select id into v_ex_teamtraining from public.exercise_library where scope = 'reva' and title = 'Volledige training meelopen';

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: Kniebandletsel (MCL, voetbal) — 3 fases
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'mcl_sprain', 'Herstelplan kniebandletsel MCL (voetbal)',
    'Herstelplan voor een conservatief behandelde mediale kniebandblessure (MCL, graad I-II) bij voetballers, van bescherming tegen zijwaartse belasting tot volledige sprint- en sportterugkeer (ca. 6-10 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en pijnreductie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en pijnreductie',
    'De mediale kniebanden beschermen tegen zijwaartse (valgus-)belasting terwijl pijn en zwelling afnemen.',
    'Week 0-2',
    array['Valgus-belasting (zijwaartse druk op de knie)', 'Draaien op het belaste been', 'Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij lopen duidelijk afgenomen', 0),
    (v_phase, 'Volledige knie-extensie mogelijk', 1),
    (v_phase, 'Zwelling afgenomen', 2),
    (v_phase, 'Quadriceps actief aan te spannen', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Lopen zonder hinken', 0),
    (v_phase, 'Eerste stap zonder brace of steun (indien gebruikt)', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Vermijd zijwaartse belasting op de knie',
     'Bewegingen die de knie zijwaarts belasten (valgus-belasting) kunnen de mediale kniebanden verder beschadigen. Een brace kan in deze fase tijdelijk extra zijwaartse stabiliteit geven — volg hierin het advies van je fysiotherapeut.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — kniebandletsel MCL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_quad, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_slr, 1, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelpompen, 2, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_minisquat, 3, 3, 10, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Mobiliteit en kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Mobiliteit en kracht',
    'Volledige mobiliteit herwinnen en symmetrische kracht in quadriceps en hamstrings opbouwen voor een stabiele knie.',
    'Week 2-6',
    array['Hardlopen', 'Springen', 'Richtingsveranderingen', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige mobiliteit hersteld', 0),
    (v_phase, 'Lopen zonder hulpmiddel', 1),
    (v_phase, 'Mini squat tot 90° pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer', 0),
    (v_phase, 'Eerste wandeling buiten', 1),
    (v_phase, 'Traplopen zonder pijn', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Symmetrische kracht rond de knie',
     'Zowel quadriceps- als hamstringkracht dragen bij aan de stabiliteit van de knie. Bouw beide gelijkmatig op — eenzijdige kracht kan de mediale kniebanden juist extra belasten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en kracht — kniebandletsel MCL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_wandzit, 0, 3, null, 30, null),
    (v_schedule, v_ex_stepup, 1, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hamstringcurl, 2, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_terminalext, 3, 3, 15, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_hometrainer, 4, null, null, 600, null),
    (v_schedule, v_ex_wandelen_buiten, 5, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht, stabiliteit en terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht, stabiliteit en terugkeer naar sport',
    'Kracht en stabiliteit rond de knie verder opbouwen en richtingsveranderingen en hardlopen trainen als voorbereiding op sportterugkeer.',
    'Week 6-10',
    array['Wedstrijden zonder goedkeuring fysiotherapeut of trainer'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht minimaal 90% van het andere been', 0),
    (v_phase, 'Balans op één been minimaal 30 seconden', 1),
    (v_phase, 'Richtingsveranderingen zonder instabiliteitsgevoel', 2),
    (v_phase, 'Hoptest-symmetrie boven 90%', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder pijn', 0),
    (v_phase, 'Eerste sportspecifieke training afgerond', 1),
    (v_phase, 'Terug op het veld voor een wedstrijd', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Stabiliteitstraining blijft belangrijk',
     'Bij een MCL-blessure is gerichte stabiliteitstraining rond de knie cruciaal om herbelasting bij richtingsveranderingen te voorkomen. Blijf ook na terugkeer balans- en stabiliteitsoefeningen als onderhoud doen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifieke training — kniebandletsel MCL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_eenbenige_balans, 0, 3, null, 30),
    (v_schedule, v_ex_wiebelbord, 1, 3, null, 30),
    (v_schedule, v_ex_bulgaarse_split, 2, 3, 8, null),
    (v_schedule, v_ex_cutting, 3, 3, 6, null),
    (v_schedule, v_ex_hardlopen_opbouw, 4, null, null, 1200),
    (v_schedule, v_ex_sportspecifiek, 5, null, null, 1200);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Hersenschudding (voetbal) — 4 fases, gefaseerde return-to-play
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'concussion', 'Herstelplan hersenschudding (voetbal)',
    'Bewust conservatief, gefaseerd terugkeerprotocol na een hersenschudding, gebaseerd op het internationaal erkende "return to sport"-model: rust en symptoommonitoring, lichte aerobe activiteit, sportspecifieke training zonder impact en tot slot volledige, medisch goedgekeurde terugkeer. Elke stap vereist minimaal 24 uur zonder toename van klachten voordat de volgende stap gezet mag worden. Dit protocol vervangt op geen enkele manier medische beoordeling.',
    false)
  returning id into v_protocol;

  -- Fase 1: Rust en symptoommonitoring
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Rust en symptoommonitoring',
    'Acute symptomen (hoofdpijn, duizeligheid, concentratieproblemen) laten afnemen en dagelijkse activiteiten uitsluitend geleidelijk hervatten, zonder ze te verergeren.',
    'Dag 1 t/m klachtenvrij',
    array['Fysieke inspanning', 'Sporten', 'Intensief cognitief werk of schermtijd bij toename van klachten', 'Autorijden (bij aanhoudende klachten)'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Acute symptomen nemen af in rust', 0),
    (v_phase, 'Geen verergering van klachten bij lichte dagelijkse activiteiten', 1),
    (v_phase, 'Minimaal 24 uur zonder toename van symptomen', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste symptoomvrije dag', 0),
    (v_phase, 'Dagelijkse activiteiten hervat zonder verergering', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Geen enkele stap zonder 24 uur klachtenvrij',
     'Bij een hersenschudding is er geen ruimte om te trainen of te sporten met klachten. Elke volgende stap in dit protocol mag pas gezet worden nadat de huidige stap minimaal 24 uur zonder toename van symptomen is doorlopen. Neem bij aanhoudende of verergerende klachten altijd contact op met een arts, en laat de uiteindelijke terugkeer naar wedstrijdsport altijd medisch beoordelen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Rust en opbouw dagelijkse activiteiten — hersenschudding') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescription_note) values
    (v_schedule, v_ex_activiteit_opbouw, 0, 'Dagelijks te herhalen, opbouw volledig op geleide van de symptomen');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Lichte aerobe activiteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Lichte aerobe activiteit',
    'Voorzichtig starten met lichte, laag-intensieve aerobe inspanning (wandelen, fietsen) zonder enig risico op hoofdcontact.',
    'Vanaf 24 uur symptoomvrij',
    array['Sporten met kans op hoofdcontact', 'Krachttraining', 'Activiteiten die symptomen verergeren'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Lichte inspanning zonder toename van symptomen gedurende minimaal 24 uur', 0),
    (v_phase, 'Hartslag mag oplopen zonder dat klachten terugkeren', 1);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste lichte cardiosessie zonder klachten', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bouw intensiteit heel geleidelijk op',
     'Verhoog tempo en duur van wandelen of fietsen stap voor stap. Keert een klacht terug, ga dan een stap terug in het protocol en wacht opnieuw minimaal 24 uur voordat je opnieuw probeert op te bouwen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Lichte aerobe opbouw — hersenschudding') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_duration_seconds, prescription_note) values
    (v_schedule, v_ex_wandelen_laag_tempo, 0, 600, 'Laag, gelijkmatig tempo'),
    (v_schedule, v_ex_hometrainer2, 1, 600, 'Lage weerstand, laag tempo');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Sportspecifieke training zonder impact
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Sportspecifieke training zonder impact',
    'Sportspecifieke bewegingen en niet-contact trainingsonderdelen hervatten, uitsluitend zonder enig risico op hoofdcontact.',
    'Vanaf 24 uur symptoomvrij op vorige stap',
    array['Kopballen', 'Duels en contactmomenten', 'Sparren of tackelen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sportspecifieke bewegingen (lopen, draaien, sprinten) zonder symptomen', 0),
    (v_phase, 'Niet-contact trainingsonderdelen zonder klachten', 1),
    (v_phase, 'Medische goedkeuring voor de volgende stap', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Volledige sportspecifieke training zonder contact afgerond', 0);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Uitsluitend in overleg met een arts en trainer',
     'Deze fase mag alleen worden doorlopen in nauw overleg met een arts en trainer. Bouw pas op naar contactmomenten na uitdrukkelijke medische goedkeuring — niet op eigen initiatief of alleen op advies van de fysiotherapeut.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifiek zonder impact — hersenschudding') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescription_note) values
    (v_schedule, v_ex_sportspecifiek, 0, 'Zonder kopballen, duels of contactmomenten'),
    (v_schedule, v_ex_niet_contact, 1, 'Alleen na overleg met arts en trainer');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Volledige terugkeer naar training en wedstrijd
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Volledige terugkeer naar training en wedstrijd',
    'Volledige, medisch goedgekeurde terugkeer naar training met contact en uiteindelijk wedstrijdsport.',
    'Vanaf medische goedkeuring',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Uitdrukkelijke medische goedkeuring voor volledig contact', 0),
    (v_phase, 'Volledig meetrainen zonder klachten', 1),
    (v_phase, 'Geen symptomen na wedstrijdbelasting', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige contacttraining afgerond', 0),
    (v_phase, 'Eerste wedstrijd na de hersenschudding gespeeld', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf alert, ook na terugkeer',
     'Meld nieuwe of terugkerende klachten na terugkeer altijd direct — na een hersenschudding is het risico op een nieuwe hersenschudding tijdelijk verhoogd, en eerdere hersenschuddingen vragen om extra voorzichtigheid.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Volledige terugkeer — hersenschudding') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescription_note) values
    (v_schedule, v_ex_teamtraining, 0, 'Volledig, inclusief contactmomenten, na medische goedkeuring');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
