-- 138_kennisbank_kwaliteit.sql
-- Kwaliteitsronde REVA-kennisbank (november 2026):
--   1. Dubbele REVA-oefeningen samengevoegd (34 kopieën). Per groep blijft de
--      meest gebruikte versie; schema's, patiëntkopieën en praktijkkopieën
--      verwijzen daarna naar die versie. De dosering per schema verandert niet.
--   2. Instructies voor 51 oefeningen die er geen hadden.
--   3. Dosering: tijdsoefeningen (cardio, rekken, hinkelen, versnellingen)
--      op tijd in plaats van herhalingen; ontbrekende doseringen aangevuld;
--      twee oefeningen naar het juiste type.
-- Alleen inhoud van de REVA-bibliotheek; eigen oefeningen van praktijken
-- blijven ongemoeid.

begin;

create temporary table _merge (old_id uuid primary key, keep_id uuid not null) on commit drop;

insert into _merge (old_id, keep_id) values
  ('51e2926f-38ea-4336-899b-0581baa8d11a', 'f6276783-9995-424f-a5bc-5d0c838f26a9'),
  ('81e46dbb-4dc5-48b0-afc2-759e720b104b', 'f6276783-9995-424f-a5bc-5d0c838f26a9'),
  ('be2a2744-1b1f-41a1-9df0-ccb59d15db3a', 'f6276783-9995-424f-a5bc-5d0c838f26a9'),
  ('a029ffc1-6c79-4d22-b5db-5813a6aefd26', '847c3097-eef8-482b-aa36-227a25eaa943'),
  ('68ec6080-922c-4334-8476-42572841799e', '847c3097-eef8-482b-aa36-227a25eaa943'),
  ('407df547-fa51-4fec-ad9b-4d2fa6fb6fa4', '099536d8-040b-48e5-8419-0a0cd332202d'),
  ('7304755a-d449-4577-9986-1259af439b12', 'ef015b6e-3672-4286-a63a-54ece848299c'),
  ('eb0b4727-4b64-4a41-8383-f2201c8b4f56', 'b71da61f-a7b0-4045-93aa-2ada47050459'),
  ('8cca94ed-a38b-47a6-bb3e-9fa6c300f286', 'f02fabe7-7647-4243-9837-3523a27e889d'),
  ('90fecc2e-6441-462f-99cb-3b13323bb39a', '97d63610-59a9-4e42-b26a-3cbecd68c7ae'),
  ('0fe5a2d8-ee57-4215-bb93-46a7870b69cd', '460219af-687b-4791-8ded-effc6e786f30'),
  ('8d2b7af5-91c2-4508-a59c-7f2d365f2aec', 'f31def5b-bd14-4c44-a080-33edf112608a'),
  ('988ac01c-1a8f-49fe-bd1c-fc8c9d31dfd9', '644df216-a2ae-44e4-aa32-5186d09b9ae7'),
  ('49650d46-9601-4ab4-bbe6-993c2b65f128', 'dfba900e-ff27-4ab8-b69f-80a0fa70496a'),
  ('ebb3634f-d103-4d35-9013-f47915051dc5', '0e78e0c8-9389-491d-8512-98001f4bd075'),
  ('b9f2d3c2-a103-4908-b9bc-5e94599a2c72', '0e78e0c8-9389-491d-8512-98001f4bd075'),
  ('ec424602-9449-4f13-a338-d1527b6de7e5', 'd3be046b-6e5b-4887-a2fe-b61d151d6be8'),
  ('1185c11b-f839-433c-af4e-e55087d69cd6', 'd3be046b-6e5b-4887-a2fe-b61d151d6be8'),
  ('49806def-0797-4ce9-8831-a572a0a068f1', '214c1437-4687-4148-9c5e-63c756d9139b'),
  ('664ae65c-2c8c-4b17-bde7-386d7f305c4d', '214c1437-4687-4148-9c5e-63c756d9139b'),
  ('ad25fa70-60dd-4a3f-b882-5b192df026eb', 'e8838851-d780-4b03-a54c-36414f69a421'),
  ('6a2ac3ee-fbcf-4858-8e2b-fe0a0cfbe154', 'e8838851-d780-4b03-a54c-36414f69a421'),
  ('4cdfe115-3743-441c-b090-8be1c5b3a94b', '0896560d-68ec-4ab7-bfc0-7da51c209fa6'),
  ('f68c2665-554e-4a6b-9952-ae4c7477214d', '3b6ec0ba-a8b9-4ef2-9746-aaa5dcd0da80'),
  ('0b06ffec-b5ef-440d-ac74-d3bfd10552fb', '8f69b269-358d-4f57-a54f-be7e18b3d214'),
  ('b73c940d-f8ab-40b8-9666-9a9503794715', '8f69b269-358d-4f57-a54f-be7e18b3d214'),
  ('fb8fa523-5ab6-4cd8-be6f-6c7fb4fbeebd', 'b7d1e63a-4285-488b-b10d-b79be8222e61'),
  ('77e78418-13d9-41f1-a108-22cb226c4349', 'ef212cdd-ec86-45d1-a96f-03e8c99351bc'),
  ('c63c530d-d768-493e-b647-a0cc877c250e', 'e14887f1-a7d7-4b7a-ae51-166699580839'),
  ('29dc3690-c77d-41d8-9a25-8abc613b2266', '9134ba1d-5a2f-41fe-90a4-ff01082bc7f5'),
  ('2ec571a1-4081-4016-8a73-bd1b893b3ee4', '686e8053-39f5-4308-aadd-2e552d15e7a1'),
  ('59151fbf-a3ca-48c3-abee-44a320645dca', '0d45cd6e-7880-48c2-a7af-edcce7730d3f'),
  ('04d2335a-dbc7-4fd4-bb6f-c1dc2150eb25', '6824fdf9-c945-4c92-b1ed-93a41505d1b3'),
  ('f0ae4bca-3ada-4ad2-a653-5ce408f18d70', 'd9ce399c-8e8a-4c23-8c2b-81ed080021cb');

