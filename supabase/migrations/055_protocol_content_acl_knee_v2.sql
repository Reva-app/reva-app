-- 055_protocol_content_acl_knee_v2.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Deze migratie vervangt de eerste, eenvoudige REVA-protocollen voor ACL en
-- totale knieprothese (migratie 053) door een veel uitgebreidere versie:
-- meer fases (met een blessure-passend aantal, niet vast op 4), een
-- weekindicatie per fase, meer criteria/mijlpalen/oefeningen en per fase een
-- korte patiënt-educatie. De inhoud is samengesteld als een realistisch,
-- veelvoorkomend revalidatietraject (o.a. gangbare fase-indelingen en
-- weekindicaties uit de fysiotherapie-literatuur), maar is NIET geverifieerd
-- door een bevoegd fysiotherapeut. Ze mag NIET aan echte patiënten worden
-- toegewezen totdat een fysiotherapeut de inhoud heeft gecontroleerd en
-- goedgekeurd. De portal-UI toont daarom nog steeds de
-- "Nog niet klinisch gereviewd"-badge (clinically_reviewed blijft false).
-- ============================================================================
--
-- Bewust: ACL krijgt 6 fases (een lang, veelvoorkomend traject tot
-- sportterugkeer na 8-12 maanden), totale knieprothese krijgt 4 fases (een
-- korter, functioneel traject van enkele maanden) — niet elke blessure past
-- in dezelfde 4-fasenindeling.
--
-- Oefeningen blijven zoveel mogelijk herbruikbaar tussen protocollen (net
-- als "producten" in de Shopify-vergelijking): bestaande oefeningen uit
-- migratie 053 worden hergebruikt waar relevant, nieuwe oefeningen worden
-- toegevoegd aan dezelfde gedeelde reva-oefeningenbibliotheek.

do $$
declare
  -- ── Bestaande oefeningen (migratie 053), hergebruikt ────────────────────
  v_ex_quad uuid;
  v_ex_slr uuid;
  v_ex_enkelcirkel uuid;
  v_ex_hielhef uuid;
  v_ex_minisquat uuid;
  v_ex_hamstringcurl uuid;
  v_ex_terminalext uuid;
  v_ex_enkelpompen uuid;
  v_ex_hielglijden uuid;
  v_ex_knie_ext_zittend uuid;
  v_ex_traplopen uuid;

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────
  v_ex_patella_mob uuid;
  v_ex_slr_abductie uuid;
  v_ex_slr_extensie uuid;
  v_ex_stepup uuid;
  v_ex_hometrainer uuid;
  v_ex_balans_1been uuid;
  v_ex_legpress uuid;
  v_ex_lunges uuid;
  v_ex_balans_instabiel uuid;
  v_ex_hardlopen_opbouw uuid;
  v_ex_boxstepoff uuid;
  v_ex_agility_ladder uuid;
  v_ex_cutting uuid;
  v_ex_dropjump uuid;
  v_ex_sprint_intervallen uuid;
  v_ex_sportspecifiek uuid;
  v_ex_teamtraining uuid;
  v_ex_onderhoud_kracht uuid;
  v_ex_sit_to_stand uuid;
  v_ex_wandelen_buiten uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
  v_old_protocol record;
