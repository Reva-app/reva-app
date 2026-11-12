/**
 * REVA-inzicht voor de fysio: een korte voortgangssamenvatting en concrete
 * voorstellen, afgeleid uit check-ins, het herstelplan en de trainingen.
 *
 * Bewust een vast contract (PatientInsights): vandaag regelgebaseerd en
 * zonder externe AI-dienst (geen kosten, geen patiëntdata naar buiten),
 * later per onderdeel te verrijken via de AI Gateway (masterplan §11)
 * zonder dat de UI verandert. Zelfde patroon als lib/coach.ts.
 *
 * Uitgangspunt: REVA beslist niets, het doet voorstellen. De fysio kiest.
 */
import type { PortalCheckinTrendPoint } from "@/lib/services/portalService";
import type { PortalPatientProtocolAssignment, PortalPatientSessionNote } from "@/lib/services/protocolService";

export type InsightTone = "attention" | "positive" | "info";
export type InsightTarget = "herstelplan" | "logboek" | "contact";

export interface InsightSuggestion {
  /** Stabiel per situatie en week, zodat "Negeren" alleen deze week geldt. */
  id: string;
  tone: InsightTone;
  title: string;
  /** Waarom dit voorstel: de cijfers erachter. */
  reason: string;
  action?: { label: string; target: InsightTarget };
}

export interface PatientInsights {
  /** 1–4 korte zinnen: hoe gaat het. */
  summary: string[];
  suggestions: InsightSuggestion[];
  /** Te weinig gegevens voor een zinnige samenvatting. */
  sparse: boolean;
}

export interface PatientInsightInput {
  firstName: string;
  /** Check-ins, in willekeurige volgorde. */
  checkins: PortalCheckinTrendPoint[];
  assignment: PortalPatientProtocolAssignment | null;
  sessionNotes: PortalPatientSessionNote[];
  /** YYYY-MM-DD, lokale datum. */
  today: string;
}

const DAY = 86_400_000;
const toTime = (d: string) => new Date(`${d}T12:00:00`).getTime();
const daysBetween = (a: string, b: string) => Math.round((toTime(b) - toTime(a)) / DAY);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const fmt = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