-- Behoud instructies/omschrijving/media van een kopie als de bewaarde versie die mist.
update public.exercise_library k set
  instructions = coalesce(nullif(trim(k.instructions), ''), (select o.instructions from public.exercise_library o join _merge m on m.old_id = o.id where m.keep_id = k.id and coalesce(trim(o.instructions), '') <> '' limit 1)),
  description  = coalesce(nullif(trim(k.description), ''), (select o.description from public.exercise_library o join _merge m on m.old_id = o.id where m.keep_id = k.id and coalesce(trim(o.description), '') <> '' limit 1)),
  media_path   = coalesce(k.media_path, (select o.media_path from public.exercise_library o join _merge m on m.old_id = o.id where m.keep_id = k.id and o.media_path is not null limit 1)),
  media_type   = coalesce(k.media_type, (select o.media_type from public.exercise_library o join _merge m on m.old_id = o.id where m.keep_id = k.id and o.media_path is not null limit 1))
where k.id in (select keep_id from _merge);

update public.schedule_library_exercises s set exercise_id = m.keep_id from _merge m where s.exercise_id = m.old_id;
update public.patient_protocol_schedule_exercises p set source_exercise_id = m.keep_id from _merge m where p.source_exercise_id = m.old_id;
update public.exercise_library e set source_exercise_id = m.keep_id from _merge m where e.source_exercise_id = m.old_id;
do $$ begin
  if to_regclass('public.protocol_phase_schedule_exercises') is not null then
    execute 'update public.protocol_phase_schedule_exercises s set exercise_id = m.keep_id from _merge m where s.exercise_id = m.old_id';
  end if;
end $$;
delete from public.exercise_library where id in (select old_id from _merge) and scope = 'reva';

