// ─── AI Coach Engine ──────────────────────────────────────────────────────────
// Rule-based coach engine. Pure functions — same input → same output.
// Designed to be replaced or augmented with a real AI backend later.
//
// To swap in a real AI:
//   1. Keep the same CoachInsights return type
//   2. Replace generateCoachInsights() with an async API call
//   3. Pass appState as the prompt context

import type {
  CheckIn,
  Appointment,
  DagboekWorkout,
  TrainingSchema,
  MedicatieLog,
  Mijlpaal,
  Doel,
  Profile,
  FotoUpdate,
} from "./data";
import type { PatientProtocolPhaseView } from "./services/patientProtocolService";
import { computeTrend, average, countLeadingStreak, dayOfYearIndex, type Trend } from "./insights";
import { getBodyRegion, type BodyRegion } from "./intakeAnalysis";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CoachMoodTag = "positief" | "stabiel" | "voorzichtig";

export interface WeeklySummary {
  avgScore:       number | null;
  trainingCount:  number;
  medCount:       number;
  completedMijl:  number;
  trend:          Trend;
  coachTekst:     string;
}

export interface CoachInsights {
  dailyInsight:   string;
  nextStep:       string;
  nextStepAction: string; // "modal:checkin" | "navigate:/dagboek" | etc.
  weekly:         WeeklySummary;
  /** Extra regel-gebaseerde observaties (streaks, correlaties, protocol-tips) — max 2, prioriteitsvolgorde. */
  insights:       string[];
  moodTag:        CoachMoodTag;
  disclaimerTekst: string;
}

export interface CoachInput {
  profile:        Profile;
  checkIns:       CheckIn[];
  appointments:   Appointment[];
  dagboekWorkouts: DagboekWorkout[];
  trainingSchemas: TrainingSchema[];
  medicatie:      MedicatieLog[];
  mijlpalen:      Mijlpaal[];
  doelen:         Doel[];
  fotoUpdates:    FotoUpdate[];
  dagsSindsBlessure: number;
  fase:           string;
  now:            Date;
  hasActiveProtocol: boolean;
  protocolPhase:  PatientProtocolPhaseView | null;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekDates(d: Date): string[] {
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return dateStr(x);
  });
}

function prevWeekDates(d: Date): string[] {
  const prev = new Date(d);
  prev.setDate(d.getDate() - 7);
  return weekDates(prev);
}

// ─── Daily insight generator ──────────────────────────────────────────────────

function buildDailyInsight(input: CoachInput, today: string, weekDays: string[]): string {
  const { checkIns, dagboekWorkouts, appointments, medicatie, mijlpalen, dagsSindsBlessure } = input;
  const now = input.now;

  const todayCheckIn   = checkIns.find(c => c.date === today);
  const weekCheckIns   = checkIns.filter(c => weekDays.includes(c.date));
  const weekScores     = weekCheckIns.map(c => c.dagscore);
  const weekAvg        = average(weekScores);
  const trend          = computeTrend(weekScores);
  const trainedThisWeek = input.hasActiveProtocol
    ? (input.protocolPhase?.schedules.reduce((s, sc) => s + sc.completedThisWeek, 0) ?? 0)
    : new Set(dagboekWorkouts.filter(w => weekDays.includes(w.date) && w.completed).map(w => w.date)).size;
  const todayWorkouts  = dagboekWorkouts.filter(w => w.date === today);
  const openToday      = todayWorkouts.filter(w => !w.completed);
  const behaaldVandaag = input.hasActiveProtocol
    ? (input.protocolPhase?.milestones.filter(m => m.completed && m.completedAt?.slice(0, 10) === today) ?? [])
    : mijlpalen.filter(m => m.completed && m.completedAt?.slice(0, 10) === today);
  const todayApts      = appointments.filter(a => a.date === today);

  // Milestone today — always lead with celebration
  if (behaaldVandaag.length > 0) {
    return `Je hebt vandaag een mijlpaal bereikt: "${behaaldVandaag[0]!.title}". Dat is een echte stap vooruit in je herstel.`;
  }

  // Good check-in today
  if (todayCheckIn) {
    if (todayCheckIn.dagscore >= 4 && trend === "stijgend") {
      return `Je check-in score van vandaag is ${todayCheckIn.dagscore}/5 en de trend is duidelijk stijgend. Je herstel zit in een goede flow.`;
    }
    if (todayCheckIn.dagscore >= 4) {
      return `Je check-in score van vandaag is ${todayCheckIn.dagscore}/5: dat is goed. Blijf dit ritme vasthouden.`;
    }
    if (todayCheckIn.dagscore <= 2) {
      return `Je score van vandaag is ${todayCheckIn.dagscore}/5. Dat zijn zware momenten. Rust nemen is ook onderdeel van herstel.`;
    }
    if (trend === "dalend" && todayCheckIn.dagscore === 3) {
      return `Je scores laten de afgelopen dagen een licht dalende lijn zien. Je lichaam geeft signalen: luister goed naar wat het nodig heeft.`;
    }
  }

  // No check-in yet
  if (!todayCheckIn) {
    if (now.getHours() >= 18) {
      return `Je hebt vandaag nog geen check-in ingevuld. Een check-in helpt je om goed zicht te houden op je herstel, ook op moeilijkere dagen.`;
    }
    return `Nog geen check-in vandaag. Door dit bij te houden krijg je steeds beter inzicht in hoe je herstel verloopt.`;
  }

  // Strong training week
  if (trainedThisWeek >= 4) {
    return `Je hebt deze week al ${trainedThisWeek} trainingen afgerond. Dat is een sterke week, goed bezig.`;
  }

  // Appointment today
  if (todayApts.length > 0) {
    return `Je hebt vandaag een afspraak: "${todayApts[0]!.title}". Een goed moment om bij te praten over je voortgang.`;
  }

  // Week average insight
  if (weekAvg !== null && weekAvg >= 4) {
    return `Je gemiddelde score deze week is ${weekAvg.toFixed(1)}/5. Een stabiele en goede week voor je herstel.`;
  }

  // Day count milestone
  if ([7, 14, 21, 30, 60, 90, 100].includes(dagsSindsBlessure)) {
    return `Vandaag ben je ${dagsSindsBlessure} dagen bezig met je herstel. Elke dag telt, ook de rustigere.`;
  }

  // Default
  if (trend === "stijgend") {
    return `Je herstel laat de afgelopen dagen een stijgende lijn zien. Ga zo door.`;
  }
  return `Je bent ${dagsSindsBlessure} dagen bezig met je herstel. Kleine stappen leiden tot grote vooruitgang.`;
}

