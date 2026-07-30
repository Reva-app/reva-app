-- 053_protocol_seed_reva_acl_knee.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- De protocollen, fases, criteria, mijlpalen en oefeningen die deze migratie
-- toevoegt zijn samengesteld als redelijk startpunt (o.a. gebaseerd op de
-- bestaande hardcoded templates in lib/mijlpalenTemplates.ts en
-- lib/trainingTemplates.ts), maar zijn NIET geverifieerd door een
-- bevoegd fysiotherapeut of getoetst aan actuele wetenschappelijke
-- literatuur/richtlijnen. Ze mogen NIET aan echte patiënten worden
-- toegewezen totdat een fysiotherapeut de inhoud (weekindicaties, criteria,
-- belastingopbouw) heeft gecontroleerd en goedgekeurd. De portal-UI toont
-- daarom een "Nog niet klinisch gereviewd"-badge op elk protocol waarvan
-- `clinically_reviewed = false` (zie protocolService.ts).
-- ============================================================================
--
-- Bouwt de eerste twee REVA-standaardprotocollen: ACL-reconstructie en
-- totale knieprothese (zie docs/REVA-V2-MASTERPLAN.md §20 Fase 5 — bewust
-- eerst 2 van de uiteindelijk 6 protocollen, structuur is al geschikt voor
-- alle 6). Scope voor deze content is uitsluitend 'reva' (organization_id
-- null) — elke organisatie kan dit lezen/dupliceren via is_org_member(),
-- niemand buiten platform-admins kan het rechtstreeks wijzigen
-- (can_manage_org_protocols met scope='reva' vereist is_platform_admin()).

alter table public.protocols
  add column if not exists clinically_reviewed boolean not null default false;