-- ── 2. Instructies ──
update public.exercise_library set instructions = 'Leun voorover en steun met je goede hand op een tafel of stoel. Laat de arm aan de geopereerde kant ontspannen hangen. Laat de arm door je bovenlichaam licht te bewegen kleine cirkels en heen-en-weer bewegingen maken. Gebruik je schouderspieren niet actief.' where scope = 'reva' and title = 'Pendeloefening schouder' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Haal je arm uit de sling terwijl je bovenarm tegen je lichaam blijft. Buig en strek rustig je elleboog, draai je pols en maak een vuist en spreid je vingers. De schouder blijft stil.' where scope = 'reva' and title = 'Elleboog actief buigen en strekken' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Neem een zachte bal of opgerolde sok in je hand. Knijp er stevig in, houd 2-3 seconden vast en ontspan volledig. Dit kan ook met de arm in de sling.' where scope = 'reva' and title = 'Handknijpoefening met bal' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit of sta rechtop met ontspannen armen. Trek beide schouders rustig op richting je oren, houd even vast en laat ze langzaam zakken. Blijf binnen een pijnvrij bereik.' where scope = 'reva' and title = 'Schouderophalen (licht)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta rechtop met je duim omhoog. Hef je arm rustig naar voren tot maximaal schouderhoogte en laat hem langzaam weer zakken. Trek je schouder niet op en stop bij pijn.' where scope = 'reva' and title = 'Actieve schouderflexie tot schouderhoogte' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta zijwaarts naast een muur en leg je vingertoppen tegen de muur. Laat je hand langzaam omhoog glijden tot een comfortabele hoogte en weer terug. Houd je schouder laag en ontspannen.' where scope = 'reva' and title = 'Wandglijden zijwaarts' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Houd je elleboog in 90 graden gebogen tegen je zij, eventueel met een opgerolde handdoek ertussen. Draai je onderarm rustig naar buiten tot hij recht naar voren wijst en weer terug. Niet verder dan neutraal.' where scope = 'reva' and title = 'Schouder buitenrotatie tot neutraal' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit rechtop op een stoel zonder tegen de leuning te hangen. Trek je schouderbladen rustig naar elkaar toe en iets omlaag, houd 3-5 seconden vast en ontspan. Trek je schouders niet op.' where scope = 'reva' and title = 'Scapulaire retractie zittend' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Bevestig een band op ellebooghoogte. Houd je elleboog in 90 graden tegen je zij en draai je onderarm tegen de weerstand naar buiten. Laat hem gecontroleerd terugkomen; je elleboog blijft tegen je lichaam.' where scope = 'reva' and title = 'Schouder buitenrotatie met weerstandsband' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Bevestig een band op ellebooghoogte aan de kant van je oefenarm. Houd je elleboog in 90 graden tegen je zij en draai je onderarm tegen de weerstand naar je buik. Laat hem rustig terugkomen.' where scope = 'reva' and title = 'Schouder binnenrotatie met weerstandsband' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Ga op handen en knieën staan met je handen onder je schouders. Verplaats je gewicht rustig naar voren, achteren en opzij. Houd je schouderbladen plat op je rug en je rug recht.' where scope = 'reva' and title = 'Scapulaire stabiliteit op handen en knieën' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta rechtop met een licht gewicht in je hand en je duim naar voren. Hef je arm zijwaarts tot schouderhoogte en laat hem in 2-3 tellen gecontroleerd zakken. Trek je schouder niet op.' where scope = 'reva' and title = 'Zijwaarts heffen tot schouderhoogte' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Bevestig een band op borsthoogte en pak beide uiteinden vast. Trek je ellebogen langs je lichaam naar achteren en knijp je schouderbladen samen. Laat rustig terugkomen zonder je schouders op te trekken.' where scope = 'reva' and title = 'Roeien met weerstandsband' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Begin in een opdrukhouding tegen de muur, op je knieën of op je tenen. Doe een opdrukbeweging en duw aan het eind je schouderbladen nog extra uit elkaar, zodat je bovenrug iets bol wordt. Houd je romp stil.' where scope = 'reva' and title = 'Push-up plus (scapulaire controle)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Bevestig een band achter je op schouderhoogte. Maak langzaam en gecontroleerd een werpbeweging naar voren en laat de arm rustig terugkomen. Werk op tempo en kracht pas op als je fysiotherapeut dat aangeeft.' where scope = 'reva' and title = 'Geleide werpbeweging met weerstandsband' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta op een armlengte of iets verder van een muur met een lichte medicijnbal voor je borst. Stoot de bal met beide handen krachtig tegen de muur en vang hem gecontroleerd op. Houd je romp stevig.' where scope = 'reva' and title = 'Bal-stoot tegen muur (chest pass)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Oefen de bewegingen van jouw sport, zoals gooien, slaan of steunen, eerst op laag tempo en daarna op wedstrijdtempo. Doe dit onder begeleiding en stop als de schouder onstabiel of pijnlijk aanvoelt.' where scope = 'reva' and title = 'Sportspecifieke schouderstabiliteit eindfase' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Lig of zit met je been gestrekt. Beweeg je voet rustig op en neer, alsof je op een gaspedaal trapt. Blijf binnen een pijnvrij bereik; dit helpt de doorbloeding en vermindert zwelling.' where scope = 'reva' and title = 'Enkelpompen (pijnvrij)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit met je voeten plat op de grond. Druk de bal van je voet stevig in de grond alsof je op je tenen wilt gaan staan, maar laat je hiel niet los. Houd de spanning vast en ontspan daarna rustig.' where scope = 'reva' and title = 'Isometrische kuitaanspanning' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Wandel in een rustig, normaal tempo op een vlakke ondergrond. Kies een afstand waarbij de pijn niet duidelijk toeneemt, ook niet de volgende ochtend. Bouw elke paar dagen een paar minuten op.' where scope = 'reva' and title = 'Pijngestuurd wandelen' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit met je been ontspannen voor je. Strijk met je handen met lichte druk van je enkel richting je knie. Blijf weg van de meest gevoelige plek en druk niet hard.' where scope = 'reva' and title = 'Zelfmassage kuit (licht)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit met je been gestrekt en leg een handdoek om de bal van je voet. Trek de voet rustig naar je toe tot je een lichte rek in je kuit voelt. Houd vast zonder te veren en adem rustig door.' where scope = 'reva' and title = 'Kuitrek zittend met handdoek' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta met je handen tegen een muur, het oefenbeen achter met de hiel op de grond en de voet recht naar voren. Leun rustig naar voren tot je een lichte rek in de kuit voelt. Houd vast zonder te veren.' where scope = 'reva' and title = 'Kuitrek staand tegen muur' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit op een stoel met je voeten plat op de grond. Til je hielen rustig op, houd kort vast en laat ze langzaam zakken. Leg eventueel een licht gewicht op je knieën om op te bouwen.' where scope = 'reva' and title = 'Kuitheffing zittend (licht)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta rechtop met lichte steun aan een muur of stoel. Kom op beide benen rustig op je tenen en laat je hielen in 2-3 tellen weer zakken. Verdeel je gewicht gelijk over beide voeten.' where scope = 'reva' and title = 'Kuitheffing staand, beide benen' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta met je voorvoeten op een traprand en lichte steun voor je balans. Kom zo hoog mogelijk op je tenen en laat je hielen daarna langzaam tot onder de traprand zakken. Werk rustig en gecontroleerd.' where scope = 'reva' and title = 'Kuitheffing op twee benen (volledig bereik)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta op het oefenbeen met lichte steun aan een muur. Kom zo hoog mogelijk op je tenen en laat je hiel in 2-3 tellen zakken. Houd je knie licht ontspannen en je enkel recht.' where scope = 'reva' and title = 'Kuitheffing op één been' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta met beide voorvoeten op een traprand. Kom op twee benen omhoog, til het goede been op en laat je hiel op het oefenbeen in 3-4 tellen tot onder de traprand zakken. Kom op twee benen weer omhoog.' where scope = 'reva' and title = 'Excentrische kuitheffing (drop) op traprand' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta op het oefenbeen en hinkel licht en ritmisch op de plek, met korte grondcontacten. Land zacht op de bal van je voet met een licht gebogen knie. Stop als de pijn toeneemt.' where scope = 'reva' and title = 'Licht hinkelen op de plek' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Wissel rustig joggen af met wandelen, bijvoorbeeld 1 minuut joggen en 2 minuten wandelen. Verleng het joggen alleen als de kuit ook de dag erna rustig blijft. Loop op een vlakke, zachte ondergrond.' where scope = 'reva' and title = 'Hardlopen opbouwschema kuitblessure' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Versnel op een vlakke, rechte baan van ongeveer 80 meter rustig op naar ongeveer 80% van je sprinttempo en loop weer uit. Wandel rustig terug als herstel. Begin pas als rustig joggen klachtenvrij gaat.' where scope = 'reva' and title = 'Korte versnellingen (strides)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Jog in een rustig tempo en maak bochten en wendingen van ongeveer 45 graden, zoals een slalom tussen pionnen. Verhoog pas het tempo en de scherpte van de draai als dit soepel en pijnvrij gaat.' where scope = 'reva' and title = 'Lichte richtingsveranderingen' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Doe twee tot drie keer per week kuitheffingen op één been en op een traprand als vast onderdeel van je training. Zo houd je de opgebouwde kracht vast en verklein je de kans op een nieuwe blessure.' where scope = 'reva' and title = 'Onderhoud kuitkracht (functioneel)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Spring op twee benen licht en snel op de plek, met korte grondcontacten op de bal van je voet. Houd je knieën licht gebogen en land zacht. Bouw pas op naar één been als dit goed gaat.' where scope = 'reva' and title = 'Plyometrische kuitsprongen (opbouw)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Begin rustig en loop aaneengesloten op een tempo waarbij je nog kunt praten. Verhoog in het laatste kwart het tempo licht. Sluit af met een paar minuten uitlopen.' where scope = 'reva' and title = 'Duurloop met tempo-opbouw' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Wandel in een normaal tempo op een vlakke ondergrond. Kies een afstand waarbij je knie niet duidelijk pijnlijker wordt, ook niet de volgende dag. Bouw geleidelijk op.' where scope = 'reva' and title = 'Pijnvrij wandelen' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zit of lig met je been gestrekt en een opgerolde handdoek onder je knie. Duw je knie in de handdoek door je bovenbeenspier aan te spannen en houd 5-10 seconden vast. Ontspan volledig en herhaal.' where scope = 'reva' and title = 'Isometrische quadricepsaanspanning' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Zet het zadel zo hoog dat je knie onderaan bijna gestrekt is. Fiets in een rustig, regelmatig tempo met lage weerstand. Je mag licht buiten adem raken, maar de knie mag niet pijnlijker worden.' where scope = 'reva' and title = 'Fietsen op hometrainer (lage weerstand)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Lig op je rug met gebogen knieën en je voeten plat op de grond. Span je bilspieren aan en til je bekken op tot je romp en bovenbenen een rechte lijn vormen. Laat rustig zakken.' where scope = 'reva' and title = 'Bilbrug (glute bridge), licht' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Lig op je zij met je onderste been gebogen en het bovenste been gestrekt. Til het bovenste been rustig op met je tenen licht naar beneden en laat het gecontroleerd zakken. Rol niet naar achteren.' where scope = 'reva' and title = 'Zijligging heupabductie' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Lig op je zij met gebogen knieën en je voeten tegen elkaar. Open de bovenste knie als een schelp zonder je bekken naar achteren te laten draaien. Gebruik eventueel een band om je knieën voor extra weerstand.' where scope = 'reva' and title = 'Clamshell (schelpoefening)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta op heupbreedte met lichte steun voor je balans. Zak rustig een klein stukje door je knieën, alsof je op een hoge kruk gaat zitten, en kom weer omhoog. Houd je knieën boven je voeten en blijf pijnvrij.' where scope = 'reva' and title = 'Mini squat (ondiep, pijnvrij bereik)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta met het oefenbeen op een laag opstapje. Laat het andere been langzaam naar beneden zakken tot de hiel de grond raakt en kom weer omhoog. Houd je knie recht boven je voet en je bekken horizontaal.' where scope = 'reva' and title = 'Step-down gecontroleerd (laag opstapje)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Lig op je rug met één knie gebogen en het andere been gestrekt in de lucht. Duw door de hiel van je standbeen en til je bekken op. Houd je bekken horizontaal en laat rustig zakken.' where scope = 'reva' and title = 'Eenbenige bilbrug' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Wissel joggen en wandelen af en verleng de looptijd stap voor stap. Een lichte pijn tot 3 op 10 die de volgende ochtend weg is, is acceptabel. Neemt de pijn toe, ga dan terug naar de vorige stap.' where scope = 'reva' and title = 'Hardlopen opbouwschema lopersknie' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Jog rustig en verhoog je pasfrequentie met ongeveer 5-10%, met kortere passen. Een metronoom-app kan helpen. Land meer onder je lichaam; dit vermindert de belasting op je knie.' where scope = 'reva' and title = 'Cadansdrill (verhoogde pasfrequentie)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta op het oefenbeen met lichte steun. Zak rustig een klein stukje door je knie en kom weer omhoog. Houd je knie recht boven je voet en voorkom dat hij naar binnen valt.' where scope = 'reva' and title = 'Eenbenige squat (ondiep, gecontroleerd)' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Sta met je rug tegen een muur en je voeten een stap naar voren. Zak langs de muur tot een hoek die pijnvrij voelt en houd die positie vast. Duw daarna rustig weer omhoog.' where scope = 'reva' and title = 'Wandzit (wall sit), pijnvrij bereik' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Doe twee keer per week een vaste krachtroutine met bijvoorbeeld squats, bilbruggen, zijwaartse beenheffingen en kuitheffingen. Zo houd je de opgebouwde kracht vast en verklein je de kans op terugval.' where scope = 'reva' and title = 'Onderhoud heup- en beenkracht' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Houd je bereikte loopvolume vast en verhoog het totale volume met niet meer dan ongeveer 10% per week. Plan voldoende rustdagen tussen zwaardere trainingen.' where scope = 'reva' and title = 'Hardloop onderhoudsschema' and coalesce(trim(instructions), '') = '';
update public.exercise_library set instructions = 'Doe voor of na het lopen een korte routine: beenzwaaien naar voren en opzij, heupcirkels en een rustige kuitrek tegen de muur. Beweeg soepel en zonder te forceren.' where scope = 'reva' and title = 'Mobiliteitsroutine heup en kuit' and coalesce(trim(instructions), '') = '';

