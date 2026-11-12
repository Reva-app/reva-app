/**
 * REVA-voorstellen voor het herstelplan: dosering per oefening en het
 * moment voor de volgende fase. Regelgebaseerd op de gelogde trainingen
 * (sets, herhalingen, gewicht, duur, pijn per oefening) en de check-ins.
 *
 * Een voorstel kan een kant-en-klare wijziging bevatten (`apply`), die de
 * fysio met één klik toepast — of eerst aanpast. REVA wijzigt zelf niets.
 */
import type { PortalCheckinTrendPoint } from "@/lib/services/portalService";
import type {
  PortalPatientProtocolPhase, PortalPatientProtocolScheduleExercise, PortalPatientScheduleExerciseInput,
  PortalTrainingExerciseLog, PortalTrainingSessionLog,
} from "@/lib/services/protocolService";
import type { InsightTone } from "@/lib/insights/patientInsights";

export interface PlanSuggestion {
  id: string;
  tone: InsightTone;
  title: string;
  reason: string;
  /** Oefening waar het voorstel over gaat (voor "Aanpassen"). */
  exercise?: PortalPatientProtocolScheduleExercise;
  /** Concrete wijziging: van → naar, toe te passen met één klik. */
  apply?: { label: string; input: PortalPatientScheduleExerciseInput };
  /** Voorstel om de fase af te ronden en de volgende te starten. */
  advancePhase?: boolean;
  /** Meerdere oefeningen tegelijk opbouwen (samengevoegd voorstel). */
  applyMany?: { exercise: PortalPatientProtocolScheduleExercise; label: string; input: PortalPatientScheduleExerciseInput }[];
}

const DAY = 86_400_000;
const toTime = (d: string) => new Date(`${d}T12:00:00`).getTime();
const daysBetween = (a: string, b: string) => Math.round((toTime(b) - toTime(a)) / DAY);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const fmt = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

