-- 057_exercise_library_seed_50.sql
--
-- ============================================================================
-- BELANGRIJK — KLINISCHE INHOUD NOG NIET GEVERIFIEERD
-- ============================================================================
-- Zie de toelichting in migratie 053: deze oefeningen zijn samengesteld als
-- redelijk startpunt, maar NIET geverifieerd door een bevoegd fysiotherapeut.
-- Ze staan in de REVA-bibliotheek (scope 'reva') zodat elke praktijk ze kan
-- inzien en dupliceren naar hun eigen bibliotheek, maar mogen pas aan echte
-- patiënten toegewezen worden na klinische review.
-- ============================================================================
--
-- Voegt 50 losse oefeningen toe aan de REVA-oefeningenbibliotheek, oplopend
-- in complexiteit: eenvoudige mobiliteitsoefeningen, fysio-specifieke
-- rehabilitatie-oefeningen, algemene krachtoefeningen met lichaamsgewicht, en
-- oefeningen op sportschoolapparatuur. Dit zijn losse bibliotheekitems (niet
-- gekoppeld aan een protocol of schema), ter aanvulling op de kleinere set
-- uit migratie 053.

insert into public.exercise_library
  (scope, title, exercise_type, description, instructions, default_sets, default_reps, default_duration_seconds, default_load_text, tags)
