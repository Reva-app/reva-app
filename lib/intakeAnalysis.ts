// ─── REVA Analyse Engine ────────────────────────────────────────────────────
// Regel-gebaseerde intake-analyse. Pure functie — zelfde input → zelfde
// output. Ontworpen om later ingeruild te worden voor een echte AI-call,
// zonder de rest van de wizard/UI te hoeven aanpassen (zelfde patroon als
// lib/coach.ts).
//
// Om later een echte AI in te ruilen:
//   1. Behoud hetzelfde IntakeAnalysis return-type
//   2. Vervang generateIntakeAnalysis() door een async API-call
//   3. Geef IntakeAnalysisInput mee als promptcontext

import { BLESSURE_TYPEN } from "./data";
import { INJURY_CATEGORY_LABELS, type PortalProtocolCard } from "./services/protocolService";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Swelling = "none" | "mild" | "significant";
export type MobilityAid = "none" | "one_crutch" | "two_crutches" | "walker" | "wheelchair" | "tape_bandage" | "brace" | "other";
export type WeightBearingStatus = "full" | "partial" | "non_weight_bearing";
export type VisitReason = "surgery" | "sports_injury" | "chronic_complaint" | "overuse" | "rehabilitation" | "other";
export type SymptomOnset = "lt_2_weeks" | "2_6_weeks" | "6_12_weeks" | "gt_3_months";
export type DailyImpact = "none" | "mild" | "moderate" | "severe";
export type BodySide = "left" | "right" | "both";

/**
 * Grove lichaamsregio per blessuretype (BLESSURE_TYPEN-waarde) — bepaalt
 * welke intakevelden relevant zijn (bv. ROM in graden heeft weinig zin bij
 * een midline-aandoening als de rug of het bekken) en of een links/rechts-
 * keuze zinvol is. "joint" = gewrichtsgebonden blessures waar ROM en zijde
 * beide relevant zijn, "muscle" = spier-/peesblessures waar zijde relevant
 * is maar ROM in graden niet goed te duiden, "spine"/"pelvic" = midline,
 * geen zijde en geen ROM, "other" = onbekend (bv. "anders").
 */
export type BodyRegion = "joint" | "muscle" | "spine" | "pelvic" | "other";

export const BODY_REGION_BY_INJURY_TYPE: Record<string, BodyRegion> = {
  acl: "joint", meniscus: "joint", enkel: "joint", schouder: "joint", knieband: "joint",
  achilles: "joint", patella: "joint", knieprothese: "joint", heupprothese: "joint",
  schouderluxatie: "joint", lopersknie: "joint", hielspoor: "joint", elleboogklachten: "joint",
  knieartrose: "joint", heupartrose: "joint", bevroren_schouder: "joint",
  spier: "muscle", hamstring: "muscle", lies: "muscle", pees: "muscle",
  kuitblessure: "muscle", scheenbeenvliesklachten: "muscle",
  rug: "spine", nekklachten: "spine",
  bekkeninstabiliteit: "pelvic", bekkenbodemklachten: "pelvic", diastase_recti: "pelvic",
  anders: "other",
};

export function getBodyRegion(injuryType: string): BodyRegion {
  return BODY_REGION_BY_INJURY_TYPE[injuryType] ?? "other";
}

/** Links/rechts is alleen zinvol bij blessures met een duidelijke zijde — niet bij midline-aandoeningen. */
export function hasLaterality(injuryType: string): boolean {
  const region = getBodyRegion(injuryType);
  return region === "joint" || region === "muscle";
}

export const BODY_SIDE_LABELS: Record<BodySide, string> = {
  left: "links", right: "rechts", both: "beide zijden",
};

export const VISIT_REASON_LABELS: Record<VisitReason, string> = {
  surgery: "Operatie",
  sports_injury: "Sportblessure",
  chronic_complaint: "Chronische klacht",
  overuse: "Overbelasting",
  rehabilitation: "Revalidatie",
  other: "Anders",
};

export interface IntakeInput {
  visitReason: VisitReason | "";
  bodySide: BodySide | "";
  pregnancyRelated: boolean;
  radiatingPain: boolean;

  painScoreNow: number | null;
  swelling: Swelling | "";
  painLocation: string;

  mobilityAid: MobilityAid | "";
  weightBearingStatus: WeightBearingStatus | "";
  romDegrees: number | null;
  additionalProcedures: string;