do $$
declare
  -- Gedeelde oefening (komt in beide protocollen voor)
  v_ex_quad uuid;
  -- ACL-specifieke oefeningen
  v_ex_slr uuid;
  v_ex_enkelcirkel uuid;
  v_ex_hielhef uuid;
  v_ex_minisquat uuid;
  v_ex_loopband uuid;
  v_ex_hamstringcurl uuid;
  v_ex_terminalext uuid;
  -- Knieprothese-specifieke oefeningen
  v_ex_enkelpompen uuid;
  v_ex_hielglijden uuid;
  v_ex_knie_ext_zittend uuid;
  v_ex_looprek uuid;
  v_ex_traplopen uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Gedeelde oefeningenbibliotheek (REVA-schaal) ─────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Quadriceps aanspanning', 'kracht',
     'Ga op je rug liggen met gestrekte benen. Span de quadriceps van het aangedane been aan alsof je de knieholte in de mat duwt. Houd 5 seconden vast, ontspan.',
     'Altijd pijnvrij uitvoeren — basisoefening, geschikt vanaf de eerste dagen na blessure of operatie.', 3, 15, 'Lichaamsgewicht')
    returning id into v_ex_quad;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Rechtebeen-hef', 'kracht',
     'Lig op de rug. Buig het gezonde been, houd het aangedane been gestrekt. Til het gestrekte been op tot de hoogte van de gebogen knie, houd 2 seconden vast en laat langzaam zakken.',
     'Versterkt de heupbuiger en quadriceps zonder kniebelasting.', 3, 12, 'Lichaamsgewicht')
    returning id into v_ex_slr;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Enkelcirkel (zittend)', 'mobiliteit',
     'Zit op een stoel. Til de voet van het aangedane been iets op en draai langzaam cirkels met de enkel: 10× met de klok mee en 10× tegen de klok in.',
     'Verbetert doorbloeding en beweeglijkheid. Rustig en bewust bewegen.', 2, 10, 'Lichaamsgewicht')
    returning id into v_ex_enkelcirkel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Hielhef (staand)', 'kracht',
     'Sta rechtop, houd je vast aan een stoel of muur voor balans. Hef beide hielen langzaam omhoog, houd 2 seconden vast en laat rustig zakken.',
     'Bouw af naar één been zodra de kracht dit toelaat.', 3, 15, 'Lichaamsgewicht')
    returning id into v_ex_hielhef;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Mini squat (0 tot 45°)', 'kracht',
     'Sta met voeten schouderbreedte uit elkaar. Buig de knieën langzaam tot ca. 45° terwijl je de romp rechtop houdt. Houd 2 seconden vast en kom langzaam terug.',
     'Niet dieper dan 45° in de eerste 6 weken na de blessure — knieën in lijn met de tenen.', 3, 12, 'Lichaamsgewicht')
    returning id into v_ex_minisquat;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Loopband wandelen (laag tempo)', 'conditie',
     'Wandel op een loopband of buiten op vlak terrein op comfortabel tempo. Houd een normale afwikkelbeweging aan.',
     'Stop bij pijn of significant hinken. Afstand/tijd rustig opbouwen over de weken.', null, null, 1200, null)
    returning id into v_ex_loopband;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Hamstringcurl (liggen)', 'kracht',
     'Lig op je buik. Buig het aangedane been richting de billen, houd 2 seconden vast en laat gecontroleerd zakken.',
     'Start zonder gewicht; gebruik een weerstandsband of enkelgewicht pas zodra de basiskracht is opgebouwd.', 3, 12, 'Lichaamsgewicht')
    returning id into v_ex_hamstringcurl;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Terminalextensie met band', 'kracht',
     'Maak een weerstandsband vast op kniehoogte. Doe de band om de knie van het aangedane been. Sta met lichte buiging in de knie en strek volledig, gecontroleerd terugbuigen.',
     'Traint de laatste graden extensie — belangrijk in de latere fases.', 3, 15, 'Lichte weerstandsband')
    returning id into v_ex_terminalext;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Enkelpompen', 'mobiliteit',
     'Lig op je rug met de benen gestrekt. Beweeg de voet op en neer alsof je op een gaspedaal trapt.',
     'Vermindert zwelling en verlaagt het risico op trombose direct na de operatie. Rustig en ritmisch bewegen.', 3, 20, 'Lichaamsgewicht')
    returning id into v_ex_enkelpompen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Hielglijden (heel slides)', 'mobiliteit',
     'Lig op je rug. Schuif de hiel van het geopereerde been langzaam richting de billen om de knie te buigen, en weer terug tot volledig gestrekt.',
     'Bouwt de knieflexie geleidelijk op. Gecontroleerd bewegen, niet forceren.', 3, 10, 'Lichaamsgewicht')
    returning id into v_ex_hielglijden;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Knie-extensie zittend', 'kracht',
     'Zit op een stoel met de voeten plat op de grond. Strek het geopereerde been langzaam tot het gestrekt is, houd 3 seconden vast en laat rustig zakken.',
     'Versterkt de quadriceps — essentieel voor stabiel lopen na een knieprothese.', 3, 12, 'Lichaamsgewicht')
    returning id into v_ex_knie_ext_zittend;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text) values
    ('reva', 'Lopen met looprek of rollator', 'conditie',
     'Loop korte stukken met het looprek of de rollator, met een gelijkmatig looppatroon. Zet het geopereerde been zo normaal mogelijk neer.',
     'Bouw de loopafstand elke dag rustig op zoals geadviseerd door de fysiotherapeut. Stop bij vermoeidheid of pijn.', null, null, 420, null)
    returning id into v_ex_looprek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text) values
    ('reva', 'Traplopen oefenen', 'stabiliteit',
     'Oefen traplopen met de leuning: bij omhoog eerst het niet-geopereerde been, bij omlaag eerst het geopereerde been.',
     'Volg de instructie van de fysiotherapeut over de juiste beenvolgorde. Rustig tempo, altijd onder controle.', 1, null, null)
    returning id into v_ex_traplopen;

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 1: ACL-reconstructie
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'acl', 'ACL-reconstructie herstelprotocol',
    'Standaard herstelprotocol na een voorste-kruisbandreconstructie, opgebouwd in vier fases van eerste mobilisatie tot volledige sportterugkeer.',
    false)
  returning id into v_protocol;

  -- Fase 1: Basis
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Basis', 'Pijn en zwelling onder controle brengen en de basisbeweeglijkheid herstellen.',
    array['Hardlopen', 'Springen', 'Diep buigen (>45°)'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige knie-extensie (0°) bereikt', 0),
    (v_phase, '90° knieflexie bereikt', 1),
    (v_phase, 'Pijn controleerbaar zonder medicatie', 2),
    (v_phase, 'Lopen zonder krukken', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste stap gezet na operatie', 0),
    (v_phase, 'Zwelling grotendeels verminderd', 1),
    (v_phase, 'Lopen zonder krukken', 2),
    (v_phase, 'Zelfstandig traplopen (met leuning)', 3);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Basisoefeningen', 5, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_quad, 0, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_slr, 1, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_enkelcirkel, 2, 2, 10, 'Lichaamsgewicht');

  -- Fase 2: Beweging
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Beweging', 'Mobiliteit verder uitbreiden en starten met lichte functionele belasting.',
    array['Hardlopen', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '120° knieflexie bereikt', 0),
    (v_phase, 'Traplopen zonder leuning', 1),
    (v_phase, 'Balans op één been (10 seconden)', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer (20 min)', 0),
    (v_phase, 'Squat zonder pijn', 1),
    (v_phase, 'Eerste wandeling buiten (30 min)', 2);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Opbouw kracht en mobiliteit', 4, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_hielhef, 0, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_minisquat, 1, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_loopband, 2, null, null, 1200, null);

  -- Fase 3: Kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht', 'Spierkracht en uithoudingsvermogen opbouwen richting sportspecifieke belasting.',
    array['Sprinten', 'Springen en landen', 'Richtingsveranderingen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '80% spierkracht t.o.v. andere been', 0),
    (v_phase, 'Volledige mobiliteit hersteld', 1),
    (v_phase, 'Geen pijn bij dagelijkse beweging', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, '60% spierkracht t.o.v. andere been', 0),
    (v_phase, 'Licht joggen pijnvrij (5 min)', 1),
    (v_phase, 'Hardlopen op vlakke ondergrond (15 min)', 2);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Krachtopbouw', 4, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_hamstringcurl, 0, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_terminalext, 1, 3, 15, 'Lichte weerstandsband');

  -- Fase 4: Terugkeer
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer', 'Geleidelijke, begeleide terugkeer naar volledige sportbeoefening.', array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Springen en landen pijnvrij', 0),
    (v_phase, 'Geen instabiliteitsgevoel', 1),
    (v_phase, 'Eerste volledige training afgerond', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste lichte sportactiviteit', 0),
    (v_phase, 'Eerste wedstrijd of intensieve sessie', 1),
    (v_phase, 'Terug op oud niveau', 2);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Sportspecifieke training', 3, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_minisquat, 0, 4, 15, 'Lichte halterstang'),
    (v_schedule, v_ex_terminalext, 1, 4, 20, 'Zware weerstandsband');

  -- ══════════════════════════════════════════════════════════════════════
  -- Protocol 2: Totale knieprothese
  -- ══════════════════════════════════════════════════════════════════════

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'total_knee_replacement', 'Totale knieprothese herstelprotocol',
    'Standaard herstelprotocol na plaatsing van een totale knieprothese, van wondgenezing en mobilisatie tot volledige zelfstandigheid.',
    false)
  returning id into v_protocol;

  -- Fase 1: Basis
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Basis', 'Wondgenezing bewaken en de eerste mobilisatie veilig opbouwen.',
    array['Knielen op het geopereerde been', 'Draaien op één been'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wond genezen zonder infectie', 0),
    (v_phase, 'Volledige knie-extensie (0°) bereikt', 1),
    (v_phase, '90° knieflexie bereikt', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Pijn onder controle met medicatie', 0),
    (v_phase, 'Zwelling onder controle', 1),
    (v_phase, 'Lopen met looprek of rollator', 2),
    (v_phase, 'Traplopen met leuning', 3);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Basisoefeningen', 5, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_enkelpompen, 0, 3, 20, 'Lichaamsgewicht'),
    (v_schedule, v_ex_quad, 1, 3, 15, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hielglijden, 2, 3, 10, 'Lichaamsgewicht');

  -- Fase 2: Beweging
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Beweging', 'Zelfstandigheid in dagelijkse activiteiten uitbreiden.',
    array['Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '110° knieflexie bereikt', 0),
    (v_phase, 'Lopen met kruk(ken) binnenshuis', 1),
    (v_phase, 'Zelfstandig aan- en uitkleden', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen op hometrainer', 0),
    (v_phase, 'Autorijden hervat', 1);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Mobiliteit en kracht', 4, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_knie_ext_zittend, 0, 3, 12, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_looprek, 1, null, null, 420, null);

  -- Fase 3: Kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht', 'Kracht en zelfstandig lopen zonder hulpmiddel opbouwen.',
    array['Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, '120° knieflexie bereikt', 0),
    (v_phase, 'Lopen zonder hulpmiddel', 1),
    (v_phase, 'Zelfstandig traplopen zonder leuning', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Quadricepskracht grotendeels hersteld', 0),
    (v_phase, 'Wandelen > 30 minuten pijnvrij', 1);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Krachtopbouw', 4, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_traplopen, 0, 1, null, 'Dagelijks oefenen, rustig tempo'),
    (v_schedule, v_ex_knie_ext_zittend, 1, 3, 15, 'Verhoog t.o.v. fase 2 zodra pijnvrij');

  -- Fase 4: Terugkeer
  insert into public.protocol_phases (protocol_id, sort_order, name, description, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer', 'Terugkeer naar volledige zelfstandigheid in dagelijkse en lichte recreatieve activiteiten.', array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wandelen > 30 minuten pijnvrij zonder hulpmiddel', 0),
    (v_phase, 'Geen zwelling na belasting', 1),
    (v_phase, 'Balans stabiel', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Fietsen buiten mogelijk', 0),
    (v_phase, 'Zwemmen hervat', 1),
    (v_phase, 'Huishoudelijke taken zonder beperking', 2),
    (v_phase, 'Terug op oud activiteitenniveau', 3);

  insert into public.protocol_phase_schedules (phase_id, title, frequency_per_week, sort_order)
  values (v_phase, 'Onderhoud en conditie', 3, 0)
  returning id into v_schedule;

  insert into public.protocol_phase_schedule_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescription_note) values
    (v_schedule, v_ex_traplopen, 0, 1, null, 'Onderhoudsniveau, twee tot drie keer per week volstaat');

end $$;

notify pgrst, 'reload schema';
