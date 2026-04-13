import type { Mijlpaal } from "@/lib/data";

type MijlpalenTemplate = Array<{ fase: string; title: string }>;

// ─── Templates per blessure type ─────────────────────────────────────────────

const KNIE_KRUISBAND: MijlpalenTemplate = [
  // Fase 1
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na operatie of blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zwelling grotendeels verminderd" },
  { fase: "Fase 1 – Vroeg herstel", title: "Pijn controleerbaar zonder medicatie" },
  { fase: "Fase 1 – Vroeg herstel", title: "Volledige knieextensie (rechtstand) bereikt" },
  { fase: "Fase 1 – Vroeg herstel", title: "90° knieflexie bereikt" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen met één kruk" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder krukken" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zelfstandig traplopen (met leuning)" },
  // Fase 2
  { fase: "Fase 2 – Beweging",      title: "120° knieflexie bereikt" },
  { fase: "Fase 2 – Beweging",      title: "Traplopen zonder leuning" },
  { fase: "Fase 2 – Beweging",      title: "Fietsen op hometrainer (20 min)" },
  { fase: "Fase 2 – Beweging",      title: "Balans op één been (10 seconden)" },
  { fase: "Fase 2 – Beweging",      title: "Squat zonder pijn" },
  { fase: "Fase 2 – Beweging",      title: "Eerste wandeling buiten (30 min)" },
  // Fase 3
  { fase: "Fase 3 – Kracht",        title: "60% spierkracht t.o.v. andere been" },
  { fase: "Fase 3 – Kracht",        title: "80% spierkracht t.o.v. andere been" },
  { fase: "Fase 3 – Kracht",        title: "Volledige mobiliteit hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Geen pijn bij dagelijkse beweging" },
  { fase: "Fase 3 – Kracht",        title: "Licht joggen pijnvrij (5 min)" },
  { fase: "Fase 3 – Kracht",        title: "Hardlopen op vlakke ondergrond (15 min)" },
  // Fase 4
  { fase: "Fase 4 – Terugkeer",     title: "Eerste lichte sportactiviteit" },
  { fase: "Fase 4 – Terugkeer",     title: "Springen en landen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste volledige training" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste wedstrijd of intensieve sessie" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const KNIE_MENISCUS: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na operatie of blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zwelling en warmte verminderd" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder krukken" },
  { fase: "Fase 1 – Vroeg herstel", title: "Volledig gewicht dragen op het been" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder mank te gaan" },
  { fase: "Fase 1 – Vroeg herstel", title: "Traplopen met steun" },
  { fase: "Fase 2 – Beweging",      title: "Traplopen zelfstandig zonder steun" },
  { fase: "Fase 2 – Beweging",      title: "Knie volledig buigen (>120°)" },
  { fase: "Fase 2 – Beweging",      title: "Fietsen op hometrainer pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Squat tot 90° zonder pijn" },
  { fase: "Fase 2 – Beweging",      title: "Eerste wandeling buiten (30 min)" },
  { fase: "Fase 3 – Kracht",        title: "Spierkracht rondom knie hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Balans op één been stabiel (30 sec)" },
  { fase: "Fase 3 – Kracht",        title: "Geen zwelling na belasting" },
  { fase: "Fase 3 – Kracht",        title: "Licht joggen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste lichte sportactiviteit" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste volledige training" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const KNIE_KNIEBAND: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zwelling en pijn bij rust verdwenen" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder krukken" },
  { fase: "Fase 1 – Vroeg herstel", title: "Normaal looppatroon hersteld" },
  { fase: "Fase 1 – Vroeg herstel", title: "Traplopen mogelijk" },
  { fase: "Fase 2 – Beweging",      title: "Volledige knieflexie en extensie" },
  { fase: "Fase 2 – Beweging",      title: "Balans en coördinatie getraind" },
  { fase: "Fase 2 – Beweging",      title: "Fietsen pijnvrij (20 min)" },
  { fase: "Fase 2 – Beweging",      title: "Eerste wandeling buiten (30 min)" },
  { fase: "Fase 3 – Kracht",        title: "Kniestabiliteit hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Geen pijn bij laterale bewegingen" },
  { fase: "Fase 3 – Kracht",        title: "Spierkracht gelijkwaardig aan andere kant" },
  { fase: "Fase 3 – Kracht",        title: "Licht joggen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste lichte sportactiviteit" },
  { fase: "Fase 4 – Terugkeer",     title: "Richtingsveranderingen en draaien pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Volledige sporttraining" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const KNIE_PATELLA: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na operatie of blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Pijn en zwelling verminderd" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder krukken" },
  { fase: "Fase 1 – Vroeg herstel", title: "Volledig lopen zonder pijn" },
  { fase: "Fase 1 – Vroeg herstel", title: "Traplopen met lichte steun" },
  { fase: "Fase 2 – Beweging",      title: "Traplopen zelfstandig pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Knie volledig buigen (>120°)" },
  { fase: "Fase 2 – Beweging",      title: "Fietsen op hometrainer (20 min)" },
  { fase: "Fase 2 – Beweging",      title: "Eerste wandeling buiten (30 min)" },
  { fase: "Fase 3 – Kracht",        title: "Quadricepskracht hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Squatten en lunges pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Balans op één been stabiel" },
  { fase: "Fase 3 – Kracht",        title: "Springen en landen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste lichte sportactiviteit" },
  { fase: "Fase 4 – Terugkeer",     title: "Hardlopen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste volledige training" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const ENKEL: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zwelling en blauwe plek verminderd" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder krukken" },
  { fase: "Fase 1 – Vroeg herstel", title: "Volledig belasten zonder pijn" },
  { fase: "Fase 1 – Vroeg herstel", title: "Normaal looppatroon hersteld" },
  { fase: "Fase 1 – Vroeg herstel", title: "Traplopen zelfstandig" },
  { fase: "Fase 2 – Beweging",      title: "Balans op enkel (30 seconden)" },
  { fase: "Fase 2 – Beweging",      title: "Zijwaartse bewegingen pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Eerste wandeling buiten (30 min)" },
  { fase: "Fase 2 – Beweging",      title: "Licht joggen pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Enkelspierkracht volledig hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Hardlopen op vlakke ondergrond pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Springen en landen pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Richtingsveranderingen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste lichte sportactiviteit" },
  { fase: "Fase 4 – Terugkeer",     title: "Oneven terrein lopen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Volledige training pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const SCHOUDER: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na operatie of blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Pijn bij rust controleerbaar" },
  { fase: "Fase 1 – Vroeg herstel", title: "Mitella of sling afgebouwd" },
  { fase: "Fase 1 – Vroeg herstel", title: "Arm tot schouderhoogte heffen" },
  { fase: "Fase 1 – Vroeg herstel", title: "Aankleden zelfstandig mogelijk" },
  { fase: "Fase 1 – Vroeg herstel", title: "Dagelijkse taken pijnvrij uitvoeren" },
  { fase: "Fase 2 – Beweging",      title: "Volledige armheffing (180°) bereikt" },
  { fase: "Fase 2 – Beweging",      title: "Arm achter rug mogelijk" },
  { fase: "Fase 2 – Beweging",      title: "Rotatie schouder volledig hersteld" },
  { fase: "Fase 2 – Beweging",      title: "Autorijden pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "60% schouderkracht t.o.v. andere kant" },
  { fase: "Fase 3 – Kracht",        title: "80% schouderkracht t.o.v. andere kant" },
  { fase: "Fase 3 – Kracht",        title: "Geen instabiliteitsgevoel" },
  { fase: "Fase 3 – Kracht",        title: "Boven hoofd tillen zonder pijn" },
  { fase: "Fase 4 – Terugkeer",     title: "Duwen en trekken zonder pijn" },
  { fase: "Fase 4 – Terugkeer",     title: "Slapen op aangedane zijde mogelijk" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste lichte sportactiviteit" },
  { fase: "Fase 4 – Terugkeer",     title: "Gooien of slaan pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const SPIER_HAMSTRING: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Pijn bij rust verdwenen" },
  { fase: "Fase 1 – Vroeg herstel", title: "Normaal lopen zonder hinkelen" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lichte rek zonder pijn" },
  { fase: "Fase 1 – Vroeg herstel", title: "Traplopen pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Volledige rekbaarheid teruggewonnen" },
  { fase: "Fase 2 – Beweging",      title: "Wandelen 30 minuten pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Licht joggen pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Versnellen en afremmen pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "60% spierkracht t.o.v. andere kant" },
  { fase: "Fase 3 – Kracht",        title: "80% spierkracht t.o.v. andere kant" },
  { fase: "Fase 3 – Kracht",        title: "Hardlopen op tempo pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Sprint pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste volledige training" },
  { fase: "Fase 4 – Terugkeer",     title: "Wedstrijdbelasting pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const PEES_ACHILLES: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Pijn bij rust verdwenen" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen zonder krukken" },
  { fase: "Fase 1 – Vroeg herstel", title: "Normaal looppatroon hersteld" },
  { fase: "Fase 1 – Vroeg herstel", title: "Traplopen pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Wandelen 30 minuten pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Hielhef op één been pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Licht jogging pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Richtingsveranderingen pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Excentrische peesoefeningen pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Volledige peeskracht hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Springen en landen pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste volledige training" },
  { fase: "Fase 4 – Terugkeer",     title: "Hardlopen op tempo pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Wedstrijdbelasting pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const RUG: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Acuut pijnniveau sterk verminderd" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zelfstandig opstaan uit bed mogelijk" },
  { fase: "Fase 1 – Vroeg herstel", title: "Zitten > 30 minuten zonder pijn" },
  { fase: "Fase 1 – Vroeg herstel", title: "Lopen > 20 minuten zonder pijn" },
  { fase: "Fase 2 – Beweging",      title: "Buigen en strekken pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Core-stabilisatieoefeningen gestart" },
  { fase: "Fase 2 – Beweging",      title: "Autorijden pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Schoenen aantrekken zonder hulp" },
  { fase: "Fase 3 – Kracht",        title: "Core-stabiliteit volledig hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Tillen tot 10 kg pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Langdurig staan en lopen pijnvrij" },
  { fase: "Fase 3 – Kracht",        title: "Zitten > 60 minuten zonder pijn" },
  { fase: "Fase 4 – Terugkeer",     title: "Volledig actief in dagelijks leven" },
  { fase: "Fase 4 – Terugkeer",     title: "Sport of intensieve activiteit pijnvrij" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

const GENERIEK: MijlpalenTemplate = [
  { fase: "Fase 1 – Vroeg herstel", title: "Eerste stap gezet na blessure" },
  { fase: "Fase 1 – Vroeg herstel", title: "Pijn bij rust controleerbaar" },
  { fase: "Fase 1 – Vroeg herstel", title: "Slapen zonder pijn mogelijk" },
  { fase: "Fase 1 – Vroeg herstel", title: "Normale dagelijkse activiteiten mogelijk" },
  { fase: "Fase 2 – Beweging",      title: "Lichte beweging pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Wandelen 30 minuten pijnvrij" },
  { fase: "Fase 2 – Beweging",      title: "Volledig belastbaar in dagelijks leven" },
  { fase: "Fase 3 – Kracht",        title: "Spierkracht grotendeels hersteld" },
  { fase: "Fase 3 – Kracht",        title: "Geen pijn bij alle bewegingen" },
  { fase: "Fase 3 – Kracht",        title: "Conditie op basisniveau hersteld" },
  { fase: "Fase 4 – Terugkeer",     title: "Eerste sportactiviteit of intensieve beweging" },
  { fase: "Fase 4 – Terugkeer",     title: "Terug op oud niveau" },
];

// ─── Mapping blessure type → template ────────────────────────────────────────

const TEMPLATES: Record<string, MijlpalenTemplate> = {
  acl:       KNIE_KRUISBAND,
  meniscus:  KNIE_MENISCUS,
  knieband:  KNIE_KNIEBAND,
  patella:   KNIE_PATELLA,
  enkel:     ENKEL,
  schouder:  SCHOUDER,
  spier:     SPIER_HAMSTRING,
  hamstring: SPIER_HAMSTRING,
  pees:      PEES_ACHILLES,
  achilles:  PEES_ACHILLES,
  rug:       RUG,
  anders:    GENERIEK,
};

// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Returns a list of Mijlpaal objects for the given blessureType.
 * Falls back to the generic template if the type is unknown.
 * All milestones start as not-completed.
 */
export function getMijlpalenVoorBlessure(blessureType: string): Mijlpaal[] {
  const template = TEMPLATES[blessureType] ?? GENERIEK;
  const now = new Date().toISOString();

  return template.map((item) => ({
    id: crypto.randomUUID(),
    fase: item.fase,
    title: item.title,
    completed: false,
    createdAt: now,
    updatedAt: now,
  } satisfies Mijlpaal));
}