  symptomOnset: SymptomOnset | "";
  previousTreatmentText: string;
  dailyImpact: DailyImpact | "";

  returnToSportGoal: boolean;
  sportType: string;
  returnToWorkGoal: boolean;
  goalTimeframeMonths: number | null;
  patientGoalText: string;
  therapistObservations: string;
}

export const emptyIntakeInput: IntakeInput = {
  visitReason: "",
  bodySide: "",
  pregnancyRelated: false,
  radiatingPain: false,
  painScoreNow: null,
  swelling: "",
  painLocation: "",
  mobilityAid: "",
  weightBearingStatus: "",
  romDegrees: null,
  additionalProcedures: "",
  symptomOnset: "",
  previousTreatmentText: "",
  dailyImpact: "",
  returnToSportGoal: false,
  sportType: "",
  returnToWorkGoal: false,
  goalTimeframeMonths: null,
  patientGoalText: "",
  therapistObservations: "",
};

export interface AttentionPoint {
  label: string;
  severity: "info" | "warning";
}

export interface SuggestedGoal {
  icon: string;
  title: string;
  description: string;
  targetDate: string; // "YYYY-MM-DD" of ""
}

export interface ProtocolRecommendation {
  protocol: PortalProtocolCard;
  stars: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
}

export interface IntakeAnalysis {
  summary: string;
  attentionPoints: AttentionPoint[];
  suggestedGoals: SuggestedGoal[];
  recommendation: ProtocolRecommendation | null;
  alternatives: ProtocolRecommendation[];
}

export interface IntakeAnalysisInput {
  injuryType: string;
  injuryDate: string;
  surgeryDate: string;
  treatmentStartDate: string;
  intake: IntakeInput;
  availableProtocols: PortalProtocolCard[];
  now?: Date;
}

// ─── Blessuretype → protocolcategorie ──────────────────────────────────────
// patients.injury_type (BLESSURE_TYPEN, 14 patiëntgerichte waarden) en
// protocols.injury_category (13 protocolcatalogus-waarden) zijn bewust twee
// gescheiden vocabulaires (zie migratie 054) — er bestaat geen 1-op-1 match
// voor elk blessuretype. Waar geen nette match bestaat, valt de mapping
// eerlijk terug op "custom" in plaats van te gokken.
export const INJURY_TYPE_TO_CATEGORY: Record<string, string> = {
  acl: "acl",
  meniscus: "meniscus",
  enkel: "ankle_sprain",
  spier: "muscle_strain_general",
  hamstring: "hamstring_strain",
  lies: "groin_strain",
  schouder: "rotator_cuff",
  knieband: "mcl_sprain",
  pees: "tendinopathy_general",
  rug: "low_back_pain",
  achilles: "achilles_tendinopathy",
  patella: "patellofemoral_pain",
  knieprothese: "total_knee_replacement",
  heupprothese: "total_hip_replacement",
  // Vrouwenblessures
  bekkeninstabiliteit: "pelvic_instability",
  bekkenbodemklachten: "pelvic_floor_dysfunction",
  diastase_recti: "rectus_diastasis",
  // Acute sportblessures
  schouderluxatie: "shoulder_dislocation",
  kuitblessure: "calf_strain",
  // Overbelasting-specifiek
  lopersknie: "patellofemoral_pain",
  scheenbeenvliesklachten: "shin_splints",
  hielspoor: "plantar_fasciitis",
  elleboogklachten: "elbow_tendinopathy",
  // Chronisch-specifiek
  nekklachten: "neck_pain_chronic",
  knieartrose: "knee_osteoarthritis",
  heupartrose: "hip_osteoarthritis",
  bevroren_schouder: "shoulder_chronic_pain",
  anders: "custom",
};

// ─── Datumhelper ─────────────────────────────────────────────────────────────