/** Maandag van de week van `today`, als sleutel voor wekelijkse voorstellen. */
function weekKey(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Woorden in een trainingsnotitie die de fysio waarschijnlijk wil lezen. */
const CONCERN_WORDS = ["pijn", "zeer", "zwaar", "lastig", "moeilijk", "dik", "zwelling", "opgezet", "niet gelukt", "gestopt", "slecht", "eng", "bang"];

export function buildPatientInsights({ firstName, checkins, assignment, sessionNotes, today }: PatientInsightInput): PatientInsights {
  const name = firstName || "De patiënt";
  const wk = weekKey(today);
  const summary: string[] = [];
  const suggestions: InsightSuggestion[] = [];

  const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date));
  const inWindow = (from: number, to: number) => sorted.filter((c) => {
    const age = daysBetween(c.date, today);
    return age >= from && age < to;
  });
  const last7 = inWindow(0, 7);
  const prev7 = inWindow(7, 14);
  const last14 = inWindow(0, 14);
  const lastCheckin = sorted[sorted.length - 1] ?? null;
  const daysSinceCheckin = lastCheckin ? daysBetween(lastCheckin.date, today) : null;

  // ── Check-in-ritme ─────────────────────────────────────────────────────────
  if (last14.length > 0) {
    const rhythm = last14.length >= 10 ? "trouw" : last14.length >= 5 ? "regelmatig" : "af en toe";
    summary.push(`${name} vulde de afgelopen 2 weken ${last14.length} check-ins in (${rhythm}).`);
  }
  if (daysSinceCheckin === null) {
    suggestions.push({
      id: `geen-checkins:${wk}`, tone: "attention",
      title: "Nog geen check-ins",
      reason: `${name} heeft nog geen check-in ingevuld. Zonder check-ins zie je het verloop niet.`,
      action: { label: "Contact opnemen", target: "contact" },
    });
  } else if (daysSinceCheckin >= 7) {
    suggestions.push({
      id: `stil:${wk}`, tone: "attention",
      title: "Even contact opnemen",
      reason: `Al ${daysSinceCheckin} dagen geen check-in. Vaak helpt een kort berichtje of belletje om weer op gang te komen.`,
      action: { label: "Contact opnemen", target: "contact" },
    });
  }

  // ── Pijn ───────────────────────────────────────────────────────────────────
  const painNow = avg(last7.map((c) => c.painScore).filter((x): x is number => x !== null));
  const painBefore = avg(prev7.map((c) => c.painScore).filter((x): x is number => x !== null));
  const painPoints = last7.filter((c) => c.painScore !== null).length;
  let painRising = false;
  let painFalling = false;
  if (painNow !== null && painBefore !== null && painPoints >= 3) {
    const diff = painNow - painBefore;
    if (diff >= 1) {
      painRising = true;
      summary.push(`De pijn is gestegen: gemiddeld ${fmt(painBefore)} → ${fmt(painNow)} (vorige week → deze week).`);
    } else if (diff <= -1) {
      painFalling = true;
      summary.push(`De pijn daalt: gemiddeld ${fmt(painBefore)} → ${fmt(painNow)} (vorige week → deze week).`);
    } else {
      summary.push(`De pijn is stabiel rond ${fmt(painNow)} van 10.`);
    }
  } else if (painNow !== null) {
    summary.push(`Pijn deze week gemiddeld ${fmt(painNow)} van 10.`);
  }
  // Drie check-ins op rij stijgend
  const recentPain = sorted.slice(-3).map((c) => c.painScore);
  const threeRising = recentPain.length === 3 && recentPain.every((x) => x !== null)
    && recentPain[0]! < recentPain[1]! && recentPain[1]! < recentPain[2]!;
  const highPain = painNow !== null && painNow >= 6;
  if (painRising || threeRising || highPain) {
    suggestions.push({
      id: `pijn:${wk}`, tone: "attention",
      title: "Belasting bespreken of verlagen",
      reason: threeRising
        ? `Pijn steeg drie check-ins op rij (${recentPain.join(" → ")}).`
        : highPain
          ? `Pijn is deze week gemiddeld ${fmt(painNow!)} van 10.`
          : `Pijn steeg van ${fmt(painBefore!)} naar ${fmt(painNow!)} gemiddeld.`,
      action: { label: "Schema bekijken", target: "herstelplan" },
    });
  }

  // ── Zwelling ───────────────────────────────────────────────────────────────
  const swellingDays = last7.filter((c) => c.swelling).length;
  if (swellingDays >= 2) {
    summary.push(`Zwelling gemeld op ${swellingDays} van de laatste 7 dagen.`);
    suggestions.push({
      id: `zwelling:${wk}`, tone: "attention",
      title: "Zwelling navragen",
      reason: `${swellingDays}× zwelling gemeld deze week. Mogelijk past de belasting nog niet.`,
      action: { label: "Contact opnemen", target: "contact" },
    });
  }

  // ── Dagscore ───────────────────────────────────────────────────────────────
  const dayNow = avg(last7.map((c) => c.dayScore));
  const dayBefore = avg(prev7.map((c) => c.dayScore));
  if (dayNow !== null && dayBefore !== null && last7.length >= 3 && dayNow - dayBefore <= -1) {
    summary.push(`De dagscore zakte van ${fmt(dayBefore)} naar ${fmt(dayNow)} van 5.`);
    if (!suggestions.some((s) => s.tone === "attention")) {
      suggestions.push({
        id: `dagscore:${wk}`, tone: "attention",
        title: "Kort inchecken",
        reason: `De dagscore daalde deze week (${fmt(dayBefore)} → ${fmt(dayNow)}). Een kort gesprek kan helpen.`,
        action: { label: "Contact opnemen", target: "contact" },
      });
    }
  }

  // ── Herstelplan en trainingen ──────────────────────────────────────────────
  const phase = assignment?.phases.find((p) => p.status === "active") ?? null;
  if (!assignment) {
    suggestions.push({
      id: "geen-plan", tone: "info",
      title: "Herstelplan kiezen",
      reason: `${name} heeft nog geen herstelplan. Met een plan krijgt ${name} oefeningen en zie je hier de voortgang.`,
      action: { label: "Plan kiezen", target: "herstelplan" },
    });
  } else if (phase) {
    const target = phase.schedules.reduce((s, x) => s + Math.min(x.frequencyPerWeek, 14), 0);
    const done = phase.schedules.reduce((s, x) => s + x.completedThisWeek, 0);
    const dow = (new Date(`${today}T12:00:00`).getDay() + 6) % 7; // 0 = maandag
    const expected = target * ((dow + 1) / 7);
    if (target > 0) {
      summary.push(`Deze week ${done} van ${target} trainingen gedaan.`);
      if (dow >= 3 && done < expected * 0.5) {
        suggestions.push({
          id: `trouw:${wk}`, tone: "attention",
          title: "Trainingsschema haalbaar maken",
          reason: `${done} van de verwachte ${Math.round(expected)} trainingen tot nu toe deze week. Misschien is het schema te zwaar of te lang.`,
          action: { label: "Schema bekijken", target: "herstelplan" },
        });
      } else if (done >= target && painFalling) {
        suggestions.push({
          id: `opbouw:${wk}`, tone: "positive",
          title: "Klaar voor opbouw?",
          reason: `Alle ${target} trainingen gedaan en de pijn daalt. Overweeg de dosering op te bouwen (meer herhalingen, gewicht of duur).`,
          action: { label: "Schema bekijken", target: "herstelplan" },
        });
      }
    }
    const met = phase.criteria.filter((c) => c.met).length;
    if (phase.criteria.length > 0 && met === phase.criteria.length) {
      suggestions.push({
        id: `fase:${phase.id}`, tone: "positive",
        title: "Door naar de volgende fase?",
        reason: `Alle ${met} doelen van "${phase.name}" zijn afgevinkt.`,
        action: { label: "Naar herstelplan", target: "herstelplan" },
      });
    } else if (phase.criteria.length > 0 && met > 0) {
      summary.push(`${met} van ${phase.criteria.length} doelen voor de volgende fase behaald.`);
    }
  }

  // ── Notities van de patiënt (check-in en training) ─────────────────────────
  const notes = [
    ...sorted.filter((c) => c.note).map((c) => ({ id: `c:${c.date}`, date: c.date, text: c.note!, kind: "check-in" as const })),
    ...sessionNotes.map((n) => ({ id: `s:${n.id}`, date: n.date, text: n.reflection, kind: "training" as const })),
  ]
    .filter((n) => daysBetween(n.date, today) < 7)
    .sort((a, b) => b.date.localeCompare(a.date));
  const worrying = notes.find((n) => CONCERN_WORDS.some((w) => n.text.toLowerCase().includes(w)));
  if (worrying) {
    const quote = worrying.text.length > 110 ? `${worrying.text.slice(0, 107)}…` : worrying.text;
    suggestions.push({
      id: `notitie:${worrying.id}`, tone: "info",
      title: worrying.kind === "check-in" ? "Lees de notitie bij de check-in" : "Lees de notitie bij een training",
      reason: `"${quote}"`,
      action: worrying.kind === "training" ? { label: "Logboek openen", target: "logboek" } : undefined,
    });
  }

  // Volgorde: eerst aandacht, dan kansen, dan info; maximaal drie voorstellen.
  const order: Record<InsightTone, number> = { attention: 0, positive: 1, info: 2 };
  suggestions.sort((a, b) => order[a.tone] - order[b.tone]);

  return { summary: summary.slice(0, 4), suggestions: suggestions.slice(0, 3), sparse: last14.length === 0 && !phase };
}

/**
 * Eén korte voorgestelde actie per patiënt voor lijsten (dashboard "Mijn
 * patiënten"), op basis van de signalen die daar al bekend zijn.
 */
export function quickSuggestion(signals: { intakeSubmitted: boolean; reasons: string[] }): string | null {
  if (signals.intakeSubmitted) return "Herstelplan kiezen op basis van de intake";
  if (signals.reasons.includes("hoge_pijnscore")) return "Belasting bespreken of het schema verlichten";
  if (signals.reasons.includes("zwelling")) return "Zwelling navragen";
  if (signals.reasons.includes("lage_dagscore")) return "Kort inchecken hoe het gaat";
  if (signals.reasons.includes("inactief")) return "Even contact opnemen";
  return null;
}
