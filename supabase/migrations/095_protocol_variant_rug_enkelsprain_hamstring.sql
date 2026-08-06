-- 095_protocol_variant_rug_enkelsprain_hamstring.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Drie nieuwe REVA-herstelplannen als alternatieve variant naast bestaande
-- protocollen (migraties 080/081), zodat er per blessurecategorie meer dan
-- één, genuinely verschillend scenario beschikbaar is. NIET geverifieerd
-- door een bevoegd fysiotherapeut — clinically_reviewed blijft false, mag
-- niet aan echte patiënten worden toegewezen totdat een fysiotherapeut de
-- inhoud heeft gecontroleerd.
-- ============================================================================
--
-- Lage rugklachten met uitstraling (low_back_pain): in tegenstelling tot het
-- bestaande protocol "Herstelplan lage rugklachten" (aspecifieke, niet-
-- uitstralende rugpijn), richt dit protocol zich op een radiculair/discus-
-- gerelateerd beeld met uitstraling in het been. Opgebouwd volgens het
-- directional-preference (McKenzie-achtige) extensiegerichte principe:
-- flexie en langdurig zitten worden in de vroege fase vermeden, centralisatie
-- van de uitstralende pijn is een kernvoortgangscriterium, en rode vlaggen
-- (cauda-equinasyndroom) krijgen expliciete aandacht. Langere, voorzichtigere
-- opbouw dan het aspecifieke protocol (ca. 8-12 weken i.p.v. 6-10).
--
-- Enkelverzwikking hardlopen (ankle_sprain): zelfde acute inversietrauma als
-- het bestaande voetbalprotocol, maar met hardloop-specifieke functionele
-- doelen in plaats van voetbal-cutting/agility: run-walk-opbouw, geleidelijke
-- wekelijkse mijlage-opbouw en een hink-ver-test (single-leg hop for
-- distance) in plaats van richtingsveranderingen op snelheid.
--
-- Hamstringblessure proximaal graad II (hamstring_strain): een zwaardere en
-- anders gelokaliseerde variant dan het bestaande protocol (spierbuik-
-- blessure) — een proximale pees-blessure bij de zitbeenknobbel, met een
-- langere beschermende fase, expliciete waarschuwing tegen rekken en
-- langdurig zitten (peescompressie) in de vroege fase, en een voorzichtigere,
-- langere opbouw naar excentrische belasting (ca. 10-12 weken i.p.v. 6-8).
--
-- Alle drie protocollen gebruiken volledig nieuwe, zelfstandige oefeningen
-- (geen hergebruik van bestaande bibliotheekitems), zodat er geen risico is
-- op stille foreign-key-fouten door naam-mismatches met wijzigingen die
-- parallel in de gedeelde oefeningenbibliotheek worden doorgevoerd.

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 1: Lage rugklachten met uitstraling (radiculair) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_sfinx uuid;
  v_ex_persup uuid;
  v_ex_wandelen_opgericht uuid;
  v_ex_zenuwslider_been uuid;
  v_ex_plank_kort uuid;
  v_ex_vierpunt_armbeen uuid;
  v_ex_deadbug_neutraal uuid;
  v_ex_slump_slider uuid;
  v_ex_hip_hinge_stok uuid;
  v_ex_til_techniek uuid;
  v_ex_zijplank_rug uuid;
  v_ex_wandelen_opbouw uuid;
  v_ex_deadlift_licht uuid;
  v_ex_duurtraining_traag uuid;
  v_ex_onderhoud_rug uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Extensie in buiklig op ellebogen (sfinxhouding)', 'mobiliteit',
     'Lig op je buik en kom omhoog steunend op je onderarmen, met een ontspannen onderrug in lichte strekking.',
     'Houd de houding rustig aan en adem door. Deze houding mag de uitstralende pijn juist laten afnemen (centraliseren), stop als de pijn verder het been in trekt.', 3, 30, array['rug', 'mobiliteit', 'uitstraling'])
    returning id into v_ex_sfinx;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Rugstrekking in lig op handen (verlengde press-up)', 'mobiliteit',
     'Lig op je buik en duw jezelf met gestrekte armen omhoog terwijl het bekken op de mat blijft rusten.',
     'Herhaal regelmatig gedurende de dag, ook als er nog uitstraling is, zolang de pijn niet verder het been in trekt maar juist richting de rug centraliseert.', 2, 10, array['rug', 'mobiliteit', 'uitstraling'])
    returning id into v_ex_persup;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen in opgerichte houding', 'conditie',
     'Rustig wandelen met een rechtop gehouden romp, zonder voorover te buigen.',
     'Vermijd een gebogen looppatroon, een opgerichte houding ontlast de tussenwervelschijf aan de voorzijde.', 600, array['rug', 'conditie', 'uitstraling'])
    returning id into v_ex_wandelen_opgericht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Zenuwmobilisatie been (slider-techniek)', 'mobiliteit',
     'Lig op je rug en beweeg rustig en vloeiend been en nek afwisselend, zodat de zenuwbaan langs het been rustig meebeweegt (glijdt) in plaats van wordt opgerekt.',
     'Een rustige, vloeiende beweging, een lichte trekkende sensatie mag, scherpe zenuwpijn is een signaal om te stoppen.', 2, 10, array['rug', 'mobiliteit', 'uitstraling'])
    returning id into v_ex_zenuwslider_been;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Bekkenneutrale planktraining (korte hefboom)', 'kracht',
     'Steun op onderarmen en knieën (korte hefboom) en houd het bekken neutraal, zonder doorzakken in de onderrug.',
     'Bouw de duur pas op zodra de houding volledig gecontroleerd en pijnvrij lukt.', 3, 20, array['rug', 'kracht', 'core'])
    returning id into v_ex_plank_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Vierpuntssteun arm-been heffen (rugneutraal)', 'kracht',
     'Kom op handen en knieën en strek afwisselend een tegenovergestelde arm en been, terwijl de romp stabiel en neutraal blijft.',
     'Focus op het stilhouden van de romp. De beweging komt uit de heup en schouder, niet uit de rug.', 3, 10, array['rug', 'kracht', 'core'])
    returning id into v_ex_vierpunt_armbeen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Beenbuiging in lig (dead bug, rugneutraal)', 'kracht',
     'Lig op je rug met heupen en knieën in 90 graden en strek afwisselend een arm en het tegenovergestelde been, terwijl de onderrug neutraal tegen de mat blijft.',
     'Beweeg alleen zo ver als de onderrug neutraal kan blijven.', 3, 10, array['rug', 'kracht', 'core'])
    returning id into v_ex_deadbug_neutraal;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Zittende zenuwmobilisatie (slump slider)', 'mobiliteit',
     'Zit rechtop en beweeg rustig en vloeiend hoofd, rug en been in een afwisselende, gecoördineerde beweging om de zenuwbaan te mobiliseren.',
     'Rustig en vloeiend uitvoeren, nooit doorzetten tot in scherpe zenuwpijn.', 2, 10, array['rug', 'mobiliteit', 'uitstraling'])
    returning id into v_ex_slump_slider;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Romeinse heupscharnier met stok (hip hinge)', 'kracht',
     'Houd een stok langs de rug (contact bij achterhoofd, rug en stuit) en buig vanuit de heup voorover, met de rug in een neutrale positie.',
     'De stok geeft directe feedback: verlies je het contact met de rug, dan buig je vanuit de rug in plaats van de heup.', 3, 10, 'Lichaamsgewicht, focus op techniek', array['rug', 'kracht', 'tiltechniek'])
    returning id into v_ex_hip_hinge_stok;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Functionele tiltechniek (kist optillen)', 'kracht',
     'Til een lichte kist of gewicht op vanaf de grond met gebogen knieën, rechte rug en het gewicht dicht bij het lichaam.',
     'Oefen de techniek eerst met weinig gewicht, bouw pas op als de uitvoering foutloos en pijnvrij is.', 3, 8, 'Lichte kist of gewicht', array['rug', 'kracht', 'tiltechniek'])
    returning id into v_ex_til_techniek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Zijwaartse planktraining', 'kracht',
     'Steun zijwaarts op één onderarm en houd het lichaam in een rechte lijn.',
     'Houd de heup omhoog en voorkom doorzakken.', 3, 20, array['rug', 'kracht', 'core'])
    returning id into v_ex_zijplank_rug;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen met opbouw in tempo en afstand', 'conditie',
     'Wandel met geleidelijk toenemend tempo en toenemende afstand ter voorbereiding op volledige dagelijkse belasting.',
     'Bouw per week rustig op in duur of tempo, niet allebei tegelijk.', 1200, array['rug', 'conditie'])
    returning id into v_ex_wandelen_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Deadlift met lichte belasting (functioneel)', 'kracht',
     'Til een lichte halter of gewicht op vanaf de grond met correcte heupscharnier-techniek.',
     'Techniek gaat boven gewicht, verhoog de belasting alleen bij foutloze uitvoering.', 3, 8, 'Licht tot matig, techniek voorop', array['rug', 'kracht', 'onderhoud'])
    returning id into v_ex_deadlift_licht;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Rustige duurtraining (fietsen of wandelen)', 'conditie',
     'Een rustige, langdurige duurinspanning zoals fietsen of stevig wandelen.',
     'Kies een houding en tempo waarbij de rug ontspannen blijft.', 1500, array['rug', 'conditie', 'onderhoud'])
    returning id into v_ex_duurtraining_traag;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Onderhoudscircuit rugstabiliteit', 'kracht',
     'Een kort circuit van core- en rugstabiliteitsoefeningen om het opgebouwde niveau vast te houden.',
     'Twee keer per week uitvoeren als onderhoud, ook zonder klachten.', 2, 12, array['rug', 'kracht', 'onderhoud'])
    returning id into v_ex_onderhoud_rug;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'low_back_pain', 'Herstelplan lage rugklachten met uitstraling (radiculair)',
    'Herstelplan voor lage rugklachten met uitstraling in het been (radiculair/discusgerelateerd beeld), opgebouwd volgens een extensiegericht (directional-preference) principe: flexie en langdurig zitten worden in de vroege fase vermeden, en centralisatie van de uitstralende pijn is een kernvoortgangscriterium. Voor niet-uitstralende, aspecifieke rugklachten, zie het herstelplan ''Lage rugklachten'' (ca. 8-12 weken).',
    false)
  returning id into v_protocol;

  -- Fase 1: Pijncontrole en centralisatie
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Pijncontrole en centralisatie',
    'De uitstralende beenpijn laten centraliseren richting de rug door flexie en langdurig zitten te vermijden en extensiegerichte oefeningen regelmatig te herhalen.',
    'Week 0-3',
    array['Langdurig zitten', 'Voorover buigen vanuit de rug', 'Zwaar tillen', 'Hardlopen', 'Zittende hamstringstretch met gestrekte knie'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Uitstralende pijn trekt terug richting de rug (centralisatie) in plaats van verder het been in', 0),
    (v_phase, 'Geen toename van kracht- of gevoelsverlies in het been', 1),
    (v_phase, 'Rechtop staan en lopen mogelijk zonder toename van beenpijn', 2),
    (v_phase, 'Geen tekenen van cauda-equinasyndroom (controleverlies blaas/darm, zadelanesthesie)', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste keer duidelijk minder uitstraling in het been', 0),
    (v_phase, 'Langer kunnen zitten zonder toename van klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Centralisatie en rode vlaggen',
     'Een goed teken is als de pijn "centraliseert": trekt de uitstraling in het been terug richting de rug, dan gaat het de goede kant op, ook als de rugpijn zelf even wat sterker lijkt. Zoek direct medische hulp bij plotseling controleverlies over blaas of darm, een doof gevoel rond de bilnaad (zadelanesthesie), of snel toenemend krachtsverlies in het been. Dit zijn signalen van een cauda-equinasyndroom, een spoedeisende aandoening die niet bij een gewoon beloop hoort.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: lage rug met uitstraling (centralisatie)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_sfinx, 0, 3, null, 30, null),
    (v_schedule, v_ex_persup, 1, 2, 10, null, null),
    (v_schedule, v_ex_wandelen_opgericht, 2, null, null, 600, null),
    (v_schedule, v_ex_zenuwslider_been, 3, 2, 10, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Mobiliteit en motorische controle
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Mobiliteit en motorische controle',
    'Volledige extensiemobiliteit opbouwen en actieve controle over de romp trainen, terwijl flexiebelasting nog terughoudend wordt opgebouwd.',
    'Week 3-6',
    array['Zwaar tillen zonder begeleiding', 'Langdurig voorover gebogen werken', 'Plotselinge draai- of buigbewegingen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Uitstraling volledig verdwenen of beperkt tot boven de knie', 0),
    (v_phase, 'Volledige lumbale extensie zonder toename van beenklachten', 1),
    (v_phase, 'Core-oefeningen uitvoerbaar zonder provocatie van uitstraling', 2),
    (v_phase, 'Pijnvrij zitten langer dan 30 minuten', 3);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Geen uitstraling meer voorbij de knie', 0),
    (v_phase, 'Eerste volledige werkdag zonder toename van klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom flexie nog beperkt blijft',
     'Bij een discusgerelateerde oorzaak vergroot buigen van de rug (flexie) de druk aan de voorzijde van de tussenwervelschijf, wat de uitstralende pijn kan verergeren. Zolang extensie prettiger voelt dan flexie (de "directional preference"), blijft de nadruk liggen op extensiegerichte oefeningen. Flexie wordt pas in de volgende fase geleidelijk en voorzichtig geïntroduceerd.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en motorische controle: lage rug met uitstraling') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_plank_kort, 0, 3, null, 20),
    (v_schedule, v_ex_vierpunt_armbeen, 1, 3, 10, null),
    (v_schedule, v_ex_deadbug_neutraal, 2, 3, 10, null),
    (v_schedule, v_ex_slump_slider, 3, 2, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 3: Functionele kracht en belastingsopbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Functionele kracht en belastingsopbouw',
    'Algehele romp- en rugkracht opbouwen en veilige tiltechniek trainen, met geleidelijke, gecontroleerde introductie van lichte flexiebelasting.',
    'Week 6-9',
    array['Contactsport', 'Maximale krachttraining', 'Torderen (draaien) onder belasting'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische mobiliteit van rug en been', 0),
    (v_phase, 'Voldoende functionele kracht voor tillen met correcte techniek', 1),
    (v_phase, 'Langdurig zitten en staan zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Werk volledig hervat', 0),
    (v_phase, 'Eerste keer weer sporten of hobby zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Flexie voorzichtig terug opbouwen',
     'Zodra de uitstraling weg is en de rug stabiel aanvoelt, wordt lichte, gecontroleerde flexie weer voorzichtig geïntroduceerd. Vermijd nog steeds gecombineerde flexie met rotatie onder belasting (bijvoorbeeld voorover gebogen tillen en tegelijk draaien). Dit is de bewegingscombinatie met het hoogste risico op een nieuwe discusprovocatie.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Functionele kracht: lage rug met uitstraling') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_hip_hinge_stok, 0, 3, 10, null, 'Lichaamsgewicht, focus op techniek'),
    (v_schedule, v_ex_til_techniek, 1, 3, 8, null, 'Lichte kist of gewicht'),
    (v_schedule, v_ex_zijplank_rug, 2, 3, null, 20, null),
    (v_schedule, v_ex_wandelen_opbouw, 3, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Terugkeer naar volledige belasting en onderhoud
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Terugkeer naar volledige belasting en onderhoud',
    'Volledige terugkeer naar werk, sport en dagelijkse activiteiten, met een onderhoudsprogramma om het opgebouwde niveau vast te houden.',
    'Week 9-12',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige, symmetrische romp- en rugkracht', 0),
    (v_phase, 'Geen beperkingen meer in dagelijkse, werk- of sportgerelateerde bewegingen', 1),
    (v_phase, 'Zelfmanagementstrategie voor eventuele terugval helder', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Terug op het oude niveau', 0),
    (v_phase, 'Persoonlijk onderhoudsschema opgesteld', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf onderhouden om terugval te voorkomen',
     'Rugklachten met uitstraling hebben een verhoogd risico op terugval. Blijf ook na volledige terugkeer minimaal twee keer per week gericht rug- en core-kracht trainen, en herpak de extensiegerichte oefeningen uit fase 1 direct als er weer lichte uitstraling optreedt.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Onderhoud: lage rug met uitstraling') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_deadlift_licht, 0, 3, 8, null, 'Licht tot matig, techniek voorop'),
    (v_schedule, v_ex_duurtraining_traag, 1, null, null, 1500, null),
    (v_schedule, v_ex_onderhoud_rug, 2, 2, 12, null, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 2, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 2: Enkelverzwikking (hardlopen) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_enkelpompen_vroeg uuid;
  v_ex_enkelcirkels_zit uuid;
  v_ex_gewicht_overdragen uuid;
  v_ex_dorsiflex_muur uuid;
  v_ex_calfraise_opbouw uuid;
  v_ex_wiebelbord_hardlopers uuid;
  v_ex_bandwalk_enkel uuid;
  v_ex_runwalk_schema uuid;
  v_ex_hoptest_afstand uuid;
  v_ex_balans_instabiel_hardlopers uuid;
  v_ex_duurloop_opbouw uuid;
  v_ex_calfraise_onderhoud uuid;
  v_ex_balanscircuit_onderhoud uuid;
  v_ex_inplace_hops uuid;
  v_ex_cadans_drill uuid;
  v_ex_plyo_onderhoud uuid;
  v_ex_heuvelloop_onderhoud uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Enkelpompen (vroege fase, hardlopers)', 'mobiliteit',
     'Beweeg de voet rustig op en neer vanuit de enkel.',
     'Beweeg binnen de pijngrens, geen geforceerde eindstanden.', 3, 20, 'Lichaamsgewicht', array['enkel', 'mobiliteit', 'hardlopen'])
    returning id into v_ex_enkelpompen_vroeg;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Enkelcirkels zittend', 'mobiliteit',
     'Maak zittend rustige, ronddraaiende bewegingen met de voet vanuit de enkel, beide richtingen.',
     'Rustig tempo, volledige maar pijnvrije cirkel.', 2, 10, array['enkel', 'mobiliteit', 'hardlopen'])
    returning id into v_ex_enkelcirkels_zit;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Gewicht overdragen been-been (weight shifting)', 'stabiliteit',
     'Sta met beide voeten naast elkaar en verplaats het lichaamsgewicht rustig van het ene naar het andere been.',
     'Bouw op naar meer gewicht op het aangedane been zolang dit pijnvrij lukt.', 3, 20, array['enkel', 'stabiliteit', 'hardlopen'])
    returning id into v_ex_gewicht_overdragen;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Dorsiflexiemobilisatie tegen muur (knee-to-wall)', 'mobiliteit',
     'Sta met de voet voor een muur en buig de knie richting de muur zonder de hiel op te tillen, om de dorsiflexie van de enkel te vergroten.',
     'Belangrijk voor de afzetfase bij hardlopen, schuif de voet verder van de muur naarmate de mobiliteit toeneemt.', 3, 10, array['enkel', 'mobiliteit', 'hardlopen'])
    returning id into v_ex_dorsiflex_muur;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Eenbenige calf raise opbouw', 'kracht',
     'Sta op één been en kom op de bal van de voet omhoog, rustig en gecontroleerd zakken.',
     'Kuitkracht is essentieel voor de afzet bij hardlopen, bouw geleidelijk op naar volledige herhalingen zonder steun.', 3, 15, 'Lichaamsgewicht', array['enkel', 'kracht', 'hardlopen'])
    returning id into v_ex_calfraise_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Wiebelbord balanstraining (hardlopers-variant)', 'stabiliteit',
     'Sta op een wiebelbord en houd de balans, eventueel met lichte bewegingen van armen of romp als extra uitdaging.',
     'Zoek een oppervlak en houding die bij hardlopen relevant is: dynamische, functionele balans.', 3, 30, array['enkel', 'stabiliteit', 'hardlopen'])
    returning id into v_ex_wiebelbord_hardlopers;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Zijwaartse band-walk enkelstabiliteit', 'kracht',
     'Doe een weerstandsband om de enkels en loop zijwaarts in een lichte hurkpositie.',
     'Houd de spanning op de band gedurende de hele beweging, ook bij het bijtrekken van de voet.', 3, 12, 'Lichte weerstandsband', array['enkel', 'kracht', 'hardlopen'])
    returning id into v_ex_bandwalk_enkel;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Run-walk intervalschema (hardlopen/wandelen afgewisseld)', 'conditie',
     'Wissel korte periodes hardlopen af met wandelen volgens een oplopend schema, bijvoorbeeld 1 minuut hardlopen / 1 minuut wandelen.',
     'Bouw het aandeel hardlopen per week geleidelijk op, met niet meer dan ongeveer 10% toename per week.', 1200, array['enkel', 'conditie', 'hardlopen'])
    returning id into v_ex_runwalk_schema;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Sprong-voor-afstand test (single-leg hop)', 'stabiliteit',
     'Spring op één been zo ver mogelijk naar voren en land gecontroleerd op hetzelfde been.',
     'Vergelijk de afgelegde afstand met het andere been als maat voor functionele symmetrie.', 2, 3, array['enkel', 'stabiliteit', 'hardlopen', 'test'])
    returning id into v_ex_hoptest_afstand;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Eenbenige balans op instabiele ondergrond (hardlopers)', 'stabiliteit',
     'Sta op één been op een instabiele ondergrond (bijvoorbeeld een kussen of balanskussen) en houd de balans.',
     'Voeg desgewenst een lichte hoofd- of armbeweging toe voor extra uitdaging.', 3, 30, array['enkel', 'stabiliteit', 'hardlopen'])
    returning id into v_ex_balans_instabiel_hardlopers;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Duurloop met geleidelijke afstandsopbouw', 'conditie',
     'Een aaneengesloten duurloop waarbij de afstand week op week geleidelijk wordt uitgebreid.',
     'Bouw de wekelijkse afstand met niet meer dan ongeveer 10% per week op.', 1800, array['enkel', 'conditie', 'hardlopen'])
    returning id into v_ex_duurloop_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Eenbenige calf raise (onderhoud)', 'kracht',
     'Sta op één been en kom op de bal van de voet omhoog, rustig en gecontroleerd zakken.',
     'Als onderhoudsoefening te blijven doen, ook na volledige terugkeer naar hardlopen.', 3, 15, 'Lichaamsgewicht', array['enkel', 'kracht', 'onderhoud'])
    returning id into v_ex_calfraise_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, tags) values
    ('reva', 'Balans- en stabiliteitscircuit (onderhoud hardlopers)', 'stabiliteit',
     'Een kort circuit van balans- en stabiliteitsoefeningen voor de enkel, gericht op onderhoud na terugkeer naar hardlopen.',
     'Eén tot twee keer per week uitvoeren als preventief onderhoud.', 2, 30, array['enkel', 'stabiliteit', 'onderhoud'])
    returning id into v_ex_balanscircuit_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Eenbenige sprongen op de plek (impactopbouw)', 'stabiliteit',
     'Spring rustig op één been op de plek, met een zachte, gecontroleerde landing, als opbouw naar de impactbelasting van hardlopen.',
     'Begin met een klein aantal herhalingen op lage hoogte, bouw pas op als de landing volledig gecontroleerd en pijnvrij blijft.', 3, 8, array['enkel', 'stabiliteit', 'hardlopen'])
    returning id into v_ex_inplace_hops;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Cadans- en looptechniekdrill', 'conditie',
     'Oefen kortdurend op een iets hogere pasfrequentie dan gebruikelijk, met korte, lichte pasjes, om de belasting per stap te verlagen.',
     'Focus op een lichte, snelle voetplaatsing in plaats van grote passen.', 600, array['enkel', 'conditie', 'hardlopen', 'techniek'])
    returning id into v_ex_cadans_drill;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Plyometrische sprongtraining (onderhoud)', 'kracht',
     'Voer een kort circuit van sprongoefeningen uit, bijvoorbeeld hink-stap-sprong of zijwaartse sprongen, bedoeld als onderhoud van veerkracht en impacttolerantie.',
     'Eén keer per week uitvoeren als onderhoud, met volledig herstel tussen de reeksen.', 3, 8, array['enkel', 'kracht', 'onderhoud'])
    returning id into v_ex_plyo_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Heuvelloop of intervaltraining (onderhoud)', 'conditie',
     'Loop op wisselende ondergrond of met korte, snellere intervallen, ter afwisseling en verdere opbouw van de belastbaarheid van de enkel.',
     'Bouw dit type training pas in als de reguliere duurloop al probleemloos verloopt.', 1200, array['enkel', 'conditie', 'onderhoud'])
    returning id into v_ex_heuvelloop_onderhoud;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'ankle_sprain', 'Herstelplan enkelverzwikking (hardlopen)',
    'Herstelplan voor een acute, conservatief behandelde enkelverzwikking (inversietrauma) bij hardlopers/duursporters, van RICE en vroege belasting via run-walk-opbouw tot een geleidelijke, functionele terugkeer naar de volledige wekelijkse hardloopmijlage (ca. 4-6 weken). Voor voetballers, zie het herstelplan ''Enkelverzwikking (voetbal)''.',
    false)
  returning id into v_protocol;

  -- Fase 1: RICE en vroege belasting
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: RICE en vroege belasting',
    'Zwelling beperken met Rust, IJs, Compressie en Elevatie, en zo snel als de pijn het toelaat voorzichtig weer belasten.',
    'Dag 0-7',
    array['Hardlopen', 'Springen', 'Lange wandelingen', 'Onbelaste rust langer dan nodig'])
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
     'Pas in de eerste 48 uur Rust, IJs, Compressie en Elevatie toe om zwelling te beperken. Daarna is voorzichtige, vroege belasting (zodra de pijn het toelaat) beter voor het herstel dan langdurige rust. Dit geldt zeker voor hardlopers, die relatief snel weer op een belastbare enkel willen kunnen bouwen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: enkelverzwikking (hardlopen)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_enkelpompen_vroeg, 0, 3, 20, null),
    (v_schedule, v_ex_enkelcirkels_zit, 1, 2, 10, null),
    (v_schedule, v_ex_gewicht_overdragen, 2, 3, null, 20);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 7, 0);

  -- Fase 2: Mobiliteit en kracht
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Mobiliteit en kracht',
    'Volledige dorsiflexiemobiliteit en kuitkracht opbouwen als basis voor een veilige afzet bij hardlopen, met vroege balanstraining.',
    'Week 1-3',
    array['Hardlopen op oneffen ondergrond', 'Springen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige mobiliteit hersteld', 0),
    (v_phase, 'Lopen zonder hinken op alle ondergronden', 1),
    (v_phase, 'Eenbenige calf raise minimaal 15 keer zonder pijn', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Calf raises pijnvrij uitgevoerd', 0),
    (v_phase, 'Eerste keer stevig wandelen (30 minuten) zonder toename van klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Kracht en balans zijn essentieel voor hardlopers',
     'Hardlopen belast de enkel met herhaalde impactkrachten die hoger zijn dan bij stilstaand sporten. Voldoende dorsiflexiemobiliteit en kuitkracht zijn daarom extra belangrijk voordat het opbouwen van hardloopbelasting in de volgende fase begint.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Mobiliteit en kracht: enkelverzwikking (hardlopen)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_dorsiflex_muur, 0, 3, 10, null, null),
    (v_schedule, v_ex_calfraise_opbouw, 1, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_wiebelbord_hardlopers, 2, 3, null, 30, null),
    (v_schedule, v_ex_bandwalk_enkel, 3, 3, 12, null, 'Lichte weerstandsband');
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 3: Run-walk opbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Run-walk opbouw',
    'Geleidelijk terug naar hardlopen via een run-walk-schema, met functionele testen ter controle van de belastbaarheid.',
    'Week 3-5',
    array['Snelheidstraining', 'Trailrennen op oneffen terrein', 'Wedstrijden'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sprong-voor-afstand-test-symmetrie boven 85%', 0),
    (v_phase, 'Run-walk-schema (week 1 en 2) doorlopen zonder toename van klachten', 1),
    (v_phase, 'Geen zwelling na inspanning', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste run-walk-sessie afgerond', 0),
    (v_phase, '20 minuten aaneengesloten joggen zonder pijn', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Geleidelijke mijlage-opbouw voorkomt terugval',
     'Bouw het aantal hardloopminuten per week met niet meer dan ongeveer 10% per week op, en gebruik een run-walk-schema (bijvoorbeeld 1 minuut hardlopen afgewisseld met 1 minuut wandelen, oplopend naar meer hardlopen) om de enkel geleidelijk aan impact te laten wennen. Te snel opbouwen is een van de meest voorkomende oorzaken van een nieuwe verzwikking bij hardlopers.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Run-walk opbouw: enkelverzwikking (hardlopen)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_runwalk_schema, 0, null, null, 1200),
    (v_schedule, v_ex_hoptest_afstand, 1, 2, 3, null),
    (v_schedule, v_ex_balans_instabiel_hardlopers, 2, 3, null, 30),
    (v_schedule, v_ex_inplace_hops, 3, 3, 8, null),
    (v_schedule, v_ex_cadans_drill, 4, null, null, 600);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 5, 0);

  -- Fase 4: Hardloop-mijlageopbouw en terugkeer
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Hardloop-mijlageopbouw en terugkeer',
    'De wekelijkse hardloopafstand geleidelijk terugbrengen naar het oude niveau, met een onderhoudsprogramma om herhaling te voorkomen.',
    'Week 5-6',
    array[]::text[])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Volledige wekelijkse mijlage hervat zonder klachten', 0),
    (v_phase, 'Sprong-voor-afstand-test-symmetrie boven 95%', 1),
    (v_phase, 'Geen klachten na een duurloop', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste volledige duurloop op de oude afstand', 0),
    (v_phase, 'Hardloopschema hervat zonder aanpassingen', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Blijf enkelkracht onderhouden',
     'Hardlopers met een doorgemaakte enkelverzwikking hebben een verhoogd risico op herhaling. Blijf daarom ook na volledige terugkeer één tot twee keer per week gericht kracht- en balanswerk voor de enkel doen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Terugkeer en onderhoud: enkelverzwikking (hardlopen)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_duurloop_opbouw, 0, null, null, 1800, null),
    (v_schedule, v_ex_calfraise_onderhoud, 1, 3, 15, null, 'Lichaamsgewicht'),
    (v_schedule, v_ex_balanscircuit_onderhoud, 2, 2, null, 30, null),
    (v_schedule, v_ex_plyo_onderhoud, 3, 3, 8, null, null),
    (v_schedule, v_ex_heuvelloop_onderhoud, 4, null, null, 1200, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 3, 0);

end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Protocol 3: Hamstringblessure (proximaal, graad II) — 4 fases
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_ex_iso_hamstring_kort uuid;
  v_ex_bekkenkanteling_pijnvrij uuid;
  v_ex_wandelen_vlak uuid;
  v_ex_glutebridge_beperkt uuid;
  v_ex_hamstringcurl_beperkt uuid;
  v_ex_heupextensie_vierpunt uuid;
  v_ex_nordic_opbouw uuid;
  v_ex_rdl_beperkt uuid;
  v_ex_jogging_rustig uuid;
  v_ex_sprint_opbouw uuid;
  v_ex_nordic_onderhoud uuid;
  v_ex_acc_decc_sportspecifiek uuid;
  v_ex_hipthrust_opbouw uuid;
  v_ex_singleleg_rdl uuid;
  v_ex_hamstring_bridge_march uuid;
  v_ex_richtingsverandering_hamstring uuid;

  v_protocol uuid;
  v_phase uuid;
  v_schedule uuid;
begin

  -- ── Nieuwe oefeningen ────────────────────────────────────────────────────

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_duration_seconds, default_load_text, tags) values
    ('reva', 'Isometrische hamstringaanspanning (korte hoek)', 'kracht',
     'Span de hamstring statisch aan in een lichte, pijnvrije heupflexiehoek, bijvoorbeeld liggend met een licht gebogen knie tegen een vast punt.',
     'Kies bewust een lage heupflexiehoek. Vermijd posities waarin de pees bij de zitbeenknobbel wordt samengedrukt.', 4, 15, 'Lichaamsgewicht, lage heupflexiehoek', array['hamstring', 'kracht', 'proximaal'])
    returning id into v_ex_iso_hamstring_kort;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Bekkenkanteling in rugligging (pijnvrij)', 'mobiliteit',
     'Lig op je rug met gebogen knieën en kantel het bekken licht, binnen een volledig pijnvrije range.',
     'Een rustige, kleine beweging zonder enige rek van de hamstring.', 2, 10, array['hamstring', 'mobiliteit', 'proximaal'])
    returning id into v_ex_bekkenkanteling_pijnvrij;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Wandelen op vlakke ondergrond (korte afstand)', 'conditie',
     'Rustig wandelen op een vlakke, voorspelbare ondergrond over een korte afstand.',
     'Vermijd grote pasafstand en heuvelop/heuvelaf lopen in deze fase.', 600, array['hamstring', 'conditie', 'proximaal'])
    returning id into v_ex_wandelen_vlak;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Glute bridge (rugneutraal, beperkte range)', 'kracht',
     'Lig op je rug met gebogen knieën en til het bekken op tot een rechte lijn van knie tot schouder, in een beperkte, gecontroleerde range.',
     'Ga niet verder dan een comfortabele, pijnvrije heupextensie.', 3, 12, 'Lichaamsgewicht', array['hamstring', 'kracht', 'proximaal'])
    returning id into v_ex_glutebridge_beperkt;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Hamstringcurl liggend (beperkte range, zonder eindstandrek)', 'kracht',
     'Lig op je buik en buig de knie tegen lichte weerstand in, tot een beperkte hoek zonder de eindstand van volledige rek op te zoeken.',
     'Blijf ruim voor de eindstand stoppen, het doel is kracht opbouwen, niet rekken.', 3, 10, 'Lichte weerstand', array['hamstring', 'kracht', 'proximaal'])
    returning id into v_ex_hamstringcurl_beperkt;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Heupextensie in vierpuntssteun (korte hefboom)', 'kracht',
     'Kom op handen en knieën en strek één been achterwaarts met een gebogen knie (korte hefboom), zonder de rug mee te bewegen.',
     'De gebogen knie houdt de belasting op de hamstring beperkt en beheersbaar.', 3, 10, array['hamstring', 'kracht', 'proximaal'])
    returning id into v_ex_heupextensie_vierpunt;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Nordic hamstring curl (gedeeltelijke range, opbouw)', 'kracht',
     'Kniel met de voeten vastgezet en laat het bovenlichaam gecontroleerd naar voren zakken, zo ver als de hamstring dit excentrisch kan opvangen.',
     'Alleen zover als volledig gecontroleerd lukt, geen eindstandrek forceren en niet doorzakken voorbij het punt van controle.', 3, 5, array['hamstring', 'kracht', 'excentrisch', 'proximaal'])
    returning id into v_ex_nordic_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Romeinse deadlift met lichte belasting (beperkte heupflexiehoek)', 'kracht',
     'Buig vanuit de heup met een lichte gewicht, tot een beperkte heupflexiehoek die geen rekgevoel bij de zitbeenknobbel geeft.',
     'Bouw de heupflexiehoek pas verder op als de huidige hoek volledig pijnvrij en gecontroleerd lukt.', 3, 10, 'Licht, focus op techniek', array['hamstring', 'kracht', 'proximaal'])
    returning id into v_ex_rdl_beperkt;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Rustig jogging-opbouwschema', 'conditie',
     'Een rustig opbouwschema van joggen op laag tempo, met geleidelijk toenemende duur.',
     'Stop direct bij enige pijn bij de zitbeenknobbel of achterzijde van het bovenbeen.', 900, array['hamstring', 'conditie', 'proximaal'])
    returning id into v_ex_jogging_rustig;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sprintopbouwschema (geleidelijke snelheidsopbouw)', 'conditie',
     'Een gestructureerd schema waarbij de sprintsnelheid geleidelijk wordt opgebouwd van submaximaal naar maximaal.',
     'Bouw extra behoedzaam op gezien de langere kwetsbaarheid van een proximale peesblessure.', 900, array['hamstring', 'conditie', 'sprint', 'proximaal'])
    returning id into v_ex_sprint_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Nordic hamstring curl (volledige range, onderhoud)', 'kracht',
     'Kniel met de voeten vastgezet en laat het bovenlichaam gecontroleerd en in volledige range naar voren zakken.',
     'Als onderhoudsoefening te blijven doen, ook maanden na volledige terugkeer naar sport.', 3, 6, array['hamstring', 'kracht', 'excentrisch', 'onderhoud'])
    returning id into v_ex_nordic_onderhoud;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Sportspecifieke acceleratie- en deceleratietraining', 'conditie',
     'Oefen sportspecifieke versnellings- en afremmomenten, zoals bij het starten en stoppen tijdens een wedstrijd.',
     'Bouw intensiteit en herhalingen geleidelijk op, met volledig herstel tussen de reeksen.', 1200, array['hamstring', 'conditie', 'sportspecifiek'])
    returning id into v_ex_acc_decc_sportspecifiek;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Heupextensie hip thrust (lichte belasting, opbouw)', 'kracht',
     'Steun met de schouders tegen een bank met een lichte gewicht op het bekken, en strek de heupen volledig door tot een rechte lijn van schouder tot knie.',
     'Bouw het gewicht rustig op en stop bij enige pijn bij de zitbeenknobbel.', 3, 10, 'Licht, focus op techniek', array['hamstring', 'kracht', 'proximaal'])
    returning id into v_ex_hipthrust_opbouw;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_load_text, tags) values
    ('reva', 'Eenbenige Romeinse deadlift (functionele opbouw)', 'kracht',
     'Buig op één been vanuit de heup met een lichte gewicht in de hand, terwijl het andere been gestrekt naar achteren beweegt voor balans en stabiliteit.',
     'Begin zonder gewicht om de balans en techniek te beheersen, voeg pas gewicht toe als dit volledig gecontroleerd lukt.', 3, 8, 'Licht tot geen gewicht, focus op balans', array['hamstring', 'kracht', 'proximaal', 'balans'])
    returning id into v_ex_singleleg_rdl;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_sets, default_reps, tags) values
    ('reva', 'Eenbenige hamstring bridge march', 'stabiliteit',
     'Lig op je rug in bruggetjeshouding op één been en beweeg afwisselend het vrije been op en neer, terwijl het bekken stabiel en horizontaal blijft.',
     'Houd het bekken volledig stabiel: dit traint de hamstring en bilspier onder functionele, dynamische belasting.', 3, 10, array['hamstring', 'kracht', 'stabiliteit'])
    returning id into v_ex_hamstring_bridge_march;

  insert into public.exercise_library (scope, title, exercise_type, description, instructions, default_duration_seconds, tags) values
    ('reva', 'Richtingsveranderingen op snelheid (hamstringspecifiek)', 'conditie',
     'Loop op tempo en verander gecontroleerd van richting, met geleidelijk toenemende snelheid en scherpte van de bocht.',
     'Verhoog snelheid en scherpte alleen als de vorige stap volledig zonder klachten bij de zitbeenknobbel verliep.', 900, array['hamstring', 'sportspecifiek', 'agility'])
    returning id into v_ex_richtingsverandering_hamstring;

  -- ── Protocol ─────────────────────────────────────────────────────────────

  insert into public.protocols (scope, injury_category, name, description, clinically_reviewed)
  values ('reva', 'hamstring_strain', 'Herstelplan hamstringblessure (proximaal, graad II)',
    'Herstelplan voor een zwaardere, proximale hamstringblessure (graad II) bij de pees nabij de zitbeenknobbel, een blessure met een hoger recidiefrisico dan een blessure in de spierbuik. Langere beschermende fase, expliciete terughoudendheid met rekken en peescompressie in de vroege fase, en een voorzichtigere opbouw naar excentrische belasting (ca. 10-12 weken). Voor een blessure in de spierbuik, zie het herstelplan ''Hamstringblessure (voetbal)''.',
    false)
  returning id into v_protocol;

  -- Fase 1: Bescherming en pijncontrole
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 0, 'Fase 1: Bescherming en pijncontrole',
    'De proximale hamstringpees beschermen tegen compressie en rek, terwijl pijn afneemt en voorzichtige isometrische activatie start.',
    'Week 0-2',
    array['Rekken/stretchen van de hamstring', 'Diep zitten in een lage stoel (heupflexie + peescompressie)', 'Lunges en diepe kniebuigingen', 'Sprinten', 'Traplopen met grote passen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijn bij zitten op een harde ondergrond duidelijk afgenomen', 0),
    (v_phase, 'Isometrische aanspanning mogelijk zonder scherpe pijn bij de zitbeenknobbel', 1),
    (v_phase, 'Wandelen op vlakke ondergrond pijnvrij', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste pijnvrije wandeling', 0),
    (v_phase, 'Kortdurend zitten op een harde stoel mogelijk zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Waarom deze fase langer duurt',
     'Een blessure aan de proximale hamstringpees (bij de zitbeenknobbel) heeft een hoger risico op langdurige klachten en een nieuwe blessure dan een blessure in de spierbuik. Vermijd in deze fase houdingen die de pees samendrukken tegen de zitbeenknobbel, zoals diep zitten of heupflexie met een gestrekte knie, en rek de hamstring nog niet: dit kan de pees juist irriteren in plaats van helpen.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Basisoefeningen: hamstringblessure (proximaal)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text) values
    (v_schedule, v_ex_iso_hamstring_kort, 0, 4, null, 15, 'Lichaamsgewicht, lage heupflexiehoek'),
    (v_schedule, v_ex_bekkenkanteling_pijnvrij, 1, 2, 10, null, null),
    (v_schedule, v_ex_wandelen_vlak, 2, null, null, 600, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 6, 0);

  -- Fase 2: Geleidelijke belastingsopbouw zonder rek
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 1, 'Fase 2: Geleidelijke belastingsopbouw zonder rek',
    'Kracht opbouwen via aanspanning in een beperkte, pijnvrije range, zonder de hamstring te rekken.',
    'Week 2-5',
    array['Rekken/stretchen van de hamstring', 'Sprinten', 'Lunges met grote pasafstand', 'Explosieve richtingsveranderingen'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Pijnvrije actieve knieflexie in volledige range', 0),
    (v_phase, 'Isometrische kracht dichter bij volledige heupextensie mogelijk', 1),
    (v_phase, 'Zitten op een harde ondergrond langer dan 30 minuten zonder klachten', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Langer zitten zonder klachten', 0),
    (v_phase, 'Eerste lichte weerstandsoefeningen gestart', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rek blijft nog vermeden',
     'Anders dan bij een blessure in de spierbuik, waar rekken vaak wel snel weer mag, blijft rekken bij een proximale peesblessure langer af te raden vanwege het compressie-effect op de pees tegen de zitbeenknobbel. Kracht bouw je in deze fase op via aanspanning zonder rek, in een beperkte, pijnvrije range.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Belastingsopbouw zonder rek: hamstringblessure (proximaal)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_load_text) values
    (v_schedule, v_ex_glutebridge_beperkt, 0, 3, 12, 'Lichaamsgewicht'),
    (v_schedule, v_ex_hamstringcurl_beperkt, 1, 3, 10, 'Lichte weerstand'),
    (v_schedule, v_ex_heupextensie_vierpunt, 2, 3, 10, null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 3: Progressieve excentrische training en functionele opbouw
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 2, 'Fase 3: Progressieve excentrische training en functionele opbouw',
    'Voorzichtig en geleidelijk excentrische kracht opbouwen en starten met joggen op laag tempo.',
    'Week 5-9',
    array['Sprinten op maximale snelheid', 'Wedstrijdsport', 'Diepe lunges'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Hamstringkracht minimaal 70% van het andere been', 0),
    (v_phase, 'Joggen op laag tempo pijnvrij', 1),
    (v_phase, 'Excentrische oefeningen uitvoerbaar zonder pijn bij de zitbeenknobbel', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste jogging-sessie afgerond', 0),
    (v_phase, 'Excentrische training (gedeeltelijke range) gestart', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Rustig opbouwen blijft cruciaal',
     'Bouw excentrische belasting bij een proximale peesblessure langzamer op dan bij een blessure in de spierbuik. De pees heeft meer tijd nodig om weer volledig belastbaar te worden. Overleg bij twijfel altijd met je fysiotherapeut voordat je een stap overslaat.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Excentrische opbouw: hamstringblessure (proximaal)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds, prescribed_load_text, prescription_note) values
    (v_schedule, v_ex_nordic_opbouw, 0, 3, 5, null, null, 'Alleen zover als volledig gecontroleerd lukt, geen eindstandrek forceren'),
    (v_schedule, v_ex_rdl_beperkt, 1, 3, 10, null, 'Licht, focus op techniek', null),
    (v_schedule, v_ex_jogging_rustig, 2, null, null, 900, null, null),
    (v_schedule, v_ex_hipthrust_opbouw, 3, 3, 10, null, 'Licht, focus op techniek', null),
    (v_schedule, v_ex_singleleg_rdl, 4, 3, 8, null, 'Licht tot geen gewicht, focus op balans', null);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

  -- Fase 4: Sprintopbouw en terugkeer naar sport
  insert into public.protocol_phases (protocol_id, sort_order, name, description, week_range_label, forbidden_activities)
  values (v_protocol, 3, 'Fase 4: Sprintopbouw en terugkeer naar sport',
    'Sprintsnelheid extra geleidelijk opbouwen en sportspecifieke acceleratie/deceleratie trainen als voorbereiding op volledige, veilige terugkeer.',
    'Week 9-12',
    array['Wedstrijden zonder goedkeuring fysiotherapeut of trainer'])
  returning id into v_phase;

  insert into public.protocol_phase_criteria (phase_id, description, sort_order) values
    (v_phase, 'Sprinten op 80% snelheid pijnvrij', 0),
    (v_phase, 'Volledige, symmetrische hamstringkracht', 1),
    (v_phase, 'Sportspecifieke acceleratie/deceleratie zonder klachten bij de zitbeenknobbel', 2);

  insert into public.protocol_phase_milestones (phase_id, title, sort_order) values
    (v_phase, 'Eerste sprint op volle snelheid', 0),
    (v_phase, 'Volledig meetrainen zonder klachten', 1);

  insert into public.protocol_phase_education_items (phase_id, title, body, sort_order) values
    (v_phase, 'Verhoogd recidiefrisico blijft langer aanwezig',
     'Bij een proximale peesblessure blijft het risico op herhaling langer verhoogd dan bij een blessure in de spierbuik. Blijf ook maanden na terugkeer excentrische training (bijvoorbeeld de Nordic hamstring curl) onderhouden, en bouw sprintbelasting na terugkeer extra geleidelijk op.', 0);

  insert into public.schedule_library (scope, title) values ('reva', 'Sprint- en sportopbouw: hamstringblessure (proximaal)') returning id into v_schedule;
  insert into public.schedule_library_exercises (schedule_id, exercise_id, sort_order, prescribed_sets, prescribed_reps, prescribed_duration_seconds) values
    (v_schedule, v_ex_sprint_opbouw, 0, null, null, 900),
    (v_schedule, v_ex_nordic_onderhoud, 1, 3, 6, null),
    (v_schedule, v_ex_acc_decc_sportspecifiek, 2, null, null, 1200),
    (v_schedule, v_ex_hamstring_bridge_march, 3, 3, 10, null),
    (v_schedule, v_ex_richtingsverandering_hamstring, 4, null, null, 900);
  insert into public.protocol_phase_schedule_links (phase_id, schedule_id, frequency_per_week, sort_order)
  values (v_phase, v_schedule, 4, 0);

end $$;

notify pgrst, 'reload schema';
