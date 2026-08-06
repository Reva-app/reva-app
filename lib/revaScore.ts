// ─── REVA Score Engine ──────────────────────────────────────────────────────
// Regel-gebaseerde, samengestelde 1-10 score over de laatste 14 dagen.
// Kijkt bewust breder dan alleen de dagscore: check-in gedrag, trainingen,
// medicatie-bijhouden, afspraken-terugkoppeling en doelstellingen tellen
// allemaal mee. Net als de eerdere Herstelscore die dit vervangt: geen
// klinisch oordeel, alleen zelfgerapporteerde/gedragsmatige signalen. Een
// factor die niet op de patiënt van toepassing is (bv. geen medicatie-
// historie, geen fysio-afspraken deze periode) telt niet negatief mee, hij
// wordt gewoon weggelaten uit het gemiddelde.

import type { CheckIn, MedicatieLog, Appointment, Doel } from "./data";
import type { PatientProtocolPhaseView } from "./services/patientProtocolService";
import { average } from "./insights";

const PERIOD_DAYS = 14;
const MIN_CHECKINS = 3;

export type RevaScoreTier = "op_schema" | "aandacht" | "extra_aandacht" | "onbekend";

export interface RevaScoreFactor {
  label: string;
  ratio: number; // 0-1
  detail: string;
}

export interface RevaScoreResult {
  tier: RevaScoreTier;
  score: number | null; // 1-10, één decimaal
  label: string;
  explanation: string;
  factors: RevaScoreFactor[];
}

export interface RevaScoreInput {
  checkIns: CheckIn[];
  medicatie: MedicatieLog[];
  appointments: Appointment[];
  doelen: Doel[];
  now: Date;
  hasActiveProtocol: boolean;
  protocolPhase: PatientProtocolPhaseView | null;
}

const TIER_LABELS: Record<RevaScoreTier, string> = {
  op_schema: "Op schema",
  aandacht: "Aandacht waard",
  extra_aandacht: "Extra aandacht nodig",
  onbekend: "Nog te weinig data",
};

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generateRevaScore(input: RevaScoreInput): RevaScoreResult {
  const periodStart = new Date(input.now);
  periodStart.setDate(periodStart.getDate() - (PERIOD_DAYS - 1));
  const periodStartStr = dateStr(periodStart);
  const todayStr = dateStr(input.now);

  const periodCheckIns = input.checkIns.filter((c) => c.date >= periodStartStr);

  if (periodCheckIns.length < MIN_CHECKINS) {
    return {
      tier: "onbekend",
      score: null,
      label: TIER_LABELS.onbekend,
      explanation: "Vul de komende dagen een paar check-ins in, dan berekenen we je REVA Score op basis van je eigen voortgang.",
      factors: [],
    };
  }

  const factors: RevaScoreFactor[] = [];

  // 1. Check-in score
  const avgDagscore = average(periodCheckIns.map((c) => c.dagscore));
  if (avgDagscore !== null) {
    factors.push({ label: "Check-in score", ratio: (avgDagscore - 1) / 4, detail: `Gem. dagscore ${avgDagscore.toFixed(1)}/5` });
  }

  // 2. Check-in consistentie
  factors.push({
    label: "Check-in consistentie",
    ratio: Math.min(1, periodCheckIns.length / PERIOD_DAYS),
    detail: `${periodCheckIns.length} van de ${PERIOD_DAYS} dagen ingevuld`,
  });

  // 3. Trainingen afgerond — protocol-schema's of zelfgerapporteerde trainingGedaan-vlag
  if (input.hasActiveProtocol && input.protocolPhase && input.protocolPhase.schedules.length > 0) {
    const prescribed = input.protocolPhase.schedules.reduce((s, sc) => s + sc.frequencyPerWeek, 0);
    const completed = input.protocolPhase.schedules.reduce((s, sc) => s + sc.completedThisWeek, 0);
    if (prescribed > 0) {
      factors.push({
        label: "Trainingen afgerond",
        ratio: Math.min(1, completed / prescribed),
        detail: `${completed} van de ${prescribed} trainingen deze week`,
      });
    }
  } else {
    const withTraining = periodCheckIns.filter((c) => c.trainingGedaan).length;
    factors.push({
      label: "Trainingen afgerond",
      ratio: withTraining / periodCheckIns.length,
      detail: `${withTraining} van de ${periodCheckIns.length} check-ins met training`,
    });
  }

  // 4. Medicatie bijgehouden — alleen relevant als de patiënt sowieso medicatie logt
  if (input.medicatie.length > 0) {
    const daysWithMed = new Set(input.medicatie.filter((m) => m.date >= periodStartStr).map((m) => m.date)).size;
    factors.push({
      label: "Medicatie bijgehouden",
      ratio: Math.min(1, daysWithMed / PERIOD_DAYS),
      detail: `${daysWithMed} van de ${PERIOD_DAYS} dagen gelogd`,
    });
  }

  // 5. Afspraken bij de fysio — mate van terugkoppeling (uitkomst ingevuld) op fysio-afspraken deze periode
  const periodFysioApts = input.appointments.filter((a) => a.type === "fysio" && a.date >= periodStartStr && a.date <= todayStr);
  if (periodFysioApts.length > 0) {
    const withOutcome = periodFysioApts.filter((a) => a.uitkomst && a.uitkomst.trim().length > 0).length;
    factors.push({
      label: "Afspraken bij de fysio",
      ratio: withOutcome / periodFysioApts.length,
      detail: `${withOutcome} van de ${periodFysioApts.length} afspraken teruggekoppeld`,
    });
  }

  // 6. Doelstellingen
  if (input.hasActiveProtocol && input.protocolPhase) {
    const total = input.protocolPhase.milestones.length;
    if (total > 0) {
      const completed = input.protocolPhase.milestones.filter((m) => m.completed).length;
      factors.push({ label: "Doelstellingen", ratio: completed / total, detail: `${completed} van de ${total} mijlpalen deze fase` });
    }
  } else {
    const regularGoals = input.doelen.filter((d) => d.type === "regular");
    if (regularGoals.length > 0) {
      const completed = regularGoals.filter((d) => d.completed).length;
      factors.push({ label: "Doelstellingen", ratio: completed / regularGoals.length, detail: `${completed} van de ${regularGoals.length} doelen behaald` });
    }
  }

  const avgRatio = factors.reduce((s, f) => s + f.ratio, 0) / factors.length;
  const score = Math.max(1, Math.min(10, Math.round(avgRatio * 100) / 10));

  const tier: RevaScoreTier = score >= 7 ? "op_schema" : score >= 4.5 ? "aandacht" : "extra_aandacht";

  const explanation =
    tier === "op_schema"
      ? "Je scoort sterk op de meeste onderdelen van je herstel. Ga zo door."
      : tier === "aandacht"
      ? "Op een aantal vlakken gaat het goed, maar er is ook ruimte voor aandacht. Bekijk hieronder waar."
      : "Verschillende onderdelen wijzen erop dat deze periode zwaarder is. Neem gerust contact op met je behandelaar als dit aanhoudt.";

  return { tier, score, label: TIER_LABELS[tier], explanation, factors };
}