-- ── 3. Dosering en type ──
update public.exercise_library set exercise_type = 'kracht' where scope = 'reva' and title = 'Bal-stoot tegen muur (chest pass)';
update public.exercise_library set exercise_type = 'mobiliteit' where scope = 'reva' and title in ('Stokoefening flexie', 'Stokoefening buitenrotatie');

-- Helper: zet dosering van een REVA-oefening + alle REVA-schema's + patiëntkopieën.
create or replace function pg_temp.set_dose(p_title text, p_sets int, p_reps int, p_dur int, p_load text)
returns void language plpgsql as $f$
begin
  update public.exercise_library
    set default_sets = p_sets, default_reps = p_reps, default_duration_seconds = p_dur,
        default_load_text = coalesce(p_load, default_load_text)
    where scope = 'reva' and title = p_title;
  update public.schedule_library_exercises s
    set prescribed_sets = p_sets, prescribed_reps = p_reps, prescribed_duration_seconds = p_dur,
        prescribed_load_text = coalesce(p_load, s.prescribed_load_text)
    from public.exercise_library e, public.schedule_library sl
    where s.exercise_id = e.id and e.scope = 'reva' and e.title = p_title and sl.id = s.schedule_id and sl.scope = 'reva';
  update public.patient_protocol_schedule_exercises p
    set prescribed_sets = p_sets, prescribed_reps = p_reps, prescribed_duration_seconds = p_dur,
        prescribed_load_text = coalesce(p_load, p.prescribed_load_text)
    from public.exercise_library e
    where p.source_exercise_id = e.id and e.scope = 'reva' and e.title = p_title;