// ─── Next step generator ─────────────────────────────────────────────────────

function buildNextStep(input: CoachInput, today: string, tomorrow: string): {
  nextStep: string;
  nextStepAction: string;
} {
  const { checkIns, dagboekWorkouts, appointments, mijlpalen } = input;
  const todayCheckIn  = checkIns.find(c => c.date === today);
  const openToday     = dagboekWorkouts.filter(w => w.date === today && !w.completed);
  const todayApts     = appointments.filter(a => a.date === today);
  const tomorrowApts  = appointments.filter(a => a.date === tomorrow);
  const nextMijlpaal  = input.hasActiveProtocol
    ? (input.protocolPhase?.milestones.find(m => !m.completed) ?? null)
    : ([...mijlpalen].filter(m => !m.completed).sort((a, b) => (a.fase ?? "").localeCompare(b.fase ?? ""))[0] ?? null);

  // Priority 1: open training today
  if (openToday.length > 0) {
    return { nextStep: "Je training van vandaag staat nog open", nextStepAction: "navigate:/dagboek" };
  }

  // Priority 1.5: protocolpatiënt loopt achter op wekelijks schema
  if (input.hasActiveProtocol && input.protocolPhase) {
    const behind = input.protocolPhase.schedules.find(s => s.completedThisWeek < s.frequencyPerWeek);
    if (behind) {
      return { nextStep: `Je trainingsschema "${behind.title}" wacht nog op je deze week`, nextStepAction: "navigate:/training" };
    }
  }

  // Priority 2: no check-in
  if (!todayCheckIn) {
    return { nextStep: "Vul je check-in van vandaag in", nextStepAction: "modal:checkin" };
  }

  // Priority 3: appointment today
  if (todayApts.length > 0) {
    return { nextStep: `Je hebt vandaag een afspraak: "${todayApts[0]!.title}"`, nextStepAction: "navigate:/dagboek" };
  }

  // Priority 4: appointment tomorrow
  if (tomorrowApts.length > 0) {
    return {
      nextStep: `Je hebt morgen een afspraak: kijk je voorbereiding nog even na`,
      nextStepAction: "navigate:/dagboek",
    };
  }

  // Priority 5: next milestone
  if (nextMijlpaal) {
    return {
      nextStep: `Je volgende mijlpaal: "${nextMijlpaal.title}"`,
      nextStepAction: "navigate:/doelstellingen",
    };
  }

  return { nextStep: "Blijf goed bijhouden hoe het met je gaat", nextStepAction: "modal:checkin" };
}

// ─── Weekly summary generator ─────────────────────────────────────────────────

