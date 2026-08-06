-- 094_protocol_variant_meniscus_rotatorcuff_ankleligament.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Deze migratie voegt drie ALTERNATIEVE REVA-herstelplannen toe naast de
-- bestaande protocollen uit migraties 078/079, om meer variatie te bieden
-- binnen dezelfde injury_category. NIET geverifieerd door een bevoegd
-- fysiotherapeut — clinically_reviewed blijft false, mag niet aan echte
-- patiënten worden toegewezen totdat een fysiotherapeut de inhoud heeft
-- gecontroleerd.
-- ============================================================================
--
-- Meniscus (partiële meniscectomie): het bestaande protocol (migratie 078,
-- 'Meniscusoperatie herstelprotocol') is gemodelleerd naar een
-- meniscushechting — het klinisch veeleisendste scenario. Dit nieuwe
-- protocol richt zich juist op een partiële meniscectomie (verwijderen van
-- gescheurd weefsel, geen hechting), waarbij vrijwel direct volledig mag
-- worden belast en er geen hechtnaad hoeft te worden beschermd — een
-- aanzienlijk sneller en minder restrictief traject (ca. 4-6 weken i.p.v.
-- 10-14 weken).
--
-- Rotator cuff (subacromiale decompressie): het bestaande protocol
-- (migratie 078, 'Rotator cuff schouderoperatie herstelprotocol') is
-- gemodelleerd naar een peeshechting, met een klassieke sling-fase van zes
-- weken. Dit nieuwe protocol richt zich op een subacromiale decompressie /
-- bursitis-operatie — geen peesreconstructie, dus geen sling-bescherming of
-- passief-alleen-fase nodig. Actieve mobilisatie mag vrijwel direct starten
-- (ca. 8-10 weken i.p.v. 5-6 maanden).
--
-- Enkelbandletsel (ankle_ligament, versneld/topsport-traject): het bestaande
-- protocol (migratie 079, 'Enkelbandletsel herstelprotocol
-- (chronisch/operatief)') beschrijft het standaardtraject (14-16 weken).
-- Dit nieuwe protocol is een versneld traject voor competitieve/high-level
-- sporters met intensieve, frequente begeleiding en strengere
-- voortgangscriteria, resulterend in een merkbaar kortere tijdlijn
-- (ca. 10-12 weken) — uitdrukkelijk alleen geschikt onder nauwlettend
-- fysiotherapeutisch toezicht.
--
-- Alle oefeningen in deze migratie zijn NIEUW toegevoegd aan de gedeelde
-- REVA-oefeningenbibliotheek (zelfstandig binnen dit bestand aangemaakt,
-- niet opgezocht in de bestaande ~100-item bibliotheek) om conflicten met
-- eventueel parallel werk aan andere categorieën te vermijden.

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 1: Partiële meniscectomie (meniscus) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_quad_activatie uuid;
  v_ex_actieve_rom uuid;
  v_ex_belast_lopen uuid;
  v_ex_enkelpompen uuid;
  v_ex_hometrainer_licht uuid;
  v_ex_squat_diep uuid;
  v_ex_stepup_functioneel uuid;
  v_ex_traplopen_zonder_leuning uuid;
  v_ex_uitvalspas uuid;
  v_ex_fietsen_buiten uuid;
  v_ex_stepdown uuid;
  v_ex_bulgaarse_split_licht uuid;
  v_ex_eenbenige_balans uuid;
  v_ex_joggen_kort uuid;
  v_ex_wiebelbord uuid;
  v_ex_richtingsveranderingen uuid;
  v_ex_sprong_land_kort uuid;
  v_ex_sportspecifiek uuid;
  v_ex_onderhoud_kracht uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Quadriceps activatie, vroege fase', 'kracht',
     'Ga op je rug liggen met het geopereerde been gestrekt. Span de bovenbeenspier (quadriceps) aan alsof je de knieholte in de mat drukt. Houd 5 seconden vast en ontspan.',
     'Mag vanaf de eerste dag na de operatie pijnvrij worden uitgevoerd. Bij een partiële meniscectomie is er geen hechting die dit belemmert.', 3, 15, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_quad_activatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Actieve kniebuiging in zit', 'mobiliteit',
     'Zit op de rand van een stoel of bed. Buig en strek de knie van het geopereerde been actief en gecontroleerd, zo ver als comfortabel is.',
     'In tegenstelling tot na een meniscushechting is er geen beperking in buigingshoek. Ga zo ver als pijn en zwelling toelaten.', 3, 12, array['knie', 'mobiliteit'])
    returning id into v_ex_actieve_rom;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Volledig belast lopen oefenen', 'conditie',
     'Loop rustig rond, met zoveel mogelijk gewicht op het geopereerde been als de pijn toelaat. Gebruik krukken alleen nog als extra zekerheid.',
     'Volledige belasting mag vrijwel direct na de operatie, in tegenstelling tot bij een meniscushechting. Bouw wel rustig op als de pijn dat vraagt.', 600, array['knie', 'conditie', 'lopen'])
    returning id into v_ex_belast_lopen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkelpompen na kniearthroscopie', 'mobiliteit',
     'Lig op je rug met de benen gestrekt. Beweeg de voet op en neer alsof je op een gaspedaal trapt.',
     'Bevordert de doorbloeding en verlaagt het risico op trombose in de eerste dagen na de operatie.', 3, 20, array['knie', 'mobiliteit', 'doorbloeding'])
    returning id into v_ex_enkelpompen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen op hometrainer, lage weerstand', 'conditie',
     'Fiets op een hometrainer met lage weerstand en een hoog zadel, in een rustig tempo.',
     'Goede manier om de knie soepel te bewegen en de conditie op te bouwen zodra de zwelling dit toelaat.', 600, array['knie', 'conditie'])
    returning id into v_ex_hometrainer_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Squat tot volledige diepte', 'kracht',
     'Sta met de voeten schouderbreedte uit elkaar en zak zo diep als comfortabel is door de knieën, met de romp rechtop.',
     'Bij een partiële meniscectomie is er geen hechtnaad die diepe buiging beperkt, bouw de diepte op zoals pijn en kracht dat toelaten.', 3, 12, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_squat_diep;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-up functioneel', 'kracht',
     'Stap met het geopereerde been op een opstapje of trede, strek de knie boven en stap gecontroleerd weer terug.',
     'Verhoog de hoogte van het opstapje geleidelijk naarmate kracht en stabiliteit toenemen.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht', 'functioneel'])
    returning id into v_ex_stepup_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Traplopen zonder leuning', 'stabiliteit',
     'Loop een trap op en af zonder de leuning vast te houden, in een rustig en gecontroleerd tempo.',
     'Let op een gelijkmatig looppatroon zonder hinken. Gebruik de leuning nog als steun bij twijfel.', 1, 300, array['knie', 'stabiliteit'])
    returning id into v_ex_traplopen_zonder_leuning;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Uitvalspas (lunge), gecontroleerd', 'kracht',
     'Zet een grote stap naar voren en zak door beide knieën tot een gecontroleerde hoek, kom daarna weer omhoog.',
     'Houd de romp rechtop en de voorste knie in lijn met de tenen. Bouw diepte en tempo rustig op.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_uitvalspas;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsen buiten, korte afstand', 'conditie',
     'Maak een korte fietstocht buiten op vlak terrein, in een rustig tempo.',
     'Begin met korte afstanden en bouw geleidelijk op naarmate uithoudingsvermogen en vertrouwen toenemen.', 900, array['knie', 'conditie'])
    returning id into v_ex_fietsen_buiten;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Step-down, excentrisch (meniscectomie)', 'kracht',
     'Sta op een opstapje op het geopereerde been en laat de andere voet gecontroleerd naar de grond zakken, zonder het gewicht te verplaatsen.',
     'Traint excentrische kracht rond de knie, belangrijk voor stabiliteit bij hardlopen en richtingsveranderingen.', 3, 10, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_stepdown;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Bulgaarse split squat, licht', 'kracht',
     'Zet de achterste voet op een verhoging en zak met het voorste been door de knie, kom daarna weer omhoog.',
     'Begin zonder extra gewicht en bouw pas op naarmate kracht en balans dit toelaten.', 3, 8, 'Lichaamsgewicht', array['knie', 'kracht'])
    returning id into v_ex_bulgaarse_split_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Eenbenige balanstraining (meniscectomie)', 'stabiliteit',
     'Sta op het geopereerde been en probeer je balans zo lang mogelijk vast te houden.',
     'Maak het lastiger door je ogen te sluiten of op een zachte ondergrond te staan zodra dit stabiel lukt.', 3, 30, array['knie', 'stabiliteit', 'balans'])
    returning id into v_ex_eenbenige_balans;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Joggen, opbouwschema kort', 'conditie',
     'Start met korte periodes rustig joggen afgewisseld met wandelen, op een vlakke, voorspelbare ondergrond.',
     'Bouw duur en tempo pas op als er geen zwelling of pijn optreedt na de vorige sessie.', 900, array['knie', 'conditie', 'hardlopen'])
    returning id into v_ex_joggen_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Wiebelbord balanstraining (meniscectomie)', 'stabiliteit',
     'Sta op een wiebelbord en probeer het board zo stil mogelijk te houden.',
     'Begin met beide voeten en bouw op naar één been zodra dit stabiel lukt.', 3, 30, array['knie', 'stabiliteit'])
    returning id into v_ex_wiebelbord;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Richtingsveranderingen, opbouw (meniscectomie)', 'kracht',
     'Oefen gecontroleerde richtingsveranderingen op laag tempo, bijvoorbeeld zigzaggend tussen pionnen.',
     'Bouw snelheid en scherpte van de bochten pas op zodra dit zonder instabiliteitsgevoel lukt.', 3, 6, 'Lichaamsgewicht', array['knie', 'kracht', 'sport'])
    returning id into v_ex_richtingsveranderingen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Sprong-landtechniek, kort programma', 'kracht',
     'Oefen met kleine sprongen en let bewust op een zachte, gecontroleerde landing met gebogen knieën.',
     'Focus op landingstechniek voordat je de sprongkracht of -hoogte opbouwt.', 3, 6, 'Lichaamsgewicht', array['knie', 'kracht', 'sprongen'])
    returning id into v_ex_sprong_land_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke training, opbouw (meniscectomie)', 'conditie',
     'Train bewegingen die specifiek zijn voor je sport, op een geleidelijk oplopende intensiteit.',
     'Overleg met je fysiotherapeut over het opbouwschema dat past bij jouw sport en niveau.', 1200, array['knie', 'conditie', 'sport'])
    returning id into v_ex_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudskrachttraining, twee keer per week (meniscectomie)', 'kracht',
     'Blijf twee keer per week gericht krachtwerk doen voor het geopereerde been, ook na terugkeer naar sport.',
     'Onderhoud van kracht en stabiliteit verkleint het risico op een nieuwe knieblessure.', 3, 12, array['knie', 'kracht', 'onderhoud'])
    returning id into v_ex_onderhoud_kracht;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'meniscus', 'Herstelplan partiële meniscectomie',
    'Herstelplan na een artroscopische partiële meniscectomie (verwijderen van gescheurd meniscusweefsel, geen hechting), een aanzienlijk sneller en minder beschermend traject dan bij een meniscushechting, omdat er geen hechtnaad hoeft te herstellen en vrijwel direct volledig mag worden belast. Duurt doorgaans 4 tot 6 weken. Voor een meniscushechting met een beschermende aanpak, zie het herstelplan ''Meniscusoperatie herstelprotocol''.',
    false)
  returning id into v_protocol;

  -- Fase 1: Directe belasting en zwelling beheersen
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Directe belasting en zwelling beheersen',
    'Zwelling en pijn beheersen terwijl, in tegenstelling tot bij een meniscushechting, vrijwel direct volledig gewicht mag worden belast op het been.',
    'Week 0-1',
    array['Hardlopen', 'Springen', 'Intensief sporten'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige belasting mogelijk zonder toename van pijn', 0),
    (v_phase, 'Zwelling duidelijk afgenomen ten opzichte van de eerste dagen', 1),
    (v_phase, 'Actieve extensie tot 0° bereikt', 2),
    (v_phase, 'Flexie tot minimaal 90° pijnvrij', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Volledig belast lopen zonder kruk', 0),
    (v_phase, 'Zwelling onder controle', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Sneller belasten dan bij een meniscushechting',
     'Bij een partiële meniscectomie wordt gescheurd weefsel weggeknipt in plaats van vastgehecht. Er is dus geen hechtnaad die tijd nodig heeft om vast te groeien, waardoor je knie vrijwel direct volledig mag worden belast. Dit is een belangrijk verschil met het protocol na een meniscushechting, waarbij juist bescherming van de hechting vooropstaat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Directe belasting: partiële meniscectomie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_quad_activatie, 0, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_actieve_rom, 1, 3, 12, null, null),
    (v_schedule, v_ex_belast_lopen, 2, null, null, 600, null),
    (v_schedule, v_ex_enkelpompen, 3, 3, 20, null, null),
    (v_schedule, v_ex_hometrainer_licht, 4, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Mobiliteit en functioneel herstel
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Mobiliteit en functioneel herstel',
    'Volledige mobiliteit herwinnen en functionele bewegingen zoals hurken en traplopen zonder leuning hervatten.',
    'Week 1-2',
    array['Hardlopen', 'Springen', 'Contactsport'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische flexie bereikt', 0),
    (v_phase, 'Traplopen zonder leuning mogelijk', 1),
    (v_phase, 'Hurken tot een normale diepte pijnvrij', 2),
    (v_phase, 'Lopen zonder hinken, ook buitenshuis', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Traplopen zonder leuning', 0),
    (v_phase, 'Eerste squat tot volledige diepte', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Hurken en diep buigen mogen eerder',
     'Omdat er geen hechtnaad is die beschermd moet worden, mag je knie eerder dieper buigen dan bij een meniscushechting het geval zou zijn. Laat pijn en zwelling je tempo bepalen: bouw diepte en belasting rustig op, ook al voelt de knie soms al sterk genoeg.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en functie: partiële meniscectomie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescription_note, prescribed_load_text) values
    (v_schedule, v_ex_squat_diep, 0, 3, 12, null, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_stepup_functioneel, 1, 3, 10, null, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_traplopen_zonder_leuning, 2, 1, null, 300, 'Dagelijks oefenen, rustig tempo', null),
    (v_schedule, v_ex_uitvalspas, 3, 3, 10, null, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_fietsen_buiten, 4, null, null, 900, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Kracht en stabiliteit
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Kracht en stabiliteit',
    'Symmetrische kracht opbouwen en, op geleide van pijn en zwelling, starten met joggen.',
    'Week 2-4',
    array['Springen en landen op snelheid', 'Contactsport', 'Richtingsveranderingen op snelheid'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Quadricepskracht minimaal 80% van het andere been', 0),
    (v_phase, 'Balans op één been minimaal 30 seconden', 1),
    (v_phase, 'Joggen 15-20 minuten zonder zwelling nadien', 2),
    (v_phase, 'Geen zwelling na dagelijkse activiteiten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste jogsessie zonder klachten', 0),
    (v_phase, 'Balans op instabiele ondergrond mogelijk', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht als basis voor sportterugkeer',
     'Ook al verloopt dit traject sneller dan na een meniscushechting, symmetrische kracht en stabiliteit blijven de voorwaarde voor een veilige terugkeer naar sport. Sla deze fase niet over, ook niet als de knie al goed aanvoelt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw: partiële meniscectomie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_stepdown, 0, 3, 10, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_bulgaarse_split_licht, 1, 3, 8, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_eenbenige_balans, 2, 3, null, 30, null),
    (v_schedule, v_ex_joggen_kort, 3, null, null, 900, null),
    (v_schedule, v_ex_wiebelbord, 4, 3, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport',
    'Richtingsveranderingen, sprongen en sportspecifieke bewegingen hervatten ter voorbereiding op volledige sportterugkeer.',
    'Week 4-6',
    array['Wedstrijden zonder goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptest-symmetrie boven 90%', 0),
    (v_phase, 'Richtingsveranderingen op snelheid zonder klachten', 1),
    (v_phase, 'Volledig sportspecifiek trainen zonder zwelling nadien', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige training hervat', 0),
    (v_phase, 'Terug op het oude sportniveau', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden na terugkeer',
     'Ga ook na terugkeer naar sport door met gericht kracht- en stabiliteitswerk. Dit geldt na een partiële meniscectomie net zo goed als na een meniscushechting en beperkt het risico op een nieuwe knieblessure.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sportterugkeer: partiële meniscectomie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_richtingsveranderingen, 0, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_sprong_land_kort, 1, 3, 6, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_sportspecifiek, 2, null, null, 1200, null),
    (v_schedule, v_ex_onderhoud_kracht, 3, 3, 12, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 2: Subacromiale decompressie (rotator_cuff) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_pendulum uuid;
  v_ex_actieve_flexie_zit uuid;
  v_ex_scapulaire_controle_licht uuid;
  v_ex_pols_nek_combinatie uuid;
  v_ex_wallslides_actief uuid;
  v_ex_buitenrotatie_licht uuid;
  v_ex_binnenrotatie_licht uuid;
  v_ex_scapula_retractie_actief uuid;
  v_ex_shoulderpress_licht uuid;
  v_ex_cablerow_functioneel uuid;
  v_ex_pushup_muur_knieen uuid;
  v_ex_schouderrollen_actief uuid;
  v_ex_chestpress_functioneel uuid;
  v_ex_latpulldown_licht uuid;
  v_ex_onderhoud_schouder uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Pendulum-oefening, vroege fase (decompressie)', 'mobiliteit',
     'Buig voorover en steun met de gezonde arm op een stoel of tafel. Laat de arm van de geopereerde schouder los bungelen en maak kleine, rustige cirkels.',
     'Mag al in de eerste dagen na de operatie worden gestart, er is geen hechte pees die bescherming vraagt.', 3, 60, array['schouder', 'mobiliteit'])
    returning id into v_ex_pendulum;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Actieve schouderflexie, zittend', 'mobiliteit',
     'Zit rechtop en til de arm van de geopereerde schouder actief zo ver mogelijk naar voren en omhoog, binnen een pijnvrije grens.',
     'In tegenstelling tot bij een peeshechting mag deze beweging vrijwel direct actief (zonder hulp) worden geoefend.', 3, 10, array['schouder', 'mobiliteit'])
    returning id into v_ex_actieve_flexie_zit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Scapulaire controle, licht', 'stabiliteit',
     'Zit of sta rechtop en trek de schouderbladen rustig naar elkaar toe en weer los.',
     'Houdt de schoudergordel actief en voorkomt stijfheid in de vroege fase.', 2, 12, array['schouder', 'stabiliteit'])
    returning id into v_ex_scapulaire_controle_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Polscirkels en nekrek, combinatie', 'mobiliteit',
     'Draai rustig cirkels met de pols en maak daarna een zachte rek van de nek naar beide zijden.',
     'Houdt omliggende gewrichten soepel terwijl de schouder herstelt.', 2, 10, array['schouder', 'mobiliteit'])
    returning id into v_ex_pols_nek_combinatie;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Wall slides, actief (decompressie)', 'mobiliteit',
     'Sta met de rug van de handen tegen een muur op heuphoogte en schuif ze langzaam omhoog langs de muur, zo ver als comfortabel.',
     'Verbetert actief zowel de mobiliteit als de scapulaire controle in één beweging.', 3, 10, array['schouder', 'mobiliteit'])
    returning id into v_ex_wallslides_actief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Schouder buitenrotatie met lichte band (decompressie)', 'kracht',
     'Houd de elleboog tegen het lichaam in een hoek van 90° en draai de onderarm naar buiten tegen lichte weerstand van een band in.',
     'Start met een lichte band en bouw weerstand pas op als dit pijnvrij lukt.', 3, 12, 'Lichte weerstandsband', array['schouder', 'kracht'])
    returning id into v_ex_buitenrotatie_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Schouder binnenrotatie met lichte band (decompressie)', 'kracht',
     'Houd de elleboog tegen het lichaam in een hoek van 90° en draai de onderarm naar binnen tegen lichte weerstand van een band in.',
     'Zorgt voor een gebalanceerde opbouw van de spieren rond het schoudergewricht.', 3, 12, 'Lichte weerstandsband', array['schouder', 'kracht'])
    returning id into v_ex_binnenrotatie_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Scapula retractie, actief (decompressie)', 'stabiliteit',
     'Trek de schouderbladen actief naar elkaar toe alsof je een pen tussen de schouderbladen vasthoudt, en ontspan weer.',
     'Belangrijk voor een goede schouderhouding en een stabiele basis voor verdere krachtopbouw.', 3, 12, array['schouder', 'stabiliteit'])
    returning id into v_ex_scapula_retractie_actief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Shoulder press, licht gewicht (decompressie)', 'kracht',
     'Duw twee lichte gewichten of een lichte kabel vanaf schouderhoogte gecontroleerd omhoog en weer terug.',
     'Start met een licht gewicht en let op een pijnvrije, vloeiende beweging over het volledige traject.', 3, 10, 'Licht', array['schouder', 'kracht'])
    returning id into v_ex_shoulderpress_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Cabel row, functioneel (decompressie)', 'kracht',
     'Trek een kabel of band met beide armen naar het lichaam toe, met de ellebogen dicht langs het lichaam.',
     'Versterkt de rug- en schouderbladspieren die de schouder ondersteunen.', 3, 12, 'Licht tot matig', array['schouder', 'kracht'])
    returning id into v_ex_cablerow_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Push-up tegen muur of op knieën', 'kracht',
     'Voer een opdrukbeweging uit tegen een muur, of op de knieën op de grond, in een gecontroleerd tempo.',
     'Kies de variant die past bij je huidige krachtniveau en bouw geleidelijk op naar een volledige push-up.', 3, 10, 'Lichaamsgewicht', array['schouder', 'kracht'])
    returning id into v_ex_pushup_muur_knieen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Schouderrollen, actief (decompressie)', 'mobiliteit',
     'Maak rustige, ronddraaiende bewegingen met beide schouders, naar voren en naar achteren.',
     'Goede afsluiter om de schouder soepel te houden na krachttraining.', 2, 10, array['schouder', 'mobiliteit'])
    returning id into v_ex_schouderrollen_actief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Chest press, functioneel (decompressie)', 'kracht',
     'Duw twee gewichten of een kabel vanaf borsthoogte naar voren en breng ze gecontroleerd weer terug.',
     'Onderdeel van de volledige krachtopbouw richting werk- of sporthervatting.', 3, 12, 'Licht tot matig', array['schouder', 'kracht'])
    returning id into v_ex_chestpress_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Lat pulldown, licht (decompressie)', 'kracht',
     'Trek een kabel vanaf boven het hoofd gecontroleerd naar beneden richting de borst, en laat gecontroleerd weer los.',
     'Traint kracht in een bovenhoofdse positie, relevant voor werk of sport met reikbewegingen.', 3, 12, 'Licht', array['schouder', 'kracht'])
    returning id into v_ex_latpulldown_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudskrachttraining schouder (decompressie)', 'kracht',
     'Blijf twee keer per week gericht kracht- en stabiliteitswerk doen voor de schouder.',
     'Onderhoud van kracht en scapulaire controle blijft belangrijk, ook na volledige terugkeer.', 3, 12, array['schouder', 'kracht', 'onderhoud'])
    returning id into v_ex_onderhoud_schouder;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'rotator_cuff', 'Herstelplan subacromiale decompressie (schouder)',
    'Herstelplan na een subacromiale decompressie of bursitis-operatie aan de schouder, een minder ingrijpende ingreep dan een peeshechting, zonder gehechte pees die beschermd moet worden. Actieve mobilisatie mag daardoor vrijwel direct starten, in tegenstelling tot de sling-fase van zes weken bij het rotator cuff-hechtingsprotocol. Duurt doorgaans 8 tot 10 weken. Voor een peesreconstructie met sling-bescherming, zie het herstelplan ''Rotator cuff schouderoperatie herstelprotocol''.',
    false)
  returning id into v_protocol;

  -- Fase 1: Vroege mobilisatie en pijncontrole
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Vroege mobilisatie en pijncontrole',
    'Pijn en zwelling na de decompressie beheersen, terwijl actieve mobiliteit al vroeg mag worden opgebouwd omdat er geen gehechte pees is die beschermd moet worden.',
    'Week 0-2',
    array['Zwaar tillen', 'Bovenhoofdse belasting met gewicht', 'Plotselinge krachtsbelasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn onder controle in rust', 0),
    (v_phase, 'Wond genezen zonder tekenen van infectie', 1),
    (v_phase, 'Actieve flexie tot minimaal 90° bereikt', 2),
    (v_phase, 'Geen sling meer nodig voor dagelijkse activiteiten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste actieve beweging zonder sling', 0),
    (v_phase, 'Nachtrust zonder pijn mogelijk', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom deze operatie geen sling-fase nodig heeft',
     'Bij een subacromiale decompressie wordt ruimte gemaakt onder het schouderdak, maar wordt er geen pees gehecht. Er is dus geen kwetsbare hechting die met een sling beschermd moet worden zoals bij een rotator cuff-reconstructie. Actief bewegen mag hierdoor al vroeg starten en helpt zelfs om stijfheid te voorkomen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Vroege mobilisatie: subacromiale decompressie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_pendulum, 0, 3, null, 60),
    (v_schedule, v_ex_actieve_flexie_zit, 1, 3, 10, null),
    (v_schedule, v_ex_scapulaire_controle_licht, 2, 2, 12, null),
    (v_schedule, v_ex_pols_nek_combinatie, 3, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Actieve mobiliteit uitbreiden
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Actieve mobiliteit uitbreiden',
    'Volledige actieve mobiliteit herwinnen en starten met lichte scapulaire en rotator cuff-activatie.',
    'Week 2-4',
    array['Zwaar tillen', 'Contactsport', 'Bovenhoofdse krachttraining met gewicht'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Actieve flexie tot minimaal 150°', 0),
    (v_phase, 'Geen inklemmingsklachten bij dagelijkse bewegingen', 1),
    (v_phase, 'Scapulaire controle hersteld', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Arm actief boven schouderhoogte', 0),
    (v_phase, 'Autorijden hervat (in overleg met chirurg)', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen, ondanks het snellere tempo',
     'Ook al mag je sneller actief bewegen dan na een peeshechting, dat betekent niet dat elke belasting meteen mag. Bouw intensiteit en gewicht geleidelijk op en stop bij toenemende pijn of een knijpend gevoel onder het schouderdak.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Actieve mobiliteit: subacromiale decompressie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_wallslides_actief, 0, 3, 10, null),
    (v_schedule, v_ex_buitenrotatie_licht, 1, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_binnenrotatie_licht, 2, 3, 12, 'Lichte weerstandsband'),
    (v_schedule, v_ex_scapula_retractie_actief, 3, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Krachtopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Krachtopbouw',
    'Progressieve krachttraining opbouwen richting functionele en bovenhoofdse belasting, sneller dan bij een peesreconstructie, omdat er geen hechting is die extra tijd nodig heeft.',
    'Week 4-7',
    array['Contactsport', 'Onbegeleide zware bovenhoofdse belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht buiten- en binnenrotatie minimaal 80% van de andere zijde', 0),
    (v_phase, 'Boven schouderhoogte reiken zonder compensatie', 1),
    (v_phase, 'Volledige actieve mobiliteit', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Bovenhoofdse beweging zonder pijn', 0),
    (v_phase, 'Lichte gewichten tillen zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht mag hier sneller worden opgebouwd',
     'Bij deze operatie hoeft geen peesweefsel te herstellen, waardoor de krachtopbouw sneller mag verlopen dan bij een rotator cuff-reconstructie. Blijf wel bouwen in kleine stappen: overslaan van deze fase verhoogt het risico op opnieuw inklemmingsklachten.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Krachtopbouw: subacromiale decompressie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_shoulderpress_licht, 0, 3, 10, 'Licht'),
    (v_schedule, v_ex_cablerow_functioneel, 1, 3, 12, 'Licht tot matig'),
    (v_schedule, v_ex_pushup_muur_knieen, 2, 3, 10, 'Lichaamsgewicht'),
    (v_schedule, v_ex_schouderrollen_actief, 3, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar sport en werk
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar sport en werk',
    'Volledige, begeleide terugkeer naar werk of sport, inclusief bovenhoofdse belasting, met een onderhoudsprogramma om het bereikte niveau vast te houden.',
    'Week 7-10',
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
     'Een schouder die een decompressie heeft ondergaan, blijft gebaat bij regelmatig onderhoudswerk voor kracht en scapulaire controle. Blijf ook na terugkeer twee keer per week gericht oefenen om inklemmingsklachten te voorkomen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: subacromiale decompressie') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_chestpress_functioneel, 0, 3, 12, 'Licht tot matig'),
    (v_schedule, v_ex_latpulldown_licht, 1, 3, 12, 'Licht'),
    (v_schedule, v_ex_onderhoud_schouder, 2, 3, 12, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 2, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 3: Enkelbandreconstructie — versneld traject (ankle_ligament) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_enkelpompen_intensief uuid;
  v_ex_enkelcirkels_gecontroleerd uuid;
  v_ex_kniehef_actief uuid;
  v_ex_geleide_belasting uuid;
  v_ex_calfraise_hoogvolume uuid;
  v_ex_dorsiflexie_intensief uuid;
  v_ex_fietsergometer_opbouw uuid;
  v_ex_inversie_eversie_progressief uuid;
  v_ex_wiebelbord_progressief uuid;
  v_ex_optenenlopen_functioneel uuid;
  v_ex_balans_verstoring uuid;
  v_ex_agility_ladder_intensief uuid;
  v_ex_richting_laag_tempo uuid;
  v_ex_sprintopbouw uuid;
  v_ex_richting_wedstrijdsnelheid uuid;
  v_ex_belastingstest uuid;
  v_ex_preventieve_stabiliteit uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkelpompen, intensieve frequentie', 'mobiliteit',
     'Lig op je rug met de benen gestrekt. Beweeg de voet op en neer alsof je op een gaspedaal trapt, in een hoge frequentie.',
     'Wordt in dit versnelde traject meerdere keren per dag herhaald om zwelling snel te beperken en de doorbloeding te bevorderen.', 3, 20, array['enkel', 'mobiliteit'])
    returning id into v_ex_enkelpompen_intensief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkelcirkels, gecontroleerd (versneld traject)', 'mobiliteit',
     'Til de voet iets op en draai rustige, gecontroleerde cirkels met de enkel, in beide richtingen.',
     'Blijf binnen de bewegingsgrens die de chirurg heeft aangegeven. Vermijd inversie (naar binnen zwikken).', 2, 10, array['enkel', 'mobiliteit'])
    returning id into v_ex_enkelcirkels_gecontroleerd;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Kniehef zittend, actief (versneld traject)', 'kracht',
     'Zit op een stoel en til de knieën afwisselend actief op, alsof je op de plek marcheert.',
     'Houdt de rest van het been actief terwijl de enkel nog wordt beschermd.', 2, 10, 'Lichaamsgewicht', array['enkel', 'kracht'])
    returning id into v_ex_kniehef_actief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Geleide belastingsopbouw', 'mobiliteit',
     'Oefen onder direct toezicht van je fysiotherapeut met het gecontroleerd opbouwen van gewicht op het geopereerde been.',
     'Kern van het versnelde traject: frequente, direct begeleide sessies maken een sneller tempo verantwoord. Alleen onder direct toezicht van de fysiotherapeut.', 600, array['enkel', 'mobiliteit', 'begeleid'])
    returning id into v_ex_geleide_belasting;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Calf raise, hoog volume', 'kracht',
     'Sta rechtop en hef beide hielen langzaam omhoog, houd kort vast en laat gecontroleerd zakken. Herhaal in een hoog aantal herhalingen.',
     'Het hogere volume past bij het versnelde, intensief begeleide opbouwschema.', 4, 15, 'Lichaamsgewicht', array['enkel', 'kracht'])
    returning id into v_ex_calfraise_hoogvolume;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkeldorsiflexie tegen muur, intensief', 'mobiliteit',
     'Sta met de voet dicht bij een muur en buig de knie richting de muur zonder de hiel los te laten van de grond.',
     'Frequent herhaald binnen dit traject om de mobiliteit sneller dan gebruikelijk terug te winnen.', 3, 12, array['enkel', 'mobiliteit'])
    returning id into v_ex_dorsiflexie_intensief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Fietsergometer, opbouwend', 'conditie',
     'Fiets op een ergometer met geleidelijk oplopende weerstand en duur.',
     'Goede manier om conditie te onderhouden terwijl de enkelbelasting gecontroleerd wordt opgebouwd.', 900, array['enkel', 'conditie'])
    returning id into v_ex_fietsergometer_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Enkel inversie en eversie met band, progressief', 'kracht',
     'Bevestig een weerstandsband om de voet en beweeg de voet gecontroleerd naar binnen en naar buiten tegen de weerstand in.',
     'Bouw de weerstand van de band progressief op naarmate kracht en stabiliteit toenemen.', 3, 15, 'Matige weerstandsband', array['enkel', 'kracht'])
    returning id into v_ex_inversie_eversie_progressief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Wiebelbord balanstraining, progressief', 'stabiliteit',
     'Sta op een wiebelbord en probeer het board steeds langer stabiel te houden, met toenemende moeilijkheid.',
     'Bouw op van beide voeten naar één been, en van stabiele naar meer uitdagende ondergrond.', 4, 45, array['enkel', 'stabiliteit', 'balans'])
    returning id into v_ex_wiebelbord_progressief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Op tenen lopen, functioneel', 'kracht',
     'Loop een aantal meters op je tenen, met een gecontroleerd en gelijkmatig tempo.',
     'Traint functionele kuitkracht die nodig is voor hardlopen en richtingsveranderingen.', 3, 30, 'Lichaamsgewicht', array['enkel', 'kracht'])
    returning id into v_ex_optenenlopen_functioneel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Balans op instabiele ondergrond met verstoring', 'stabiliteit',
     'Sta op één been op een instabiele ondergrond terwijl een begeleider lichte, onverwachte verstoringen geeft.',
     'Simuleert belasting zoals bij sport. Alleen onder begeleiding van de fysiotherapeut uit te voeren.', 3, 45, array['enkel', 'stabiliteit'])
    returning id into v_ex_balans_verstoring;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Agility ladder, intensief', 'conditie',
     'Doorloop verschillende voetenpatronen door een agility ladder, in een oplopend tempo.',
     'Traint coördinatie en snelheid van voetplaatsing als voorbereiding op sportspecifieke bewegingen.', 600, array['enkel', 'conditie', 'sport'])
    returning id into v_ex_agility_ladder_intensief;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Richtingsveranderingen, laag tempo onder toezicht', 'kracht',
     'Oefen bochten en richtingsveranderingen op een laag, gecontroleerd tempo onder toezicht van de fysiotherapeut.',
     'Bouw snelheid pas op zodra dit zonder instabiliteitsgevoel lukt en de fysiotherapeut akkoord geeft.', 3, 8, array['enkel', 'kracht', 'sport'])
    returning id into v_ex_richting_laag_tempo;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sprintopbouw, wedstrijdspecifiek', 'conditie',
     'Bouw sprintafstand en -snelheid geleidelijk op richting wedstrijdtempo.',
     'Onderdeel van de laatste testfase voorafgaand aan volledige sportterugkeer.', 900, array['enkel', 'conditie', 'sport'])
    returning id into v_ex_sprintopbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Richtingsveranderingen op wedstrijdsnelheid', 'kracht',
     'Voer scherpe richtingsveranderingen uit op een tempo dat aansluit bij wedstrijdsituaties.',
     'Pas te starten nadat de eerdere, langzamere variant volledig pijn- en klachtenvrij is.', 3, 6, array['enkel', 'kracht', 'sport'])
    returning id into v_ex_richting_wedstrijdsnelheid;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke belastingstest', 'conditie',
     'Doorloop een testbatterij van sportspecifieke bewegingen onder toezicht van de fysiotherapeut om de belastbaarheid te beoordelen.',
     'Testmoment: bepaalt samen met de hoptest-symmetrie of volledige sportterugkeer verantwoord is.', 1200, array['enkel', 'conditie', 'test'])
    returning id into v_ex_belastingstest;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Preventieve enkelstabiliteit, onderhoud', 'stabiliteit',
     'Blijf balans- en stabiliteitsoefeningen voor de enkel doen als vast onderdeel van de warming-up.',
     'Verkleint het risico op een nieuwe verzwikking na terugkeer naar topsport.', 3, 30, array['enkel', 'stabiliteit', 'onderhoud'])
    returning id into v_ex_preventieve_stabiliteit;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'ankle_ligament', 'Herstelplan enkelbandreconstructie, versneld traject (topsport)',
    'Versneld, intensief begeleid herstelplan na een operatieve enkelbandreconstructie, specifiek voor competitieve of high-level sporters. Kenmerkt zich door frequentere begeleide sessies en strengere voortgangscriteria dan het standaardtraject, resulterend in een merkbaar kortere tijdlijn (ca. 10-12 weken in plaats van 14-16 weken). Uitdrukkelijk alleen geschikt onder intensieve, frequente begeleiding van een fysiotherapeut die de opbouw nauwlettend kan monitoren. Voor het standaardtraject, zie het herstelplan ''Enkelbandletsel herstelprotocol (chronisch/operatief)''.',
    false)
  returning id into v_protocol;

  -- Fase 1: Intensieve vroege mobilisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Intensieve vroege mobilisatie',
    'Onder intensieve, frequente begeleiding zwelling beheersen en sneller dan in het standaardtraject starten met gecontroleerde mobiliteit en belasting, binnen de grenzen die de chirurg toestaat.',
    'Week 0-2',
    array['Inversie-bewegingen (naar binnen zwikken)', 'Onbegeleide belasting buiten het schema', 'Hardlopen', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Wond genezen zonder tekenen van infectie', 0),
    (v_phase, 'Zwelling duidelijk afgenomen', 1),
    (v_phase, 'Belasten volgens het versnelde, intensief begeleide schema', 2),
    (v_phase, 'Minimaal twee begeleide sessies per week gevolgd', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste keer belast volgens versneld schema', 0),
    (v_phase, 'Eerste week intensieve begeleiding afgerond', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom dit traject sneller mag, mits goed begeleid',
     'Dit versnelde traject is uitsluitend verantwoord dankzij de intensieve, frequente begeleiding: door je fysiotherapeut vaker te zien, kan de opbouw nauwlettend worden gemonitord en direct worden bijgestuurd. Zonder deze frequente begeleiding hoort dit tempo niet gevolgd te worden, gebruik in dat geval het standaardtraject.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Intensieve vroege mobilisatie: enkelband versneld') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescription_note) values
    (v_schedule, v_ex_enkelpompen_intensief, 0, 3, 20, null, null),
    (v_schedule, v_ex_enkelcirkels_gecontroleerd, 1, 2, 10, null, null),
    (v_schedule, v_ex_kniehef_actief, 2, 2, 10, null, null),
    (v_schedule, v_ex_geleide_belasting, 3, null, null, 600, 'Onder direct toezicht van de fysiotherapeut');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Versnelde belastingopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Versnelde belastingopbouw',
    'De brace geleidelijk afbouwen en mobiliteit en belasting sneller opbouwen dan in het standaardtraject, dankzij intensieve, frequente begeleiding en monitoring.',
    'Week 2-5',
    array['Hardlopen op onvoorspelbare ondergrond', 'Inversie-bewegingen', 'Onbegeleide sportbelasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische dorsiflexie bereikt', 0),
    (v_phase, 'Lopen zonder hulpmiddel, zonder hinken', 1),
    (v_phase, 'Minimaal drie begeleide sessies per week gevolgd', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Brace afgebouwd volgens versneld schema', 0),
    (v_phase, 'Fietsen op hometrainer met weerstand', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Frequente monitoring maakt het tempo mogelijk',
     'Het hogere trainingsvolume en de snellere opbouw in deze fase zijn alleen verantwoord doordat de voortgang minstens drie keer per week direct wordt gecontroleerd. Meld toenemende instabiliteit of zwelling meteen, zodat het schema tijdig kan worden bijgesteld.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Versnelde belastingopbouw: enkelband versneld') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_calfraise_hoogvolume, 0, 4, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_dorsiflexie_intensief, 1, 3, 12, null, null),
    (v_schedule, v_ex_fietsergometer_opbouw, 2, null, null, 900, null),
    (v_schedule, v_ex_inversie_eversie_progressief, 3, 3, 15, null, 'Matige weerstandsband');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Intensieve kracht en propriocepsis
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Intensieve kracht en propriocepsis',
    'Spierkracht en propriocepsis versneld opbouwen onder intensieve begeleiding, de kern van het versnelde traject, met frequente sportspecifieke belastingstests.',
    'Week 5-9',
    array['Contactsport', 'Onbegeleide richtingsveranderingen op snelheid'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Kracht inversie/eversie minimaal 90% van de andere zijde', 0),
    (v_phase, 'Balans op instabiele ondergrond minimaal 45 seconden', 1),
    (v_phase, 'Minimaal drie tot vier begeleide sessies per week gevolgd', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Balans op instabiele ondergrond ruim boven het standaardniveau', 0),
    (v_phase, 'Eerste sportspecifieke belastingstest afgerond', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Hogere eisen voor een verantwoorde topsportterugkeer',
     'Omdat dit traject sneller verloopt, worden de voortgangscriteria in deze fase bewust strenger gehouden dan in het standaardtraject. Alleen met een grondig geteste kracht en propriocepsis is een versnelde terugkeer naar topsport verantwoord.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Intensieve kracht en propriocepsis: enkelband versneld') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescription_note) values
    (v_schedule, v_ex_wiebelbord_progressief, 0, 4, null, 45, null),
    (v_schedule, v_ex_optenenlopen_functioneel, 1, 3, null, 30, null),
    (v_schedule, v_ex_balans_verstoring, 2, 3, null, 45, 'Alleen onder begeleiding van de fysiotherapeut'),
    (v_schedule, v_ex_agility_ladder_intensief, 3, null, null, 600, null),
    (v_schedule, v_ex_richting_laag_tempo, 4, 3, 8, null, 'Onder toezicht van de fysiotherapeut');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 4: Terugkeer naar topsport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar topsport',
    'Sportspecifieke belasting op wedstrijdniveau opbouwen onder intensieve begeleiding, met een uitgebreide functionele testbatterij voorafgaand aan volledige sportterugkeer.',
    'Week 9-12',
    array['Wedstrijden zonder uitgebreide functionele testing en goedkeuring fysiotherapeut'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hoptest-symmetrie boven 95%', 0),
    (v_phase, 'Richtingsveranderingen op wedstrijdsnelheid zonder instabiliteitsgevoel', 1),
    (v_phase, 'Volledige functionele testbatterij succesvol afgerond', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Volledige functionele test succesvol afgerond', 0),
    (v_phase, 'Eerste training op wedstrijdniveau', 1),
    (v_phase, 'Terug op het oude sportniveau, via het versnelde traject', 2);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf preventief trainen, ook op het versnelde tijdpad',
     'Het risico op een nieuwe verzwikking blijft de eerste maanden na terugkeer verhoogd, en dat geldt des te meer bij een versneld traject. Bespreek met je fysiotherapeut of preventieve taping of een brace bij wedstrijdhervatting zinvol is, en blijf balans- en stabiliteitsoefeningen structureel als onderhoud doen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer naar topsport: enkelband versneld') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescription_note) values
    (v_schedule, v_ex_sprintopbouw, 0, null, null, 900, null),
    (v_schedule, v_ex_richting_wedstrijdsnelheid, 1, 3, 6, null, null),
    (v_schedule, v_ex_belastingstest, 2, null, null, 1200, 'Onder toezicht van de fysiotherapeut, testmoment'),
    (v_schedule, v_ex_preventieve_stabiliteit, 3, 3, null, 30, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

end $$;

notify pgrst, 'reload schema';