begin

  -- ══════════════════════════════════════════════════════════════════════
  -- 0. Oude ACL-/knieprothese-content opruimen
  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol-cascade ruimt fases/criteria/mijlpalen/educatie/schema-
  -- koppelingen op. Trainingsschema's in de bibliotheek die daarna nergens
  -- meer aan gekoppeld zijn (dus alleen door deze protocollen gebruikt
  -- werden) mogen ook weg — schema's die nog wél door een andere koppeling
  -- (bv. een organisatie die dit protocol al dupliceerde) gebruikt worden,
  -- blijven vanwege de ON DELETE RESTRICT op schedule_id gewoon bestaan.

  for v_old_protocol in
    select id from public.protocols
    where scope = 'reva' and injury_category in ('acl', 'total_knee_replacement')
  loop
    delete from public.protocols where id = v_old_protocol.id;
  end loop;

  delete from public.schedule_library sl
  where sl.scope = 'reva'
    and not exists (
      select 1 from public.protocol_phase_schedule_links l where l.schedule_id = sl.id
    );

  -- ══════════════════════════════════════════════════════════════════════
  -- 1. Oefeningenbibliotheek — bestaande oefeningen ophalen
  -- ══════════════════════════════════════════════════════════════════════

  select id into v_ex_quad from public.exercise_library where scope = 'reva' and title = 'Quadriceps aanspanning';
  select id into v_ex_slr from public.exercise_library where scope = 'reva' and title = 'Rechtebeen-hef';
  select id into v_ex_enkelcirkel from public.exercise_library where scope = 'reva' and title = 'Enkelcirkel (zittend)';
  select id into v_ex_hielhef from public.exercise_library where scope = 'reva' and title = 'Hielhef (staand)';
  select id into v_ex_minisquat from public.exercise_library where scope = 'reva' and title = 'Mini squat (0 tot 45°)';
  select id into v_ex_hamstringcurl from public.exercise_library where scope = 'reva' and title = 'Hamstringcurl (liggen)';
  select id into v_ex_terminalext from public.exercise_library where scope = 'reva' and title = 'Terminalextensie met band';
  select id into v_ex_enkelpompen from public.exercise_library where scope = 'reva' and title = 'Enkelpompen';
  select id into v_ex_hielglijden from public.exercise_library where scope = 'reva' and title = 'Hielglijden (heel slides)';
  select id into v_ex_knie_ext_zittend from public.exercise_library where scope = 'reva' and title = 'Knie-extensie zittend';
  select id into v_ex_traplopen from public.exercise_library where scope = 'reva' and title = 'Traplopen oefenen';

  -- ══════════════════════════════════════════════════════════════════════
  -- 2. Oefeningenbibliotheek — nieuwe oefeningen
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Patellamobilisatie', 'mobiliteit',
     'Zit of lig ontspannen met het been licht gebogen. Beweeg de knieschijf voorzichtig met de vingers omhoog/omlaag en zijwaarts.',
     'Voorkomt verstijving van het weefsel rond de knieschijf in de eerste weken. Altijd voorzichtig, nooit forceren bij pijn.', 2, 10, null)
    returning id into v_ex_patella_mob;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Zijwaartse beenhef (heupabductie)', 'kracht',
     'Lig op je zij met het aangedane been boven. Til het gestrekte been recht omhoog, houd 2 seconden vast en laat rustig zakken.',
     'Versterkt de heupabductoren — belangrijk voor een stabiel looppatroon en kniecontrole.', 3, 12, 'Lichaamsgewicht')
    returning id into v_ex_slr_abductie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Heupextensie liggend (buikligging)', 'kracht',
     'Lig op je buik met beide benen gestrekt. Til het aangedane been enkele centimeters van de mat, houd 2 seconden vast.',
     'Versterkt de bilspier, ondersteunt een stabiele heup- en knieaansturing.', 3, 12, 'Lichaamsgewicht')
    returning id into v_ex_slr_extensie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Step-up op opstapje', 'kracht',
     'Zet het aangedane been op een lage opstap (ca. 10-15 cm) en stap er gecontroleerd op, strek de knie volledig en stap rustig terug.',
     'Verhoog de hoogte van het opstapje pas als dit volledig pijnvrij en gecontroleerd lukt.', 3, 10, 'Lichaamsgewicht')
    returning id into v_ex_stepup;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Fietsen op hometrainer', 'conditie',
     'Fiets op een hometrainer met lage weerstand op een rustig tempo.',
     'Begin met een lichte trapweerstand en een niet te laag zadel — dit beperkt de kniebuiging. Bouw duur en weerstand rustig op.', null, null, 900, null)
    returning id into v_ex_hometrainer;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Balans op één been', 'stabiliteit',
     'Sta op het aangedane been met de andere voet losjes van de grond. Houd de balans, gebruik indien nodig een muur of stoel ter ondersteuning.',
     'Bouw op van vasthouden naar zelfstandig balanceren, en van een stabiele naar een instabiele ondergrond.', 3, null, 30, null)
    returning id into v_ex_balans_1been;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Leg press', 'kracht',
     'Voer de leg press uit op een fitnessapparaat, met een gecontroleerde op- en neerwaartse beweging.',
     'Start met een lichte belasting en bouw geleidelijk op onder begeleiding van de fysiotherapeut.', 3, 12, 'Licht tot matig')
    returning id into v_ex_legpress;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Uitvalspas (lunges)', 'kracht',
     'Zet een stap naar voren en buig beide knieën tot ongeveer 90°, kom daarna gecontroleerd terug naar de startpositie.',
     'Houd de romp rechtop en de voorste knie in lijn met de tenen.', 3, 10, 'Lichaamsgewicht')
    returning id into v_ex_lunges;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Balans op instabiele ondergrond', 'stabiliteit',
     'Sta op het aangedane been op een balanskussen of wiebelplank. Houd de balans terwijl je lichte bewegingen maakt met armen of het andere been.',
     'Vervolgstap op de balansoefening op stabiele ondergrond — verbetert propriocepsis en kniecontrole.', 3, null, 30, null)
    returning id into v_ex_balans_instabiel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Hardlopen opbouwschema', 'conditie',
     'Volg een geleidelijk opbouwschema van wandel-/jog-intervallen naar aaneengesloten hardlopen op vlakke ondergrond.',
     'Start met korte joggingintervallen afgewisseld met wandelen, bouw duur en tempo rustig op volgens het advies van de fysiotherapeut.', null, null, 1200, null)
    returning id into v_ex_hardlopen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Box step-off (landingstechniek)', 'kracht',
     'Stap van een lage box (10-20 cm) af en land zacht en gecontroleerd op beide voeten, met gebogen knieën.',
     'Focus op een zachte, stille landing — dit traint veilige landingstechniek als voorbereiding op springen.', 3, 8, 'Lichaamsgewicht')
    returning id into v_ex_boxstepoff;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Agility ladder basis', 'stabiliteit',
     'Voer eenvoudige voetenwerk-oefeningen uit met een agility ladder (bijv. in-in-uit-uit) op een rustig tempo.',
     'Focus op nette voetplaatsing en controle, niet op snelheid — snelheid komt in een latere fase.', 2, null, 60, null)
    returning id into v_ex_agility_ladder;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Richtingsveranderingen (cutting drill)', 'stabiliteit',
     'Loop op driekwart snelheid en verander op een gemarkeerd punt gecontroleerd van richting (45° en 90°).',
     'Bouw op van voorspelbare naar onvoorspelbare richtingsveranderingen, alleen na goedkeuring van de fysiotherapeut.', 3, 6, 'Lichaamsgewicht')
    returning id into v_ex_cutting;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Sprong-landtechniek (drop jump)', 'kracht',
     'Spring vanaf een lage verhoging en land direct in een gecontroleerde, symmetrische squat-positie op beide benen.',
     'Let op een gelijke belasting op beide benen bij landing — een asymmetrische landing kan wijzen op onvoldoende kracht of vertrouwen in het geopereerde been.', 3, 6, 'Lichaamsgewicht')
    returning id into v_ex_dropjump;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Sprint intervallen', 'conditie',
     'Wissel korte sprints (ca. 20-30 meter) af met actieve rust, op geleidelijk oplopende intensiteit.',
     'Alleen starten na het pijnvrij afronden van de hardloop-opbouw uit de vorige fase.', null, null, 900, null)
    returning id into v_ex_sprint_intervallen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Sportspecifieke balvaardigheid', 'stabiliteit',
     'Oefen sportspecifieke bewegingen met bal (dribbelen, passen, schieten) gecombineerd met richtingsveranderingen en versnellingen.',
     'Sluit zo veel mogelijk aan bij de eigen sport; overleg met de fysiotherapeut en eventueel de trainer over de specifieke invulling.', null, null, 1200, null)
    returning id into v_ex_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_load_text) values
    ('reva', 'Volledige training meelopen', 'conditie',
     'Neem geleidelijk weer deel aan de volledige teamtraining, eerst gedeeltelijk en zonder fysiek contact, daarna volledig.',
     'Bouw dit samen met de fysiotherapeut en trainer op — begin met de onderdelen zonder duel- of contactmomenten.', null)
    returning id into v_ex_teamtraining;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Onderhoudskrachttraining (functioneel)', 'kracht',
     'Voer twee tot drie keer per week een kort krachtprogramma uit gericht op been- en heupkracht (bijv. squats, step-ups, beenpers).',
     'Doel is het opgebouwde kracht- en stabiliteitsniveau vasthouden, niet verder opbouwen.', 3, 12, null)
    returning id into v_ex_onderhoud_kracht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Opstaan vanuit zit (sit-to-stand)', 'kracht',
     'Ga zitten op een stevige stoel met de voeten plat op de grond. Kom omhoog tot volledig staand zonder de handen te gebruiken, en ga rustig weer zitten.',
     'Gebruik de armleuningen of handen als steun zolang dat nodig is, bouw dit geleidelijk af.', 3, 10, 'Lichaamsgewicht')
    returning id into v_ex_sit_to_stand;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds) values
    ('reva', 'Wandelen buiten (opbouwend)', 'conditie',
     'Wandel buiten op vlak terrein, met een rustig, gelijkmatig tempo en een zo normaal mogelijk looppatroon.',
     'Bouw de afstand en duur elke week rustig op, zoals geadviseerd door de fysiotherapeut.', 900)
    returning id into v_ex_wandelen_buiten;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: ACL-reconstructie — 6 fases, week 0 t/m sportterugkeer
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'acl', 'ACL-reconstructie herstelprotocol',
    'Uitgebreid herstelprotocol na een voorste-kruisbandreconstructie, opgebouwd in zes fases van de acute fase direct na de operatie tot volledige, begeleide terugkeer naar sport (ca. 8-12 maanden).',
    false)
  returning id into v_protocol;

  -- Fase 1: Acute fase
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Acute fase',
    'Ontsteking en zwelling onder controle brengen, wondgenezing bewaken en de knie beschermen terwijl de eerste mobiliteit en spieraansturing worden opgebouwd.',
    'Week 0-2',
    array['Hardlopen', 'Springen', 'Hurken of diep buigen', 'Draaien op één been', 'Sport hervatten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige passieve knie-extensie (0°) bereikt', 0),
    (v_phase, 'Minimaal 90° knieflexie bereikt', 1),
    (v_phase, 'Zwelling duidelijk afgenomen', 2),
    (v_phase, 'Quadriceps actief aan te spannen', 3),
    (v_phase, 'Lopen met krukken zonder hinken', 4);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stap gezet na de operatie', 0),
    (v_phase, 'Wond genezen zonder tekenen van infectie', 1),
    (v_phase, 'Zwelling onder controle', 2),
    (v_phase, 'Slapen zonder brace mogelijk (indien van toepassing)', 3);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Bescherming in de eerste weken',
     'In de eerste twee weken staat bescherming van het transplantaat voorop. Volg het brace- en belastingsadvies van je fysiotherapeut of chirurg nauwkeurig, ook als de knie zich al sterker voelt. Til het been regelmatig omhoog om zwelling te beperken en gebruik ijs volgens het advies van je behandelaar.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — ACL acute fase') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_quad, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_slr, 1, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelcirkel, 2, 2, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_patella_mob, 3, 2, 10, null),
    (v_schedule, v_ex_enkelpompen, 4, 3, 20, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Vroege mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Vroege mobilisatie',
    'Volledige beweeglijkheid herwinnen, de krukken afbouwen en starten met lichte functionele belasting.',
    'Week 2-6',
    array['Hardlopen', 'Springen', 'Contactsport', 'Zware belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Minimaal 120° knieflexie bereikt', 0),
    (v_phase, 'Lopen zonder krukken, zonder hinken', 1),
    (v_phase, 'Traplopen met leuning zonder pijn', 2),
    (v_phase, 'Balans op één been minimaal 10 seconden', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer (10 minuten)', 0),
    (v_phase, 'Squat tot 45° zonder pijn', 1),
    (v_phase, 'Eerste wandeling buiten (20 minuten)', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen, ook als het goed voelt',
     'Het is normaal dat de knie in deze fase al veel beter aanvoelt. Toch bouwt het weefsel van het transplantaat langzamer sterkte op dan de spierkracht terugkomt. Houd je aan het opbouwschema, ook als je denkt meer aan te kunnen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Opbouw kracht en mobiliteit — ACL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_hielhef, 0, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_minisquat, 1, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_slr_abductie, 2, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_slr_extensie, 3, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hometrainer, 4, null, null, 900, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht- en stabiliteitsopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht- en stabiliteitsopbouw',
    'Spierkracht symmetrisch opbouwen en de stabiliteit en controle van de knie verbeteren.',
    'Week 6-12',
    array['Hardlopen op onvoorspelbare ondergrond', 'Springen en landen', 'Richtingsveranderingen', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Quadricepskracht minimaal 70% van het andere been', 0),
    (v_phase, 'Balans op één been minimaal 30 seconden', 1),
    (v_phase, 'Geen zwelling na training', 2),
    (v_phase, 'Volledige, symmetrische mobiliteit', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Leg press met gewicht zonder pijn', 0),
    (v_phase, 'Wandelen 45 minuten pijnvrij', 1),
    (v_phase, 'Balans op instabiele ondergrond mogelijk', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht opbouwen kost tijd',
     'Symmetrische kracht tussen beide benen is een van de belangrijkste voorwaarden voor een veilige volgende fase. Dit lukt niet in een paar weken — reken op geleidelijke vooruitgang over meerdere maanden.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — ACL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_hamstringcurl, 0, 3, 12, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_terminalext, 1, 3, 15, null, 'Lichte weerstandsband'),
    (v_schedule, v_ex_legpress, 2, 3, 12, null, 'Licht tot matig'),
    (v_schedule, v_ex_lunges, 3, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_balans_1been, 4, 3, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Neuromusculaire controle & hardlopen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Neuromusculaire controle & hardlopen',
    'Hardlopen geleidelijk hervatten en dynamische stabiliteit en landingscontrole opbouwen als voorbereiding op sportspecifieke training.',
    'Week 12-20',
    array['Wedstrijdsport', 'Contactsport', 'Onvoorspelbare richtingsveranderingen op hoge snelheid'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '20 minuten hardlopen pijnvrij op vlakke ondergrond', 0),
    (v_phase, 'Symmetrische landing bij hoptest (beoordeeld door fysiotherapeut)', 1),
    (v_phase, 'Geen instabiliteitsgevoel bij dagelijkse activiteiten', 2),
    (v_phase, 'Balans op instabiele ondergrond minimaal 30 seconden', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste hardloopsessie zonder pijn', 0),
    (v_phase, 'Box step-off met gecontroleerde landing', 1),
    (v_phase, 'Agility ladder foutloos doorlopen', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Hardlopen is een tussenstap, geen eindpunt',
     'Pijnvrij kunnen hardlopen betekent niet dat de knie al klaar is voor sport — richtingsveranderingen en landingen op snelheid vragen om extra kracht en vertrouwen, die in de volgende fases worden opgebouwd.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Hardloop- en sprongopbouw — ACL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_balans_instabiel, 0, 3, null, 30, null),
    (v_schedule, v_ex_hardlopen_opbouw, 1, null, null, 1200, null),
    (v_schedule, v_ex_boxstepoff, 2, 3, 8, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_agility_ladder, 3, 2, null, 60, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 5: Sportspecifieke training
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 4, 'Fase 5: Sportspecifieke training',
    'Richtingsveranderingen, sprinten en sportspecifieke bewegingen op snelheid trainen, gericht op een veilige terugkeer naar training.',
    'Week 20-32',
    array['Wedstrijden', 'Onbegeleide contactmomenten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptesten (single, triple, cross-over) symmetrie boven 90%', 0),
    (v_phase, 'Sprinten op volle snelheid pijnvrij', 1),
    (v_phase, 'Richtingsveranderingen op snelheid zonder instabiliteit', 2),
    (v_phase, 'Voldoende vertrouwen in de knie (besproken met fysiotherapeut)', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste sprint op volle snelheid', 0),
    (v_phase, 'Eerste sportspecifieke drill zonder aarzeling', 1),
    (v_phase, 'Gedeeltelijk meetrainen met het team (zonder duels)', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Vertrouwen is net zo belangrijk als kracht',
     'Angst voor een nieuwe blessure komt vaak voor, ook als de knie fysiek klaar is. Bespreek dit gevoel met je fysiotherapeut — het hoort bij een zorgvuldige terugkeer naar sport, niet bij een gebrek aan vooruitgang.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportspecifieke training — ACL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_cutting, 0, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_dropjump, 1, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_sprint_intervallen, 2, null, null, 900, null),
    (v_schedule, v_ex_sportspecifiek, 3, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 6: Terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 5, 'Fase 6: Terugkeer naar sport',
    'Volledige, begeleide terugkeer naar training en wedstrijd, met een onderhoudsprogramma om het opgebouwde niveau vast te houden.',
    'Week 32+',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledig meegetraind zonder klachten', 0),
    (v_phase, 'Goedkeuring fysiotherapeut voor wedstrijddeelname', 1),
    (v_phase, 'Geen zwelling of instabiliteit na volledige training', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige teamtraining afgerond', 0),
    (v_phase, 'Eerste wedstrijd of intensieve sessie', 1),
    (v_phase, 'Terug op het oude sportniveau', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden, ook na terugkeer',
     'Een terugkeer naar sport is geen eindpunt — blijf ook daarna twee tot drie keer per week gericht kracht- en stabiliteitswerk doen om het risico op een nieuwe blessure te beperken.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud en conditie — ACL') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_teamtraining, 0, null, null, 'Onderdeel van geleidelijke terugkeer, in overleg met team en trainer'),
    (v_schedule, v_ex_onderhoud_kracht, 1, 3, 12, null),
    (v_schedule, v_ex_balans_1been, 2, 3, null, 'Twee tot drie keer per week volstaat als onderhoud');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Totale knieprothese — 4 fases, week 0 t/m onderhoud
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'total_knee_replacement', 'Totale knieprothese herstelprotocol',
    'Uitgebreid herstelprotocol na plaatsing van een totale knieprothese, van de ziekenhuisfase en vroege mobilisatie tot volledige functionele zelfstandigheid (ca. 3-4 maanden).',
    false)
  returning id into v_protocol;

  -- Fase 1: Ziekenhuisfase & vroege mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Ziekenhuisfase & vroege mobilisatie',
    'Pijn en zwelling onder controle brengen, de wond laten genezen en veilig starten met de eerste mobilisatie en zelfstandige transfers.',
    'Week 0-2',
    array['Knielen op het geopereerde been', 'Draaien op één been', 'Lange autoritten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wond genezen zonder tekenen van infectie', 0),
    (v_phase, 'Volledige knie-extensie (0°) bereikt', 1),
    (v_phase, 'Minimaal 90° knieflexie bereikt', 2),
    (v_phase, 'Zelfstandig transfers (bed, stoel) mogelijk', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stap gezet na de operatie', 0),
    (v_phase, 'Pijn onder controle met medicatie', 1),
    (v_phase, 'Lopen met looprek of rollator', 2),
    (v_phase, 'Traplopen met leuning (onder begeleiding)', 3);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Vroege mobilisatie versnelt herstel',
     'Hoe eerder je (onder begeleiding) weer in beweging komt, hoe kleiner de kans op stijfheid en complicaties. Voer de oefeningen voor enkelpompen en quadriceps-aanspanning al op de eerste dag na de operatie uit, ook al voelt de knie nog gevoelig.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen — knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_enkelpompen, 0, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_quad, 1, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hielglijden, 2, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_sit_to_stand, 3, 3, 10, 'Lichaamsgewicht');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 2: Functioneel herstel thuis
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Functioneel herstel thuis',
    'Zelfstandigheid in dagelijkse activiteiten uitbreiden en hulpmiddelen geleidelijk afbouwen.',
    'Week 2-6',
    array['Hardlopen', 'Springen', 'Sporten met impact'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Minimaal 110° knieflexie bereikt', 0),
    (v_phase, 'Lopen binnenshuis zonder hulpmiddel', 1),
    (v_phase, 'Zelfstandig aan- en uitkleden', 2),
    (v_phase, 'Traplopen met leuning zonder pijn', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer', 0),
    (v_phase, 'Autorijden hervat (in overleg met behandelaar)', 1),
    (v_phase, 'Eerste wandeling buitenshuis', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Dagelijkse activiteiten als oefening',
     'Gewone dagelijkse bewegingen — opstaan, lopen, traplopen — zijn in deze fase al waardevolle training. Bouw de afstand en frequentie rustig op en wissel activiteit af met rust.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en kracht — knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_knie_ext_zittend, 0, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_stepup, 1, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hometrainer, 2, null, null, 900, null),
    (v_schedule, v_ex_wandelen_buiten, 3, null, null, 900, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht en uithoudingsvermogen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht en uithoudingsvermogen',
    'Spierkracht en conditie verder opbouwen richting volledige zelfstandigheid, zonder hulpmiddel en met een stabiel looppatroon.',
    'Week 6-12',
    array['Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Minimaal 120° knieflexie bereikt', 0),
    (v_phase, 'Lopen zonder hulpmiddel, ook buitenshuis', 1),
    (v_phase, 'Traplopen zonder leuning', 2),
    (v_phase, 'Wandelen 30 minuten pijnvrij', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Quadricepskracht grotendeels hersteld', 0),
    (v_phase, 'Balans stabiel op één been', 1),
    (v_phase, 'Traplopen zonder leuning', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Zwelling na training is normaal, aanhoudende pijn niet',
     'Lichte, tijdelijke zwelling na een actieve dag is in deze fase normaal. Neem contact op met je fysiotherapeut bij aanhoudende of toenemende pijn of zwelling die niet binnen een dag afneemt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw — knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_traplopen, 0, 1, null, 'Dagelijks oefenen, rustig tempo'),
    (v_schedule, v_ex_knie_ext_zittend, 1, 3, 15, 'Verhoog t.o.v. fase 2 zodra pijnvrij'),
    (v_schedule, v_ex_balans_1been, 2, 3, null, null),
    (v_schedule, v_ex_stepup, 3, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Onderhoud en terugkeer naar activiteiten
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Onderhoud en terugkeer naar activiteiten',
    'Terugkeer naar gewenste hobby''s, lichte sport en werk, met een onderhoudsprogramma om het bereikte niveau vast te houden.',
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
    (v_phase, 'Huishoudelijke taken zonder beperking', 2),
    (v_phase, 'Terug op het gewenste activiteitenniveau', 3);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf actief, ook na deze fase',
     'Regelmatige, lichte lichaamsbeweging blijft belangrijk voor de levensduur van de prothese en je algehele conditie. Kies activiteiten met een lage impact, zoals fietsen, zwemmen of wandelen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud en conditie — knieprothese') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_onderhoud_kracht, 0, 3, 12, null),
    (v_schedule, v_ex_hometrainer, 1, null, null, 900),
    (v_schedule, v_ex_wandelen_buiten, 2, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

notify pgrst, 'reload schema';