function weeksSince(dateStr: string, now: Date): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return null;
  const diffMs = now.getTime() - then.getTime();
  return Math.max(0, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

function blessureLabel(injuryType: string): string {
  return BLESSURE_TYPEN.find((b) => b.value === injuryType)?.label ?? "";
}

// ─── Builder: AI Samenvatting ───────────────────────────────────────────────

const SYMPTOM_ONSET_LABELS: Record<SymptomOnset, string> = {
  lt_2_weeks: "minder dan 2 weken",
  "2_6_weeks": "2 tot 6 weken",
  "6_12_weeks": "6 tot 12 weken",
  gt_3_months: "meer dan 3 maanden",
};

function buildSummary(input: IntakeAnalysisInput, weeksPostOp: number | null): string {
  const { intake, injuryType, surgeryDate } = input;
  const fragments: string[] = [];

  if (intake.visitReason && intake.visitReason !== "surgery") {
    fragments.push(`De patiënt komt in verband met: ${VISIT_REASON_LABELS[intake.visitReason].toLowerCase()}.`);
  }

  if (intake.visitReason === "sports_injury" && intake.sportType.trim()) {
    fragments.push(`De blessure ontstond tijdens het sporten (${intake.sportType.trim()}).`);
  }

  const sideSuffix = intake.bodySide ? ` (${BODY_SIDE_LABELS[intake.bodySide]})` : "";

  if (surgeryDate && weeksPostOp !== null) {
    const label = blessureLabel(injuryType);
    fragments.push(
      weeksPostOp === 0
        ? `De patiënt is deze week geopereerd${label ? ` (${label.toLowerCase()})` : ""}${sideSuffix}.`
        : `De patiënt is ${weeksPostOp} ${weeksPostOp === 1 ? "week" : "weken"} geleden geopereerd${label ? ` (${label.toLowerCase()})` : ""}${sideSuffix}.`
    );
  } else if (injuryType) {
    fragments.push(`De patiënt heeft te maken met: ${blessureLabel(injuryType).toLowerCase()}${sideSuffix}.`);
  }

  if (intake.additionalProcedures.trim()) {
    fragments.push(`Tijdens dezelfde ingreep is aanvullend: ${intake.additionalProcedures.trim()}.`);
  }

  if (intake.pregnancyRelated) {
    fragments.push("De klachten zijn gerelateerd aan zwangerschap of bevalling.");
  }

  if (intake.radiatingPain) {
    fragments.push("Er is sprake van uitstraling naar arm of been.");
  }

  if (intake.mobilityAid && intake.mobilityAid !== "none") {
    const aidLabel: Record<MobilityAid, string> = {
      none: "", one_crutch: "loopt momenteel met één kruk", two_crutches: "loopt momenteel met twee krukken",
      walker: "gebruikt momenteel een rollator", wheelchair: "gebruikt momenteel een rolstoel",
      tape_bandage: "gebruikt momenteel tape of verband", brace: "draagt momenteel een brace",
      other: "gebruikt momenteel een hulpmiddel bij het lopen",
    };
    fragments.push(`De patiënt ${aidLabel[intake.mobilityAid]}.`);
  }

  const painParts: string[] = [];
  if (intake.painScoreNow !== null) painParts.push(`een pijnscore van ${intake.painScoreNow}/10`);
  if (intake.romDegrees !== null) painParts.push(`een mobiliteit (ROM) van ${intake.romDegrees}°`);
  if (painParts.length > 0) fragments.push(`Momenteel is er ${painParts.join(" en ")}.`);

  if (intake.symptomOnset) {
    fragments.push(`De klachten bestaan al ${SYMPTOM_ONSET_LABELS[intake.symptomOnset]}.`);
  }

  if (intake.dailyImpact === "moderate" || intake.dailyImpact === "severe") {
    fragments.push(`Dit beperkt het dagelijks functioneren ${intake.dailyImpact === "severe" ? "ernstig" : "matig"}.`);
  }

  if (intake.previousTreatmentText.trim()) {
    fragments.push(`Eerder gevolgde behandeling: ${intake.previousTreatmentText.trim()}.`);
  }

  const goalParts: string[] = [];
  if (intake.returnToSportGoal) goalParts.push(intake.sportType.trim() ? `weer te kunnen ${intake.sportType.trim()}` : "weer te kunnen sporten");
  if (intake.returnToWorkGoal) goalParts.push("terug te keren naar werk");
  if (intake.patientGoalText.trim()) goalParts.push(intake.patientGoalText.trim());
  if (goalParts.length > 0) {
    const timeframe = intake.goalTimeframeMonths ? ` binnen ${intake.goalTimeframeMonths} ${intake.goalTimeframeMonths === 1 ? "maand" : "maanden"}` : "";
    fragments.push(`Het persoonlijke doel is om${timeframe} ${goalParts.join(" en ")}.`);
  }

  if (fragments.length === 0) {
    return "Er is nog geen intake ingevuld — vul de intake in voor een samenvatting en herstelplan-aanbeveling.";
  }
  return fragments.join(" ");
}

// ─── Builder: Aandachtspunten ───────────────────────────────────────────────

function buildAttentionPoints(input: IntakeAnalysisInput, weeksPostOp: number | null): AttentionPoint[] {
  const { intake } = input;
  const points: AttentionPoint[] = [];

  if (intake.radiatingPain) {
    points.push({ label: "Uitstraling naar arm of been", severity: "warning" });
  }
  if (intake.painScoreNow !== null && intake.painScoreNow >= 6) {
    points.push({ label: "Hoge pijnscore", severity: "warning" });
  }
  if (intake.romDegrees !== null && intake.romDegrees < 90) {
    points.push({ label: "Beperkte mobiliteit (ROM)", severity: "warning" });
  }
  if (intake.swelling === "significant") {
    points.push({ label: "Zwelling aanwezig", severity: "warning" });
  } else if (intake.swelling === "mild") {
    points.push({ label: "Lichte zwelling", severity: "info" });
  }
  if (/meniscus/i.test(intake.additionalProcedures)) {
    points.push({ label: "Meniscusherstel vereist voorzichtig opbouw", severity: "warning" });
  }
  if (intake.mobilityAid === "two_crutches" || intake.mobilityAid === "walker" || intake.mobilityAid === "wheelchair") {
    points.push({ label: "Gebruikt nog hulpmiddel bij lopen", severity: "info" });
  }
  if (intake.mobilityAid === "brace") {
    points.push({ label: "Draagt een brace", severity: "info" });
  }
  if (intake.weightBearingStatus === "non_weight_bearing") {
    points.push({ label: "Nog niet belasten toegestaan", severity: "warning" });
  } else if (intake.weightBearingStatus === "partial") {
    points.push({ label: "Deels belasten toegestaan", severity: "info" });
  }
  if (weeksPostOp !== null && weeksPostOp < 2) {
    points.push({ label: "Vroege postoperatieve fase — voorzichtig opbouwen", severity: "warning" });
  }
  if (intake.visitReason === "chronic_complaint" || intake.symptomOnset === "gt_3_months") {
    points.push({ label: "Langdurige klacht (chronisch)", severity: "info" });
  }
  if (intake.dailyImpact === "severe") {
    points.push({ label: "Ernstige beperking dagelijks functioneren", severity: "warning" });
  }
  if (intake.previousTreatmentText.trim()) {
    points.push({ label: "Eerder al behandeld voor deze klacht", severity: "info" });
  }

  return points.slice(0, 6);
}

// ─── Builder: Hersteldoelen ─────────────────────────────────────────────────

function buildSuggestedGoals(input: IntakeAnalysisInput, weeksPostOp: number | null): SuggestedGoal[] {
  const { intake } = input;
  const goals: SuggestedGoal[] = [];
  const targetDate = intake.goalTimeframeMonths
    ? new Date(Date.now() + intake.goalTimeframeMonths * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : "";

  if (intake.mobilityAid && intake.mobilityAid !== "none") {
    goals.push({ icon: "🚶", title: "Volledig lopen zonder hulpmiddelen", description: "Loop weer zelfstandig, zonder krukken of ander hulpmiddel.", targetDate: "" });
  }
  if (intake.romDegrees !== null) {
    const target = Math.max(intake.romDegrees + 30, 120);
    goals.push({ icon: "🦵", title: `Mobiliteit vergroten naar minimaal ${target}°`, description: "Werk stap voor stap aan meer buigruimte in het gewricht.", targetDate: "" });
  }
  if (intake.painScoreNow !== null && intake.painScoreNow > 2) {
    goals.push({ icon: "✨", title: "Pijn verminderen tot minder dan 2/10", description: "Een geleidelijke afname van pijn tijdens dagelijkse activiteiten.", targetDate: "" });
  }
  if (intake.dailyImpact === "moderate" || intake.dailyImpact === "severe") {
    goals.push({ icon: "🎯", title: "Dagelijkse activiteiten weer zonder beperking", description: "Terug naar je normale dagritme, zonder dat de klacht in de weg zit.", targetDate: "" });
  }
  if (intake.returnToWorkGoal) {
    goals.push({ icon: "🎯", title: "Terugkeer naar werk", description: "Weer volledig kunnen functioneren op het werk.", targetDate });
  }
  if (intake.returnToSportGoal) {
    goals.push({
      icon: "🏆",
      title: intake.sportType.trim() ? `Terugkeer naar ${intake.sportType.trim()}` : "Terugkeer naar sport",
      description: "Veilig en verantwoord weer sporten op het gewenste niveau.",
      targetDate,
    });
  }
  if (weeksPostOp !== null && weeksPostOp < 4 && goals.length === 0) {
    goals.push({ icon: "💪", title: "Veilig herstellen in de eerste weken", description: "Focus op een rustige, veilige start van het herstel.", targetDate: "" });
  }

  return goals;
}

// ─── Builder: Herstelplan-aanbeveling ───────────────────────────────────────

function buildProtocolRecommendation(
  input: IntakeAnalysisInput,
  weeksPostOp: number | null
): { recommendation: ProtocolRecommendation | null; alternatives: ProtocolRecommendation[] } {
  const category = INJURY_TYPE_TO_CATEGORY[input.injuryType];
  if (!category) return { recommendation: null, alternatives: [] };

  const { intake } = input;
  // Bij rug-/nekklachten met uitstraling past het radiculaire protocol beter
  // dan het aspecifieke (en andersom) — beide bestaan naast elkaar binnen
  // dezelfde categorie (zie migratie 095), dus zonder deze voorkeur zou de
  // aanbeveling willekeurig tussen de twee kiezen.
  const radicularPattern = /uitstraling|radiculair/i;
  const matches = input.availableProtocols
    .filter((p) => !p.archived && p.injuryCategory === category)
    .sort((a, b) => {
      if (a.scope !== b.scope) return a.scope === "organization" ? -1 : 1;
      if (category === "low_back_pain") {
        const aRadicular = radicularPattern.test(a.name) || radicularPattern.test(a.description ?? "");
        const bRadicular = radicularPattern.test(b.name) || radicularPattern.test(b.description ?? "");
        if (aRadicular !== bRadicular) {
          return (aRadicular === intake.radiatingPain) ? -1 : 1;
        }
      }
      return 0;
    });

  if (matches.length === 0) return { recommendation: null, alternatives: [] };
  const reasonParts: string[] = [];
  if (weeksPostOp !== null) reasonParts.push(`${weeksPostOp} ${weeksPostOp === 1 ? "week" : "weken"} postoperatief`);
  if (intake.mobilityAid && intake.mobilityAid !== "none") reasonParts.push("nog gebruikmaakt van een hulpmiddel");
  if (intake.romDegrees !== null && intake.romDegrees < 90) reasonParts.push("momenteel een beperkte mobiliteit heeft");
  const reasoning = reasonParts.length > 0
    ? `Dit protocol sluit aan op een patiënt die ${reasonParts.join(", ")}.`
    : `Dit protocol sluit aan bij de categorie "${INJURY_CATEGORY_LABELS[category] ?? category}".`;

  const scored: ProtocolRecommendation[] = matches.map((protocol, i) => {
    let stars = 3;
    if (protocol.scope === "organization") stars += 1;
    if (protocol.clinicallyReviewed) stars += 1;
    return {
      protocol,
      stars: Math.min(5, stars) as ProtocolRecommendation["stars"],
      reasoning: i === 0 ? reasoning : `Alternatief binnen dezelfde categorie: "${INJURY_CATEGORY_LABELS[category] ?? category}".`,
    };
  });

  return { recommendation: scored[0], alternatives: scored.slice(1, 3) };
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export function generateIntakeAnalysis(input: IntakeAnalysisInput): IntakeAnalysis {
  const now = input.now ?? new Date();
  const weeksPostOp = weeksSince(input.surgeryDate, now);

  const { recommendation, alternatives } = buildProtocolRecommendation(input, weeksPostOp);

  return {
    summary: buildSummary(input, weeksPostOp),
    attentionPoints: buildAttentionPoints(input, weeksPostOp),
    suggestedGoals: buildSuggestedGoals(input, weeksPostOp),
    recommendation,
    alternatives,
  };
}