function buildWeeklySummary(
  input: CoachInput,
  weekDays: string[],
  prevWeekDays: string[]
): WeeklySummary {
  const { checkIns, dagboekWorkouts, medicatie, mijlpalen } = input;

  const weekCheckIns  = checkIns.filter(c => weekDays.includes(c.date));
  const prevCheckIns  = checkIns.filter(c => prevWeekDays.includes(c.date));
  const weekScores    = weekCheckIns.map(c => c.dagscore);
  const prevScores    = prevCheckIns.map(c => c.dagscore);

  const weekAvg    = average(weekScores);
  const prevAvg    = average(prevScores);
  const trainingCount = input.hasActiveProtocol
    ? (input.protocolPhase?.schedules.reduce((s, sc) => s + sc.completedThisWeek, 0) ?? 0)
    : new Set(dagboekWorkouts.filter(w => weekDays.includes(w.date) && w.completed).map(w => w.date)).size;
  const medCount   = medicatie.filter(m => weekDays.includes(m.date)).length;
  const compMijl   = input.hasActiveProtocol
    ? (input.protocolPhase?.milestones.filter(m => m.completed && weekDays.includes(m.completedAt?.slice(0, 10) ?? "")).length ?? 0)
    : mijlpalen.filter(m => m.completed && weekDays.includes(m.completedAt?.slice(0, 10) ?? "")).length;

  const trend: Trend = weekAvg !== null && prevAvg !== null
    ? weekAvg > prevAvg + 0.2 ? "stijgend" : weekAvg < prevAvg - 0.2 ? "dalend" : "stabiel"
    : computeTrend(weekScores);

  let coachTekst = "";
  if (weekCheckIns.length === 0) {
    coachTekst = "Je hebt deze week nog geen check-ins ingevuld. Door dit bij te houden krijg je steeds beter inzicht.";
  } else if (trend === "stijgend" && trainingCount >= 3) {
    coachTekst = "Je zit in een mooie flow met training en structuur. Sterk herstelwerk deze week.";
  } else if (trend === "stijgend") {
    coachTekst = "Je herstel laat deze week een stijgende lijn zien. Goed bezig.";
  } else if (trend === "dalend" && (weekAvg ?? 0) <= 2.5) {
    coachTekst = "Deze week was zwaarder dan de vorige. Neem de tijd, luister naar je lichaam.";
  } else if (trend === "dalend") {
    coachTekst = "De scores deze week zijn iets lager. Misschien is wat extra rust goed voor je herstel.";
  } else if (trainingCount >= 4) {
    coachTekst = "Je hebt deze week consistent getraind. Dat is een sterk fundament voor je herstel.";
  } else if (compMijl > 0) {
    coachTekst = `Je hebt deze week ${compMijl} ${compMijl === 1 ? "mijlpaal" : "mijlpalen"} bereikt. Elke stap telt.`;
  } else {
    coachTekst = "Je herstel laat deze week stabiele voortgang zien. Blijf dit ritme vasthouden.";
  }

  return { avgScore: weekAvg, trainingCount, medCount, completedMijl: compMijl, trend, coachTekst };
}

// ─── Mood tag ─────────────────────────────────────────────────────────────────

function computeMoodTag(weekly: WeeklySummary, todayCheckIn: CheckIn | undefined): CoachMoodTag {
  const score = todayCheckIn?.dagscore ?? weekly.avgScore ?? null;
  if (score === null) return "stabiel";
  if (score >= 4 && (weekly.trend === "stijgend" || weekly.trend === "stabiel")) return "positief";
  if (score <= 2 || weekly.trend === "dalend") return "voorzichtig";
  return "stabiel";
}

// ─── Extra inzichten (streaks, correlaties, protocol-tips) ────────────────────
// Regel-gebaseerd, geen externe AI — zelfde uitgangspunt als de rest van dit
// bestand. Streak-logica is hetzelfde patroon als analyse/page.tsx's "Wat
// valt op"-sectie, hier hergebruikt via lib/insights.ts. Max 2 regels,
// prioriteitsvolgorde: streak > trainingscorrelatie > protocol-tip.

