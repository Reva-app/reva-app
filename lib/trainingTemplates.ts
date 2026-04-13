/**
 * trainingTemplates.ts
 *
 * Standaard oefeningen per blessure-categorie.
 * Worden éénmalig ingevoegd als de gebruiker voor het eerst een blessuretype kiest
 * en nog geen oefeningen heeft.
 *
 * Categorie-mapping:
 *   knie/been  → acl, meniscus, knieband, patella, hamstring, enkel, achilles, spier
 *   schouder   → schouder
 *   rug        → rug, pees (generiek)
 *   basis      → anders (en fallback)
 */

import type { TrainingOefening } from "@/lib/data";

type OefeningTemplate = Omit<TrainingOefening, "id" | "createdAt" | "updatedAt">;

// ─── Knie / been ──────────────────────────────────────────────────────────────

const KNIE_BEEN: OefeningTemplate[] = [
  {
    title: "Quadriceps aanspanning",
    type: "Kracht",
    description:
      "Ga op je rug liggen met gestrekte benen. Span de quadriceps van het geblesseerde been aan alsof je de knieholte in de mat duwt. Houd 5 seconden vast, ontspan. Geen pijn toegestaan.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Beginoefening vroeg postoperatief — altijd pijnvrij uitvoeren.",
  },
  {
    title: "Rechtebeen-hef",
    type: "Kracht",
    description:
      "Lig op de rug. Buig het gezonde been, houd het geblesseerde been gestrekt. Til het gestrekte been op tot de hoogte van de gebogen knie, houd 2 seconden vast en laat langzaam zakken.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Versterkt de heupbuiger en quad zonder kniebelasting.",
  },
  {
    title: "Hielhef (staand)",
    type: "Kracht",
    description:
      "Sta rechtop, houd je vast aan een stoel of muur voor balans. Hef beide hielen langzaam omhoog, houd 2 seconden vast en laat rustig zakken. Bouw af naar één been zodra kracht toelaat.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Goed voor kuit- en enkeldorsaalflexie na knie- of enkelblessure.",
  },
  {
    title: "Mini squat (0–45°)",
    type: "Kracht",
    description:
      "Sta met voeten schouderbreedte uit elkaar. Buig de knieën langzaam tot ca. 45° terwijl je de romp rechtop houdt. Houd 2 seconden vast en kom langzaam terug. Knieën wijzen in lijn met de tenen.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Niet dieper dan 45° in de eerste 6 weken na knieblessure.",
  },
  {
    title: "Hamstringcurl (liggen)",
    type: "Kracht",
    description:
      "Lig op je buik. Buig het geblesseerde been richting billen, houd 2 seconden vast en laat gecontroleerd zakken. Gebruik een weerstandsband of enkelgewicht zodra de basis kracht is opgebouwd.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Essentieel voor ACL en hamstringhertel. Start zonder gewicht.",
  },
  {
    title: "Terminalextensie met band",
    type: "Kracht",
    description:
      "Maak een weerstandsband vast op kniehoogte aan een deur of paal. Doe de band om de knie van het geblesseerde been. Sta met lichte buiging in de knie en strek volledig. Gecontroleerd terugbuigen.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichte weerstandsband",
    location: "Thuis",
    note: "Slotoefening voor ACL-patiënten: traint de laatste graden extensie.",
  },
  {
    title: "Enkelcirkel (zittend)",
    type: "Mobiliteit",
    description:
      "Zit op een stoel. Til de voet van het geblesseerde been iets op en draai langzaam cirkels met de enkel — 10× met de klok mee en 10× tegen de klok in. Rustig en bewust bewegen.",
    repetitions: "2×10 cirkels",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Verbetert doorbloeding en beweeglijkheid na enkel- of knieblessure.",
  },
  {
    title: "Loopband wandelen (laag tempo)",
    type: "Conditie",
    description:
      "Wandel op een loopband of buiten op vlak terrein op comfortabel tempo. Houd een normale afwikkelbeweging aan. Stop bij pijn of significant hinken.",
    repetitions: "1× per dag",
    loadOrTime: "15–20 minuten",
    location: "Gym",
    note: "Bevordert gewricht-lubrificatie en spierherstel. Afstand opbouwen over weken.",
  },
];

// ─── Schouder ─────────────────────────────────────────────────────────────────