function parseKg(text: string | null): number | null {
  const m = text?.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function baseInput(e: PortalPatientProtocolScheduleExercise): PortalPatientScheduleExerciseInput {
  return {
    prescribedSets: e.prescribedSets,
    prescribedReps: e.prescribedReps,
    prescribedDurationSeconds: e.prescribedDurationSeconds,
    prescribedLoadText: e.prescribedLoadText ?? "",
    prescriptionNote: e.prescriptionNote ?? "",
  };
}

function doseLabel(sets: number | null, reps: number | null, seconds: number | null): string {
  const s = sets ?? 1;
  if (seconds) return `${s}× ${seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} sec`}`;
  return reps ? `${s}×${reps}` : `${s} sets`;
}

/** Zwaarder: gewicht +~10%, duur +~20%, anders +2 herhalingen of een extra set. */
function progression(e: PortalPatientProtocolScheduleExercise, usedKg: number | null): { label: string; input: PortalPatientScheduleExerciseInput } | null {
  const input = baseInput(e);
  const kg = usedKg ?? parseKg(e.prescribedLoadText);
  if (kg && kg > 0) {
    const next = Math.round((kg + Math.max(1, kg * 0.1)) * 2) / 2;
    input.prescribedLoadText = `${fmt(next)} kg`;
    return { label: `${fmt(kg)} kg → ${fmt(next)} kg`, input };
  }
  if (e.prescribedDurationSeconds) {
    const next = Math.round((e.prescribedDurationSeconds * 1.2) / 5) * 5;
    const bumped = Math.max(next, e.prescribedDurationSeconds + 10);
    input.prescribedDurationSeconds = bumped;
    return { label: `${doseLabel(e.prescribedSets, null, e.prescribedDurationSeconds)} → ${doseLabel(e.prescribedSets, null, bumped)}`, input };
  }
  if (e.prescribedReps && e.prescribedReps < 15) {
    input.prescribedReps = e.prescribedReps + 2;
    return { label: `${doseLabel(e.prescribedSets, e.prescribedReps, null)} → ${doseLabel(e.prescribedSets, input.prescribedReps, null)}`, input };
  }
  if ((e.prescribedSets ?? 1) < 4) {
    input.prescribedSets = (e.prescribedSets ?? 1) + 1;
    return { label: `${doseLabel(e.prescribedSets, e.prescribedReps, null)} → ${doseLabel(input.prescribedSets, e.prescribedReps, null)}`, input };
  }
  return null;
}

/** Lichter: minder herhalingen, kortere duur of een set minder. */
function regression(e: PortalPatientProtocolScheduleExercise, toSets?: number): { label: string; input: PortalPatientScheduleExerciseInput } | null {
  const input = baseInput(e);
  const sets = e.prescribedSets ?? 1;
  if (toSets && toSets < sets) {
    input.prescribedSets = Math.max(1, toSets);
  } else if (e.prescribedDurationSeconds && e.prescribedDurationSeconds > 15) {
    input.prescribedDurationSeconds = Math.max(10, Math.round((e.prescribedDurationSeconds * 0.75) / 5) * 5);
  } else if (e.prescribedReps && e.prescribedReps > 6) {
    input.prescribedReps = Math.max(5, e.prescribedReps - 3);
  } else if (sets > 1) {
    input.prescribedSets = sets - 1;
  } else {
    return null;
  }
  const from = doseLabel(e.prescribedSets, e.prescribedReps, e.prescribedDurationSeconds);
  const to = doseLabel(input.prescribedSets, input.prescribedReps, input.prescribedDurationSeconds);
  return from === to ? null : { label: `${from} → ${to}`, input };
}

export function buildPlanSuggestions({ phase, hasNextPhase, sessions, exerciseLogs, checkins, today }: {
  phase: PortalPatientProtocolPhase;
  hasNextPhase: boolean;
  sessions: PortalTrainingSessionLog[];
  exerciseLogs: PortalTrainingExerciseLog[];
  checkins: PortalCheckinTrendPoint[];
  today: string;
}): PlanSuggestion[] {
  const out: PlanSuggestion[] = [];

  // ── Fase ───────────────────────────────────────────────────────────────────
  const recentPain = checkins.filter((c) => daysBetween(c.date, today) < 7 && c.painScore !== null).map((c) => c.painScore!);
  const painAvg = avg(recentPain);
  const target14 = phase.schedules.reduce((s, x) => s + Math.min(x.frequencyPerWeek, 14), 0) * 2;
  const done14 = sessions.filter((s) => daysBetween(s.date, today) < 14 && phase.schedules.some((x) => x.id === s.scheduleId)).length;
  const daysInPhase = phase.startedAt ? daysBetween(phase.startedAt.slice(0, 10), today) : null;

  if (hasNextPhase && phase.criteria.length > 0 && phase.criteria.every((c) => c.met)) {
    out.push({
      id: `fase-klaar:${phase.id}`, tone: "positive",
      title: "Klaar voor de volgende fase",
      reason: `Alle ${phase.criteria.length} doelen van deze fase zijn afgevinkt${painAvg !== null ? ` en de pijn is deze week gemiddeld ${fmt(painAvg)}` : ""}.`,
      advancePhase: true,
    });
  } else if (hasNextPhase && daysInPhase !== null && daysInPhase >= 21 && painAvg !== null && recentPain.length >= 3 && painAvg <= 3
    && target14 > 0 && done14 >= target14 * 0.7) {
    const open = phase.criteria.filter((c) => !c.met).length;
    out.push({
      id: `fase-check:${phase.id}`, tone: "info",
      title: "Doelen van deze fase nalopen?",
      reason: `Al ${Math.round(daysInPhase / 7)} weken in deze fase, pijn laag (gem. ${fmt(painAvg)}) en ${done14} van ${target14} trainingen in 2 weken gedaan.${open > 0 ? ` Nog ${open} ${open === 1 ? "doel" : "doelen"} open: misschien zijn die al gehaald.` : ""}`,
    });
  }

  // ── Oefeningen ─────────────────────────────────────────────────────────────
  const recentSessions = sessions.filter((s) => daysBetween(s.date, today) < 28);
  for (const schedule of phase.schedules) {
    const scheduleSessions = recentSessions
      .filter((s) => s.scheduleId === schedule.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);
    if (scheduleSessions.length < 2) continue;
    const sessionIds = new Set(scheduleSessions.map((s) => s.id));

    for (const e of schedule.exercises) {
      const logs = exerciseLogs
        .filter((l) => l.scheduleExerciseId === e.id && sessionIds.has(l.sessionLogId))
        .sort((a, b) => b.date.localeCompare(a.date));
      const missed = scheduleSessions.length - logs.length;
      const pains = logs.map((l) => l.painScore).filter((x): x is number => x !== null);
      const painAvgEx = avg(pains);

      // Vaak overgeslagen
      if (scheduleSessions.length >= 3 && missed >= Math.ceil(scheduleSessions.length / 2)) {
        out.push({
          id: `skip:${e.id}:${scheduleSessions[0].id}`, tone: "attention", exercise: e,
          title: `${e.title}: vaak overgeslagen`,
          reason: `In ${missed} van de laatste ${scheduleSessions.length} trainingen niet gedaan. Te lastig, onduidelijk of pijnlijk? Overweeg uitleg, een video of een alternatief.`,
        });
        continue;
      }

      // Doet pijn
      if (pains.length >= 2 && painAvgEx !== null && painAvgEx >= 6) {
        out.push({
          id: `pijn:${e.id}:${logs[0].sessionLogId}`, tone: "attention", exercise: e,
          title: `${e.title}: pijnlijk`,
          reason: `Pijn bij deze oefening gemiddeld ${fmt(painAvgEx)} van 10 over ${pains.length} trainingen. Lichter maken of vervangen?`,
          apply: regression(e) ?? undefined,
        });
        continue;
      }

      const last3 = logs.slice(0, 3);
      const consecutive = last3.length === 3 && scheduleSessions.slice(0, 3).every((s) => last3.some((l) => l.sessionLogId === s.id));
      if (!consecutive) continue;
      const presSets = e.prescribedSets ?? 1;

      // Haalt de sets niet
      const setsDone = last3.map((l) => l.sets ?? 0);
      if (e.prescribedSets && setsDone.every((s) => s < presSets)) {
        const avgSets = Math.round(avg(setsDone)!);
        out.push({
          id: `sets:${e.id}:${last3[0].sessionLogId}`, tone: "attention", exercise: e,
          title: `${e.title}: haalt de sets niet`,
          reason: `De laatste 3 trainingen gemiddeld ${fmt(avg(setsDone)!)} van de ${presSets} sets gedaan.`,
          apply: regression(e, avgSets) ?? undefined,
        });
        continue;
      }

      // Klaar voor opbouw
      const allSets = setsDone.every((s) => s >= presSets);
      const allReps = !e.prescribedReps || last3.every((l) => (l.reps ?? 0) >= e.prescribedReps!);
      const allTime = !e.prescribedDurationSeconds || last3.every((l) => (l.durationSeconds ?? 0) >= e.prescribedDurationSeconds!);
      const lowPain = painAvgEx === null || painAvgEx <= 3;
      if (allSets && allReps && allTime && lowPain) {
        const usedKg = Math.max(0, ...last3.map((l) => l.weightKg ?? 0)) || null;
        const step = progression(e, usedKg);
        if (step) {
          out.push({
            id: `opbouw:${e.id}:${last3[0].sessionLogId}`, tone: "positive", exercise: e,
            title: `${e.title}: klaar voor opbouw`,
            reason: `De laatste 3 trainingen alles gehaald${pains.length ? ` met weinig pijn (gem. ${fmt(painAvgEx!)})` : ""}.`,
            apply: step,
          });
        }
      }
    }
  }

  // Veel oefeningen tegelijk in dezelfde situatie: één samengevoegd voorstel.
  function merge(prefix: string, make: (n: number) => { title: string; reason: string; tone: InsightTone }) {
    const group = out.filter((x) => x.id.startsWith(prefix) && x.apply && x.exercise);
    if (group.length < 3) return;
    const rest = out.filter((x) => !group.includes(x));
    const m = make(group.length);
    rest.push({
      id: `${prefix}alles:${group.map((x) => x.id).join("|")}`, tone: m.tone, title: m.title, reason: m.reason,
      applyMany: group.map((x) => ({ exercise: x.exercise!, label: x.apply!.label, input: x.apply!.input })),
    });
    out.length = 0;
    out.push(...rest);
  }
  merge("opbouw:", (n) => ({ tone: "positive", title: `${n} oefeningen klaar voor opbouw`, reason: "De laatste 3 trainingen telkens alles gehaald, met weinig pijn. Voorstel per oefening:" }));
  merge("pijn:", (n) => ({ tone: "attention", title: `Training als geheel pijnlijk (${n} oefeningen)`, reason: "Bij meerdere oefeningen wordt hoge pijn gemeld. Overweeg de hele training lichter te maken. Voorstel per oefening:" }));

  const order: Record<InsightTone, number> = { attention: 0, positive: 1, info: 2 };
  return out.sort((a, b) => (a.advancePhase ? -1 : b.advancePhase ? 1 : order[a.tone] - order[b.tone])).slice(0, 5);
}
