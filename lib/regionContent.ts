// ─── Regio-gebaseerde "deze week kun je verwachten"-content ─────────────────
// Vertaalt een BodyRegion (lib/intakeAnalysis.ts) naar generieke, regio-brede
// verwachtingsteksten. Bewust GEEN per-protocol-specifieke content (dat zou
// losse auteursinhoud per herstelplan vergen, een apart, groter traject) —
// dit is een eerlijke, altijd-beschikbare baseline per lichaamsregio,
// duidelijk als zodanig gelabeld in de UI, niet als gepersonaliseerd
// medisch advies.

import type { BodyRegion } from "./intakeAnalysis";

export interface WeeklyExpectation {
  normale: string[];
  verwacht: string[];
}

const REGION_EXPECTATIONS: Record<BodyRegion, WeeklyExpectation> = {
  joint: {
    verwacht: ["Geleidelijk meer controle over het gewricht", "Iets minder zwelling dan vorige week", "Meer vertrouwen bij belasten"],
    normale: ["Een warm gevoel na training", "Lichte stijfheid 's ochtends", "Wisselende zwelling na een actieve dag"],
  },
  muscle: {
    verwacht: ["Iets meer belastbaarheid dan vorige week", "Minder spanning in het spierweefsel", "Soepeler bewegen bij dagelijkse activiteiten"],
    normale: ["Lichte spierpijn na training", "Een strak gevoel bij opstarten van een oefening"],
  },
  spine: {
    verwacht: ["Iets meer bewegingsvrijheid", "Minder last bij langer zitten of staan", "Rustiger nachten"],
    normale: ["Stijfheid bij het opstaan", "Wisselende klachten bij langdurig dezelfde houding"],
  },
  pelvic: {
    verwacht: ["Meer controle bij dagelijkse bewegingen", "Geleidelijk meer belastbaarheid"],
    normale: ["Wisselende klachten gedurende de dag", "Gevoeligheid bij bepaalde bewegingen"],
  },
  other: {
    verwacht: ["Geleidelijke vooruitgang ten opzichte van vorige week"],
    normale: ["Wisselende klachten van dag tot dag horen bij herstel"],
  },
};

export function getWeeklyExpectation(region: BodyRegion): WeeklyExpectation {
  return REGION_EXPECTATIONS[region];
}