const SCHOUDER: OefeningTemplate[] = [
  {
    title: "Pendel (Codman)",
    type: "Mobiliteit",
    description:
      "Buig voorover, steun met de gezonde hand op een tafel. Laat de geblesseerde arm ontspannen hangen en maak kleine cirkels met de arm — gebruik de zwaartekracht, geen spierkracht. 10× elke richting.",
    repetitions: "2×10 cirkels",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Klassieke vroeg-postoperatieve oefening om gewrichtsruimte te behouden.",
  },
  {
    title: "Schouderblad-knijpen",
    type: "Kracht",
    description:
      "Zit of sta rechtop. Trek de schouderbladen naar elkaar toe alsof je een potlood tussen ze vasthoudt. Houd 5 seconden vast en ontspan. Houd de schouders laag — niet optrekken.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Activeert de middelste trapezius en rhomboid. Essentieel bij schouderstabilisatie.",
  },
  {
    title: "Externe rotatie met band",
    type: "Kracht",
    description:
      "Sta met de elleboog gebogen op 90° langs het lichaam. Houd een weerstandsband vast en draai de onderarm naar buiten (externe rotatie). Houd 2 sec vast, keer terug. Elleboog blijft tegen de zij.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichte weerstandsband",
    location: "Thuis",
    note: "Versterkt de rotatorcuff (infraspinatus/teres minor). Start licht.",
  },
  {
    title: "Interne rotatie met band",
    type: "Kracht",
    description:
      "Zelfde opstelling als externe rotatie maar draai de onderarm naar binnen. Beweeg gecontroleerd en pijnvrij. Elleboog blijft langs het lichaam.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichte weerstandsband",
    location: "Thuis",
    note: "Traint de subscapularis. Combineer altijd met externe rotatie voor balans.",
  },
  {
    title: "Muurwandeling (vingers)",
    type: "Mobiliteit",
    description:
      "Sta voor een muur. Laat de vingers van de geblesseerde arm langzaam de muur omhoog lopen zo hoog als pijnvrij mogelijk is. Houd 5 seconden vast en kom terug. Markeer progressie op de muur.",
    repetitions: "2×10 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Vergroot flexie-ROM stap voor stap. Altijd pijnvrij werken.",
  },
  {
    title: "Scapulaire push-up (muur)",
    type: "Stabiliteit",
    description:
      "Sta voor een muur met uitgestrekte armen op schouderhoogte. Duw de schouderbladen van elkaar af (protractie) en laat ze dan naar elkaar toe zakken (retractie). Armen blijven gestrekt.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Traint serratus anterior — cruciaal voor schouderblad-ritme en rotatorstabiliteit.",
  },
  {
    title: "Theraband rijtrek",
    type: "Kracht",
    description:
      "Bevestig een band op borsthoogte. Trek de band naar je toe met de ellebogen langs het lichaam omhoog (roeivorm). Schouderbladen samentrekken in de eindstand, gecontroleerd terugkeren.",
    repetitions: "3×12 herh.",
    loadOrTime: "Lichte weerstandsband",
    location: "Thuis",
    note: "Versterkt de mid-back en posterieure schouderspieren.",
  },
  {
    title: "Loopband wandelen (licht)",
    type: "Conditie",
    description:
      "Wandel op comfortabel tempo. Laat de armen ontspannen mee-zwaaien. Vermijd extra belasting op de schouder. Focus op algehele conditie en doorbloeding.",
    repetitions: "1× per dag",
    loadOrTime: "20 minuten",
    location: "Buiten",
    note: "Conditiebehoud tijdens schouderherstel. Geen arm-zwaar werk.",
  },
];

// ─── Rug ──────────────────────────────────────────────────────────────────────

const RUG: OefeningTemplate[] = [
  {
    title: "Knieën naar borst (rek)",
    type: "Rekken",
    description:
      "Lig op je rug. Trek beide knieën voorzichtig naar de borst en houd ze vast met de handen. Voel een rustige rek in de lage rug. Rustig ademen — niet forceren.",
    repetitions: "3× 30 seconden",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Ontspant de lumbale wervelkolom. Goed als ochtendroutine.",
  },
  {
    title: "Bekkenkanteling (lig)",
    type: "Stabiliteit",
    description:
      "Lig op de rug met knieën gebogen. Duw de lage rug actief in de mat door de buik aan te spannen (kleine bekkenrotatie). Houd 5 sec vast, ontspan. Geen grote beweging nodig.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Activeert diepe buikspieren en vermindert lumbale hyperlordose.",
  },
  {
    title: "Bird-dog",
    type: "Stabiliteit",
    description:
      "Begin op handen en knieën. Strek gelijktijdig de rechterarm vooruit en het linkerbeen achteraan. Houd de romp stabiel — rug plat, geen rotatie. Houd 3 sec vast en wissel.",
    repetitions: "3×10 herh. per zijde",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Traint de multifidus en erector spinae in gecontroleerde beweging.",
  },
  {
    title: "Brug (glute bridge)",
    type: "Kracht",
    description:
      "Lig op de rug, knieën gebogen, voeten op heupbreedte. Duw de heupen omhoog totdat knie, heup en schouder één lijn vormen. Houd 2 sec vast en laat langzaam zakken.",
    repetitions: "3×15 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Versterkt bilspieren en heupen — vermindert lumbale overbelasting.",
  },
  {
    title: "Cat-cow stretch",
    type: "Mobiliteit",
    description:
      "Begin op handen en knieën. Adem uit terwijl je de rug naar boven wolt (kat). Adem in terwijl je de rug hol maakt en het hoofd licht opheft (koe). Vloeiend bewegen.",
    repetitions: "2×10 herh.",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Verbetert mobiliteit van de thoracale en lumbale wervelkolom.",
  },
  {
    title: "Wandelen (vlak terrein)",
    type: "Conditie",
    description:
      "Wandel op vlak terrein met een rechtop gehouden houding. Gebruik rustgevend tempo. Vermijd lange perioden stilzitten direct voor en na de wandeling.",
    repetitions: "1× per dag",
    loadOrTime: "20–30 minuten",
    location: "Buiten",
    note: "Actief bewegen is beter dan rust bij rugpijn. Opbouwen in duur.",
  },
];