values
  -- ── Eenvoudige mobiliteitsoefeningen ────────────────────────────────────
  ('reva', 'Nekrek zijwaarts', 'rekken',
   'Zit of sta rechtop. Laat het oor langzaam richting de schouder zakken tot een lichte rek in de nek voelbaar is.',
   'Rustig ademhalen, niet doorveren. Beide kanten gelijk uitvoeren.',
   2, 10, null, null, array['opwarming','thuis','nek']),

  ('reva', 'Schouderrollen', 'mobiliteit',
   'Sta of zit rechtop. Rol beide schouders in een rustig tempo naar achteren, daarna naar voren.',
   'Grote, langzame cirkels maken, houd de nek ontspannen.',
   2, 10, null, null, array['opwarming','thuis','schouder']),

  ('reva', 'Bovenlichaam draaien zittend', 'mobiliteit',
   'Zit rechtop op een stoel met de voeten plat op de grond. Draai de romp rustig naar links en naar rechts, de heupen blijven naar voren gericht.',
   'Beweging vanuit de romp laten komen, niet forceren.',
   2, 10, null, null, array['opwarming','thuis','rug']),

  ('reva', 'Polscirkels', 'mobiliteit',
   'Strek de armen naar voren en draai rustig cirkels met de polsen, beide richtingen.',
   'Vooral nuttig als opwarming voor oefeningen met steun op de handen.',
   2, 10, null, null, array['opwarming','thuis']),

  ('reva', 'Kniehef zittend (marcheren)', 'mobiliteit',
   'Zit rechtop op een stoel. Hef om beurten een knie op richting de borst, alsof je op de plek marcheert.',
   'Rustig tempo, goed voor de eerste dagen van mobilisatie.',
   2, 12, null, null, array['thuis','opwarming','been']),

  ('reva', 'Clam shell', 'stabiliteit',
   'Lig op je zij met gebogen knieën en gestapelde voeten. Til de bovenste knie op zonder de heupen te draaien, houd 2 seconden vast.',
   'Beweging komt uit de heup, romp blijft stil.',
   3, 12, null, 'Lichaamsgewicht', array['thuis','heup','stabiliteit']),

  ('reva', 'Kat-koe', 'mobiliteit',
   'Ga op handen en knieën staan. Wissel af tussen de rug bol maken (kat) en doorzakken met de buik naar de mat (koe).',
   'Rustig op de ademhaling bewegen, geen pijn in de onderrug.',
   2, 10, null, null, array['thuis','rug','opwarming']),

  ('reva', 'Enkeldorsiflexie tegen muur (knie naar muur)', 'mobiliteit',
   'Sta met de voet op ca. 10 cm van een muur. Buig de knie richting de muur zonder de hiel los te laten van de grond.',
   'Vergroot de beweeglijkheid van de enkel, belangrijk na immobilisatie.',
   3, 10, null, null, array['thuis','enkel','knie']),

  ('reva', 'Beenzwaai zijwaarts', 'mobiliteit',
   'Houd je vast aan een stoel of muur. Zwaai het been rustig gecontroleerd opzij en terug.',
   'Klein bewegingsbereik starten, rustig opbouwen.',
   2, 10, null, null, array['opwarming','heup','been']),

  ('reva', 'Diafragmatische ademhaling', 'anders',
   'Lig op de rug met gebogen knieën, één hand op de buik. Adem rustig in door de neus zodat de buik omhoog komt, adem langzaam uit.',
   'Ontspanningsoefening, ook bruikbaar vóór of na training.',
   3, null, 60, null, array['thuis','ontspanning']),

  -- ── Fysio-specifieke rehabilitatie-oefeningen ───────────────────────────
  ('reva', 'Step-up op box', 'kracht',
   'Stap met het aangedane been op een lage box of opstapje, strek de knie volledig en stap gecontroleerd terug.',
   'Begin met een lage box, bouw hoogte pas op als dit pijnvrij en gecontroleerd lukt.',
   3, 10, null, 'Lichaamsgewicht', array['knie','fysio','functioneel']),

  ('reva', 'Step-down (excentrisch)', 'kracht',
   'Sta op een lage box, laat het niet-aangedane been langzaam en gecontroleerd naar de grond zakken zonder deze neer te zetten, kom weer omhoog.',
   'Traint excentrische kniecontrole, veelgebruikt bij knieklachten. Rustig tempo, geen inzakken van de knie naar binnen.',
   3, 8, null, 'Lichaamsgewicht', array['knie','fysio','excentrisch']),

  ('reva', 'Wandzit (wall sit)', 'kracht',
   'Leun met de rug tegen een muur en zak tot de knieën ongeveer 90° gebogen zijn, alsof je op een onzichtbare stoel zit.',
   'Houd de houding vast, ademhaling blijft rustig. Bouw de tijd geleidelijk op.',
   3, null, 30, 'Lichaamsgewicht', array['knie','fysio','kracht']),

  ('reva', 'Bulgaarse split squat', 'kracht',
   'Zet de wreef van het achterste been op een bank, buig het voorste been tot een lichte squat en kom weer omhoog.',
   'Gevorderde eenbenige oefening, pas toevoegen als basiskracht en balans voldoende zijn.',
   3, 8, null, 'Lichaamsgewicht', array['fysio','been','gevorderd']),

  ('reva', 'Eenbenige balans', 'stabiliteit',
   'Sta op één been in de buurt van een stevig steunpunt. Houd de balans, probeer de romp stil te houden.',
   'Bouw op van kort naar lang staan, eventueel met ogen dicht als het goed lukt.',
   3, null, 20, null, array['balans','fysio','enkel','knie']),

  ('reva', 'Bosu-balans oefening', 'stabiliteit',
   'Sta met beide voeten op een balanskussen of Bosu, houd de romp stabiel en de knieën licht gebogen.',
   'Gebruik een steunpunt in de buurt bij twijfel over de balans.',
   3, null, 20, null, array['balans','fysio','sportschool']),

  ('reva', 'Zijwaartse band-walk (monster walk)', 'kracht',
   'Doe een weerstandsband om de enkels, zak licht door de knieën en loop zijwaarts in kleine passen tegen de weerstand in.',
   'Romp blijft rechtop, knieën zakken niet naar binnen.',
   3, 10, null, 'Lichte weerstandsband', array['heup','fysio','stabiliteit']),

  ('reva', 'Glute bridge', 'kracht',
   'Lig op de rug met gebogen knieën. Til de heupen op tot romp en bovenbenen een rechte lijn vormen, knijp de billen samen.',
   'Veelgebruikte basisoefening voor bekkenstabiliteit en heupkracht.',
   3, 12, null, 'Lichaamsgewicht', array['heup','fysio','core']),

  ('reva', 'Eenbenige glute bridge', 'kracht',
   'Zoals de glute bridge, maar met één been gestrekt in de lucht terwijl het andere been de beweging uitvoert.',
   'Progressie op de gewone glute bridge, pas toevoegen als die goed onder controle is.',
   3, 10, null, 'Lichaamsgewicht', array['heup','fysio','gevorderd']),

  ('reva', 'Nordic hamstring curl', 'kracht',
   'Kniel met de enkels vastgezet (bijv. door een partner of onder een bank). Laat het bovenlichaam langzaam en gecontroleerd naar voren zakken, gebruik de handen om terug te duwen.',
   'Gevorderde excentrische hamstringoefening, veel gebruikt in blessurepreventie. Start met een klein bewegingsbereik.',
   3, 6, null, 'Lichaamsgewicht', array['fysio','hamstring','gevorderd']),

  ('reva', 'Copenhagen plank', 'stabiliteit',
   'Zijligging met het bovenste been op een bank, ondersteund op de onderarm van de onderliggende zijde. Til de heupen op en houd vast.',
   'Traint de adductoren, veel gebruikt bij liesblessures. Gevorderde oefening.',
   3, null, 15, null, array['fysio','lies','gevorderd']),

  ('reva', 'Patella mobilisatie (zelf)', 'mobiliteit',
   'Zit met gestrekt been ontspannen. Beweeg de knieschijf voorzichtig met de vingers omhoog/omlaag en zijwaarts.',
   'Alleen pijnvrij uitvoeren, vooral nuttig kort na een knieoperatie.',
   2, 10, null, null, array['knie','fysio','postoperatief']),

  ('reva', 'Wiebelbord balanstraining', 'stabiliteit',
   'Sta met beide voeten op een wiebelbord en probeer het bord zo stil mogelijk te houden.',
   'Houd een steunpunt binnen handbereik. Progressie: ogen dicht of op één been.',
   3, null, 30, null, array['balans','fysio','enkel','knie']),

  ('reva', 'Trapafdalen achteruit (excentrisch)', 'kracht',
   'Loop met de rug naar de trap toe en daal een trede per keer af, met controle over de knie van het steunbeen.',
   'Traint excentrische kniecontrole in een functionele beweging. Gebruik de trapleuning bij twijfel.',
   3, 10, null, null, array['knie','fysio','functioneel']),

  ('reva', 'Beenstrekking zittend met enkelgewicht', 'kracht',
   'Zit op een stoel of bank. Strek de knie tegen de weerstand van een enkelgewicht, houd 2 seconden vast en laat gecontroleerd zakken.',
   'Progressie op de gewone zittende beenstrekking zodra die zonder gewicht goed lukt.',
   3, 12, null, 'Licht enkelgewicht', array['knie','fysio','kracht']),

  -- ── Algemene krachtoefeningen (lichaamsgewicht) ─────────────────────────
  ('reva', 'Squat (volledige diepte)', 'kracht',
   'Sta met de voeten schouderbreedte uit elkaar. Buig de knieën en zak door tot de bovenbenen ongeveer horizontaal zijn, kom weer omhoog.',
   'Romp rechtop, knieën in lijn met de tenen, hielen op de grond.',
   3, 12, null, 'Lichaamsgewicht', array['sportschool','thuis','been']),

  ('reva', 'Uitvalspas (lunges)', 'kracht',
   'Zet een grote stap naar voren en buig beide knieën tot ongeveer 90°, duw terug naar de startpositie.',
   'Romp rechtop houden, voorste knie niet voorbij de tenen laten zakken.',
   3, 10, null, 'Lichaamsgewicht', array['sportschool','thuis','been']),

  ('reva', 'Zijwaartse lunges', 'kracht',
   'Zet een grote stap opzij, buig de knie van het gestapte been terwijl het andere been gestrekt blijft.',
   'Traint kracht in het zijvlak, goed voor sportspecifieke belasting.',
   3, 10, null, 'Lichaamsgewicht', array['sportschool','thuis','been']),

  ('reva', 'Push-up (opdrukken)', 'kracht',
   'Ondersteun het lichaam op handen en tenen (of knieën als variant). Buig de armen tot de borst bijna de grond raakt, duw weer omhoog.',
   'Romp en heupen in één lijn houden tijdens de hele beweging.',
   3, 10, null, 'Lichaamsgewicht', array['sportschool','thuis','bovenlichaam']),

  ('reva', 'Plank', 'stabiliteit',
   'Ondersteun het lichaam op de onderarmen en tenen, houd romp en benen in een rechte lijn.',
   'Buik aanspannen, niet doorzakken in de onderrug.',
   3, null, 30, null, array['sportschool','thuis','core']),

  ('reva', 'Zijplank', 'stabiliteit',
   'Ondersteun het lichaam zijwaarts op één onderarm, houd het lichaam in een rechte lijn.',
   'Heupen niet laten zakken, romp blijft stabiel.',
   3, null, 20, null, array['sportschool','thuis','core']),

  ('reva', 'Superman', 'kracht',
   'Lig op de buik met armen gestrekt naar voren. Til armen en benen tegelijk lichtjes van de grond, houd kort vast.',
   'Traint de rugstrekkers, rustige gecontroleerde beweging.',
   3, 10, null, 'Lichaamsgewicht', array['thuis','rug','core']),

  ('reva', 'Dead bug', 'stabiliteit',
   'Lig op de rug met armen omhoog en knieën gebogen op 90°. Strek om beurten een arm en het tegenovergestelde been, zonder de onderrug los te laten van de grond.',
   'Rustig tempo, onderrug blijft contact houden met de vloer.',
   3, 10, null, null, array['thuis','core','sportschool']),

  ('reva', 'Calf raise op trede', 'kracht',
   'Sta met de bal van de voet op een trede, laat de hielen onder het niveau van de trede zakken en hef weer op.',
   'Groter bewegingsbereik dan hielhef op de vlakke vloer, bouw geleidelijk op.',
   3, 15, null, 'Lichaamsgewicht', array['thuis','kuit','sportschool']),

  ('reva', 'Sit-to-stand vanaf stoel', 'kracht',
   'Zit op een stoel, kom omhoog tot volledig staand zonder de handen te gebruiken, ga weer gecontroleerd zitten.',
   'Functionele basisoefening, goed meetbaar voor vooruitgang in beenkracht.',
   3, 10, null, 'Lichaamsgewicht', array['thuis','functioneel','been']),

  -- ── Sportschooloefeningen (apparatuur) ──────────────────────────────────
  ('reva', 'Leg press', 'kracht',
   'Zit in de beenpersmachine met de voeten schouderbreedte op de plaat. Buig de knieën tot ca. 90° en duw de plaat weer weg.',
   'Knieën blijven in lijn met de tenen, niet volledig doorstrekken/blokkeren aan het einde.',
   3, 10, null, 'Machine, matig gewicht', array['sportschool','been']),

  ('reva', 'Leg extension (machine)', 'kracht',
   'Zit in de legextensionmachine, strek de knieën tegen de weerstand in en laat gecontroleerd terugzakken.',
   'Rustig tempo, geen doorslaan aan het einde van de beweging.',
   3, 12, null, 'Machine, licht tot matig gewicht', array['sportschool','knie']),

  ('reva', 'Leg curl liggend (machine)', 'kracht',
   'Lig in de legcurlmachine, buig de knieën tegen de weerstand in en laat gecontroleerd terugzakken.',
   'Traint de hamstrings, rustige gecontroleerde uitvoering.',
   3, 12, null, 'Machine, licht tot matig gewicht', array['sportschool','hamstring']),

  ('reva', 'Beenpers eenzijdig (unilateral leg press)', 'kracht',
   'Zoals de gewone leg press, maar met één been per keer om asymmetrie in kracht te trainen.',
   'Gebruik minder gewicht dan bij de bilaterale variant, bouw rustig op.',
   3, 8, null, 'Machine, licht tot matig gewicht', array['sportschool','been','gevorderd']),

  ('reva', 'Lat pulldown', 'kracht',
   'Zit bij de lat pulldown machine, trek de stang naar de bovenborst en laat gecontroleerd weer omhoog komen.',
   'Bovenlichaamsoefening, nuttig om algemene kracht op peil te houden tijdens revalidatie van de onderste extremiteit.',
   3, 12, null, 'Machine, licht tot matig gewicht', array['sportschool','bovenlichaam','rug']),

  ('reva', 'Cabel row (roeien aan kabel)', 'kracht',
   'Zit bij het roeistation, trek de handgreep naar de buik terwijl de romp rechtop blijft.',
   'Schouders naar achteren en beneden houden, geen zwaai met de romp.',
   3, 12, null, 'Machine, licht tot matig gewicht', array['sportschool','bovenlichaam','rug']),

  ('reva', 'Chest press (machine)', 'kracht',
   'Zit in de chestpressmachine, duw de handgrepen naar voren tot de armen bijna gestrekt zijn en laat gecontroleerd terugkomen.',
   'Bovenlichaamsoefening ter ondersteuning van algemene conditie tijdens revalidatie.',
   3, 12, null, 'Machine, licht tot matig gewicht', array['sportschool','bovenlichaam']),

  ('reva', 'Shoulder press (machine)', 'kracht',
   'Zit in de shoulderpressmachine, duw de handgrepen omhoog tot de armen bijna gestrekt zijn en laat gecontroleerd terugzakken.',
   'Houd de rug tegen de rugleuning, geen doorhangen in de onderrug.',
   3, 12, null, 'Machine, licht tot matig gewicht', array['sportschool','bovenlichaam','schouder']),

  ('reva', 'Hip thrust (barbell)', 'kracht',
   'Leun met de bovenrug tegen een bank, stang over de heupen. Duw de heupen omhoog tot romp en bovenbenen een rechte lijn vormen.',
   'Gevorderde heupoefening, start met licht gewicht en bouw op onder begeleiding.',
   3, 10, null, 'Halterstang, licht gewicht', array['sportschool','heup','gevorderd']),

  ('reva', 'Romeinse deadlift (RDL)', 'kracht',
   'Sta met een halterstang of dumbbells, buig vanuit de heup met licht gebogen knieën tot een rek in de hamstrings voelbaar is, kom weer omhoog.',
   'Rug blijft recht tijdens de hele beweging, gevorderde oefening.',
   3, 10, null, 'Halterstang of dumbbells, licht gewicht', array['sportschool','hamstring','gevorderd']),

  ('reva', 'Goblet squat (dumbbell)', 'kracht',
   'Houd een dumbbell verticaal tegen de borst, voer een squat uit met de ellebogen tussen de knieën.',
   'Toegankelijke manier om extra gewicht aan de squat toe te voegen.',
   3, 10, null, 'Eén dumbbell, licht gewicht', array['sportschool','been']),

  ('reva', 'Kabel heupadductie', 'kracht',
   'Sta zijwaarts bij het kabelstation met de enkelmanchet om het buitenste been, trek het been naar binnen langs het standbeen.',
   'Traint de binnenkant van het bovenbeen, veel gebruikt bij lieskracht.',
   3, 12, null, 'Kabelstation, licht gewicht', array['sportschool','lies']),

  ('reva', 'Kabel heupabductie', 'kracht',
   'Sta zijwaarts bij het kabelstation met de enkelmanchet om het binnenste been, trek het been zijwaarts weg van het standbeen.',
   'Traint de buitenkant van de heup, ondersteunt bekkenstabiliteit.',
   3, 12, null, 'Kabelstation, licht gewicht', array['sportschool','heup']),

  ('reva', 'Fietsergometer', 'conditie',
   'Fiets op een hometrainer op een rustig, comfortabel tempo.',
   'Weinig belasting op de knie, goed geschikt als vroege conditie-opbouw na een knieblessure of operatie.',
   null, null, 900, 'Lage weerstand', array['sportschool','conditie','knie']),

  ('reva', 'Roeimachine', 'conditie',
   'Roei op een roeimachine in een rustig tempo, met aandacht voor een vloeiende beweging vanuit de benen.',
   'Goede conditieoefening voor het hele lichaam, bouw duur en weerstand geleidelijk op.',
   null, null, 600, 'Lage weerstand', array['sportschool','conditie']);