// Generieke, regio-bewuste tips voor patiënten zonder actief protocol (of
// zonder educatie-items in de huidige fase) — zij missen anders elke
// vorm van op hun blessure toegespitste duiding, terwijl protocolpatiënten
// die al krijgen via protocolPhase.educationItems hierboven. Bewust breed
// per BodyRegion (niet per exact blessuretype) en zonder medisch advies.
const BODY_REGION_TIPS: Record<BodyRegion, string[]> = {
  joint: [
    "Bij gewrichtsherstel is gecontroleerde bewegingsuitslag vaak belangrijker dan snelheid. Bouw rustig op.",
    "Lichte zwelling na training is normaal, aanhoudende of toenemende zwelling bespreek je met je zorgverlener.",
    "Wissel belasting af met voldoende rust, zodat het gewricht kan wennen aan de opbouw.",
  ],
  muscle: [
    "Spier- en peesweefsel heeft tijd nodig om kracht op te bouwen. Een geleidelijke opbouw voorkomt terugval.",
    "Goed opwarmen voor je oefeningen helpt spierweefsel zich voor te bereiden op belasting.",
    "Lichte spierspanning na training is normaal, scherpe pijn tijdens een oefening is een signaal om af te bouwen.",
  ],
  spine: [
    "Regelmatig van houding wisselen is vaak prettiger voor rug of nek dan lang stilzitten of -staan.",
    "Rustig in beweging blijven ondersteunt herstel van rug- of nekklachten meestal beter dan volledige rust.",
    "Let op je houding tijdens dagelijkse activiteiten, kleine aanpassingen kunnen al verschil maken.",
  ],
  pelvic: [
    "Bouw buikdruk-belastende bewegingen rustig op en let op je ademhaling tijdens inspanning.",
    "Bekken- en bekkenbodemherstel vraagt om een geleidelijke opbouw, forceren werkt meestal averechts.",
    "Een stevige basis van rust en ontspanning ondersteunt herstel in dit gebied.",
  ],
  other: [
    "Consistentie in kleine, haalbare stappen levert op de lange termijn vaak het meeste op.",
    "Luister goed naar signalen van je lichaam tijdens de opbouw van je herstel.",
  ],
};

function buildExtraInsights(input: CoachInput): string[] {
  const insights: string[] = [];
  const recentSorted = [...input.checkIns].sort((a, b) => b.date.localeCompare(a.date));

  const lowStreak = countLeadingStreak(recentSorted, c => c.dagscore <= 2);
  if (lowStreak >= 3) {
    insights.push(`Je check-in score is al ${lowStreak} dagen op rij lager dan 3.`);
  } else {
    const highStreak = countLeadingStreak(recentSorted, c => c.dagscore >= 4);
    if (highStreak >= 3) {
      insights.push(`Je check-in score is al ${highStreak} dagen op rij 4 of hoger: goed bezig.`);
    }
  }

  // Trainingscorrelatie — laatste 30 dagen, op basis van de zelf-gerapporteerde
  // trainingGedaan-vlag op de check-in (werkt voor zowel protocol- als vrije
  // training, want die vlag is los van de trainingsbron).
  const monthAgo = new Date(input.now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = dateStr(monthAgo);
  const recentMonth = input.checkIns.filter(c => c.date >= monthAgoStr);
  const trainingDays = recentMonth.filter(c => c.trainingGedaan);
  const restDays = recentMonth.filter(c => !c.trainingGedaan);
  const avgTrainingScore = average(trainingDays.map(c => c.dagscore));
  const avgRestScore = average(restDays.map(c => c.dagscore));
  if (
    avgTrainingScore !== null && avgRestScore !== null &&
    trainingDays.length >= 3 && restDays.length >= 3 &&
    avgTrainingScore - avgRestScore >= 0.3
  ) {
    insights.push("Je scoort gemiddeld hoger op dagen dat je traint.");
  }

  // Protocol-tip van de dag — roteert dagelijks door de educatie-items van de
  // huidige fase (al opgehaald via usePatientProtocol, hier voor het eerst gebruikt).
  if (input.hasActiveProtocol && input.protocolPhase && input.protocolPhase.educationItems.length > 0) {
    const items = input.protocolPhase.educationItems;
    const tip = items[dayOfYearIndex(items.length, input.now)];
    insights.push(`Wist je dat: ${tip.title}${tip.body ? `. ${tip.body}` : ""}`);
  } else if (input.profile.blessureType) {
    const region = getBodyRegion(input.profile.blessureType);
    const tips = BODY_REGION_TIPS[region];
    insights.push(tips[dayOfYearIndex(tips.length, input.now)]);
  }

  return insights.slice(0, 2);
}

// ─── Master export ────────────────────────────────────────────────────────────

export function generateCoachInsights(input: CoachInput): CoachInsights {
  const today     = dateStr(input.now);
  const tomorrow  = (() => { const d = new Date(input.now); d.setDate(d.getDate() + 1); return dateStr(d); })();
  const thisWeek  = weekDates(input.now);
  const lastWeek  = prevWeekDates(input.now);

  const todayCheckIn = input.checkIns.find(c => c.date === today);
  const dailyInsight = buildDailyInsight(input, today, thisWeek);
  const { nextStep, nextStepAction } = buildNextStep(input, today, tomorrow);
  const weekly = buildWeeklySummary(input, thisWeek, lastWeek);
  const moodTag = computeMoodTag(weekly, todayCheckIn);
  const insights = buildExtraInsights(input);

  return {
    dailyInsight,
    nextStep,
    nextStepAction,
    weekly,
    insights,
    moodTag,
    disclaimerTekst: "REVA geeft geen medisch advies. Raadpleeg altijd je zorgverlener bij vragen over je gezondheid.",
  };
}