// ─── Basis (fallback / anders) ─────────────────────────────────────────────────

const BASIS: OefeningTemplate[] = [
  {
    title: "Wandelen (vlak terrein)",
    type: "Conditie",
    description:
      "Wandel op vlak terrein op comfortabel tempo. Houd een rechtop houding en laat de armen ontspannen mee-zwaaien. Stop bij pijn of ongemak.",
    repetitions: "1× per dag",
    loadOrTime: "20 minuten",
    location: "Buiten",
    note: "Laag-impact beweegactiviteit geschikt voor vrijwel elke blessure.",
  },
  {
    title: "Ademhalingsoefening (diafragma)",
    type: "Stabiliteit",
    description:
      "Zit of lig ontspannen. Leg een hand op de buik. Adem diep in via de neus — de buik bol je uit (niet de borst). Adem langzaam uit via de mond. Rustig en gecontroleerd.",
    repetitions: "2×10 ademteugen",
    loadOrTime: "—",
    location: "Thuis",
    note: "Activeert het parasympathisch zenuwstelsel en ondersteunt herstel.",
  },
  {
    title: "Statisch rekken — hamstrings",
    type: "Rekken",
    description:
      "Zit op de grond met gestrekte benen. Buig voorover vanuit de heupen (niet de rug ronden) richting je voeten. Houd de rek vast. Geen stuiterende bewegingen.",
    repetitions: "3× 30 seconden",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Verbetert lenigheid van de achterzijde van de benen.",
  },
  {
    title: "Heupbuiger rek (uitvalspas)",
    type: "Rekken",
    description:
      "Zet één knie op de grond in een uitvalspas. Duw de heupen licht naar voren tot je een rek voelt aan de voorkant van de heup. Romp rechtop, billen aanspannen.",
    repetitions: "3× 30 seconden per zijde",
    loadOrTime: "Lichaamsgewicht",
    location: "Thuis",
    note: "Tegengaat heupbalkverkorting bij mensen die lang zitten of weinig bewegen.",
  },
  {
    title: "Schouderrollen",
    type: "Mobiliteit",
    description:
      "Zit rechtop op een stoel. Rol de schouders langzaam naar voren, dan omhoog, naar achteren en naar beneden. Voer de volledige cirkel uit, rustig en bewust.",
    repetitions: "2×10 cirkels elke richting",
    loadOrTime: "—",
    location: "Thuis",
    note: "Licht activerende mobiliteits­oefening voor de bovenrug en schouders.",
  },
];

// ─── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Geeft de juiste oefeningen terug op basis van het blessuretype.
 * Voegt automatisch id, createdAt en updatedAt toe.
 */
export function getOefeningenVoorBlessure(blessureType: string): TrainingOefening[] {
  const now = new Date().toISOString();

  const knienBeen = ["acl", "meniscus", "knieband", "patella", "hamstring", "enkel", "achilles", "spier"];
  const schouder  = ["schouder"];
  const rug       = ["rug", "pees"];

  let templates: OefeningTemplate[];

  if (knienBeen.includes(blessureType)) {
    templates = KNIE_BEEN;
  } else if (schouder.includes(blessureType)) {
    templates = SCHOUDER;
  } else if (rug.includes(blessureType)) {
    templates = RUG;
  } else {
    templates = BASIS;
  }

  return templates.map((t) => ({
    ...t,
    id:        crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }));
}
