-- 061_exercise_library_seed_100.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Zie de toelichting in migratie 053: deze oefeningen zijn samengesteld als
-- redelijk startpunt, maar NIET geverifieerd door een bevoegd fysiotherapeut.
-- Ze staan in de REVA-bibliotheek (scope 'reva'), read-only voor praktijken
-- (kopiëren naar eigen bibliotheek kan wel), en mogen pas aan echte patiënten
-- toegewezen worden na klinische review.
-- ============================================================================
--
-- Vult de REVA-oefeningenbibliotheek aan van 83 naar 100 oefeningen (17
-- nieuwe, losse items, geen duplicaten van bestaande titels uit migraties
-- 053/055/057). Bewust gericht op schouder/heup/enkel, want de
-- `protocols.injury_category`-check (migratie 048) staat nu al
-- 'rotator_cuff', 'total_hip_replacement', 'meniscus' en 'ankle_ligament'
-- toe, terwijl de bibliotheek tot nu toe vrijwel volledig knie-gericht was —
-- deze oefeningen leggen alvast een basis voor toekomstige protocollen in
-- die categorieën.

insert into public.exercise_library
  (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text, tags)
values
  -- ── Schouder / rotator cuff ──────────────────────────────────────────────
  ('reva', 'Schouder buitenrotatie met band', 'kracht',
   'Houd de ellebogen tegen het lichaam, elleboog in 90° gebogen. Draai de onderarm naar buiten tegen de weerstand van een band in, kom rustig terug.',
   'Elleboog blijft tegen het lichaam, alleen de onderarm beweegt. Veelgebruikt bij rotator cuff-revalidatie.',
   3, 12, null, 'Lichte weerstandsband', array['schouder','rotator-cuff']),

  ('reva', 'Schouder binnenrotatie met band', 'kracht',
   'Zelfde uitgangshouding als buitenrotatie, maar draai de onderarm naar binnen (richting buik) tegen de weerstand in.',
   'Elleboog blijft tegen het lichaam. Rustig tempo, geen doorschieten.',
   3, 12, null, 'Lichte weerstandsband', array['schouder','rotator-cuff']),

  ('reva', 'Scapula retractie (rij-beweging)', 'kracht',
   'Zit of sta rechtop met een band voor je op schouderhoogte. Trek de ellebogen naar achteren en knijp de schouderbladen naar elkaar toe.',
   'Romp blijft stil, beweging komt uit de schouderbladen, niet uit de onderrug.',
   3, 12, null, 'Lichte weerstandsband', array['schouder','rug']),

  ('reva', 'Pendulum-oefening', 'mobiliteit',
   'Leun voorover met steun op een stoel of tafel, laat de arm van het aangedane schouder los bungelen en maak kleine cirkels.',
   'Puur zwaartekracht laten werken, niet actief met de schouderspieren bewegen. Vroege fase na schouderblessure of operatie.',
   2, null, 60, null, array['schouder','mobiliteit','postoperatief']),

  ('reva', 'Wall slides', 'mobiliteit',
   'Sta met de rug tegen een muur, armen in een "W"-positie tegen de muur. Schuif de armen omhoog tot een "Y", zoveel mogelijk contact met de muur behoudend.',
   'Stop bij het punt waar de onderrug van de muur los zou komen. Verbetert schoudermobiliteit en houding.',
   3, 10, null, null, array['schouder','mobiliteit','houding']),

  -- ── Heup ──────────────────────────────────────────────────────────────────
  ('reva', 'Heupflexie staand met band', 'kracht',
   'Bevestig een weerstandsband aan de enkel. Til de knie op richting de borst tegen de weerstand in, laat gecontroleerd zakken.',
   'Houd de romp rechtop, gebruik een steunpunt voor de balans indien nodig.',
   3, 12, null, 'Lichte weerstandsband', array['heup','kracht']),

  ('reva', 'Bird dog', 'stabiliteit',
   'Ga op handen en knieën staan. Strek tegelijk een arm naar voren en het tegenovergestelde been naar achteren, houd kort vast en keer terug.',
   'Romp blijft stabiel, geen doorzakken in de onderrug. Traint heup- en rompstabiliteit samen.',
   3, 10, null, 'Lichaamsgewicht', array['heup','core','stabiliteit']),

  ('reva', 'Zittende heupabductie met band', 'kracht',
   'Zit op een stoel met een weerstandsband om beide knieën. Duw de knieën naar buiten tegen de weerstand in, kom rustig terug.',
   'Voeten blijven op de grond, romp blijft rechtop.',
   3, 15, null, 'Lichte weerstandsband', array['heup','kracht']),

  -- ── Enkel ─────────────────────────────────────────────────────────────────
  ('reva', 'Enkel inversie en eversie met band', 'kracht',
   'Zit met gestrekt been, band om de voorvoet bevestigd aan een vast punt. Beweeg de voet naar binnen (inversie) en naar buiten (eversie) tegen de weerstand in.',
   'Rustige, gecontroleerde beweging. Veelgebruikt na een enkelverstuiking.',
   3, 12, null, 'Lichte weerstandsband', array['enkel','kracht']),

  ('reva', 'Kuitstretch tegen muur', 'rekken',
   'Sta met één voet voor een muur, andere been gestrekt naar achteren met hiel op de grond. Leun naar de muur tot een rek in de kuit voelbaar is.',
   'Rustig aanhouden, niet doorveren.',
   2, null, 30, null, array['enkel','kuit','rekken']),

  ('reva', 'Op tenen lopen', 'kracht',
   'Loop een aantal passen op de tenen, met de hielen zo hoog mogelijk van de grond.',
   'Functionele kuitkracht en enkelstabiliteit, goed bruikbaar in de late fase na een enkelblessure.',
   3, null, 20, null, array['enkel','kuit','functioneel']),

  -- ── Knie / meniscus, extra mobiliteit ────────────────────────────────────
  ('reva', 'Knieflexie liggend met hulp', 'mobiliteit',
   'Lig op de rug. Buig de knie voorzichtig met hulp van beide handen achter de knieholte, tot een lichte rek voelbaar is. Laat rustig weer zakken.',
   'Alleen pijnvrij uitvoeren, veelgebruikt kort na een knieoperatie of meniscusbehandeling.',
   2, 10, null, null, array['knie','mobiliteit','postoperatief']),

  ('reva', 'Fietsen zonder weerstand', 'mobiliteit',
   'Fiets op een hometrainer zonder weerstand, puur om de knie soepel door het bewegingsbereik te laten bewegen.',
   'Vroege mobilisatie-oefening, geschikt zodra fietsen pijnvrij lukt na een knieblessure of operatie.',
   null, null, 300, 'Geen weerstand', array['knie','mobiliteit','postoperatief']),

  -- ── Algemeen: rek en romp ────────────────────────────────────────────────
  ('reva', 'Hamstringstretch liggend', 'rekken',
   'Lig op de rug, til één been gestrekt omhoog (eventueel met een handdoek achter de kuit) tot een rek in de achterkant van het bovenbeen voelbaar is.',
   'Rustig aanhouden, niet doorveren, knie mag licht gebogen blijven bij spanning.',
   2, null, 30, null, array['hamstring','rekken']),

  ('reva', 'Quadricepsstretch staand', 'rekken',
   'Sta rechtop, houd eventueel steun vast. Pak de wreef van het aangedane been vast en trek de hiel richting de bil tot een rek in de voorkant van het bovenbeen voelbaar is.',
   'Knieën blijven bij elkaar, romp rechtop houden.',
   2, null, 30, null, array['knie','rekken']),

  ('reva', 'Zittende rompdraai', 'mobiliteit',
   'Zit rechtop op een stoel, armen gekruist voor de borst. Draai de romp rustig naar links en naar rechts vanuit het middenrif.',
   'Heupen blijven naar voren gericht, beweging komt uit de borstwervelkolom.',
   2, 10, null, null, array['rug','mobiliteit']),

  ('reva', 'Farmer''s carry', 'kracht',
   'Loop een vaste afstand met in beide handen een gewicht (dumbbell of kettlebell), romp rechtop en schouders naar achteren.',
   'Functionele grip- en rompkracht, goed bruikbaar in de late, sportspecifieke fase van herstel.',
   3, null, 30, 'Twee gewichten, matig zwaar', array['sportschool','functioneel','core']);