end $f$;

select pg_temp.set_dose('Licht hinkelen op de plek', 3, null, 20, null);
select pg_temp.set_dose('Korte versnellingen (strides)', 6, null, 20, 'Opbouwend tot ca. 80% tempo, wandelend terug');
select pg_temp.set_dose('Nekrek zijwaarts', 2, null, 30, null);
select pg_temp.set_dose('Looppatroon hertraining', 2, null, 120, 'Rustig tempo, let op afwikkeling hiel-teen');
select pg_temp.set_dose('Sportspecifieke balvaardigheid', null, null, 900, null);
select pg_temp.set_dose('Laagintensieve conditietraining', null, null, 1200, 'Rustig tempo, je kunt nog praten');

-- Rekoefeningen in REVA-schema's zonder tijd: 30 seconden vasthouden.
update public.schedule_library_exercises s
  set prescribed_duration_seconds = 30, prescribed_sets = coalesce(s.prescribed_sets, 2)
  from public.exercise_library e, public.schedule_library sl
  where s.exercise_id = e.id and e.exercise_type = 'rekken' and s.prescribed_duration_seconds is null and s.prescribed_reps is null
    and sl.id = s.schedule_id and sl.scope = 'reva';
update public.exercise_library set default_duration_seconds = 30, default_sets = coalesce(default_sets, 2)
  where scope = 'reva' and exercise_type = 'rekken' and default_duration_seconds is null and default_reps is null;

-- Conditie: nooit herhalingen zonder tijd. Overgebleven gevallen naar 10 minuten.
update public.schedule_library_exercises s
  set prescribed_reps = null, prescribed_duration_seconds = coalesce(s.prescribed_duration_seconds, 600)
  from public.exercise_library e, public.schedule_library sl
  where s.exercise_id = e.id and e.exercise_type = 'conditie' and s.prescribed_reps is not null
    and sl.id = s.schedule_id and sl.scope = 'reva';
update public.exercise_library set default_reps = null, default_duration_seconds = coalesce(default_duration_seconds, 600)
  where scope = 'reva' and exercise_type = 'conditie' and default_reps is not null;

update public.schedule_library_exercises s set prescribed_load_text = 'Volledige teamtraining'
  from public.exercise_library e, public.schedule_library sl
  where s.exercise_id = e.id and e.title = 'Volledige training meelopen' and s.prescribed_load_text is null
    and sl.id = s.schedule_id and sl.scope = 'reva';

commit;
