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

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CoachMoodTag = "positief" | "stabiel" | "voorzichtig";

export interface WeeklySummary {
  avgScore:       number | null;
  trainedDays:    number;
  medCount:       number;
  completedMijl:  number;
  trend:          "stijgend" | "dalend" | "stabiel" | "onbekend";
  coachTekst:     string;
}

export interface CoachInsights {
  dailyInsight:   string;
  nextStep:       string;
  nextStepAction: string; // "modal:checkin" | "navigate:/dagboek" | etc.
  weekly:         WeeklySummary;
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

// ─── Trend helper ─────────────────────────────────────────────────────────────

type Trend = "stijgend" | "dalend" | "stabiel" | "onbekend";

function computeTrend(scores: number[]): Trend {
  if (scores.length < 4) return "onbekend";
  const mid      = Math.floor(scores.length / 2);
  const earlyAvg = scores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const lateAvg  = scores.slice(mid).reduce((s, v) => s + v, 0) / (scores.length - mid);
  if (lateAvg > earlyAvg + 0.3) return "stijgend";
  if (lateAvg < earlyAvg - 0.3) return "dalend";
  return "stabiel";
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

// ─── Daily insight generator ──────────────────────────────────────────────────

function buildDailyInsight(input: CoachInput, today: string, weekDays: string[]): string {
  const { checkIns, dagboekWorkouts, appointments, medicatie, mijlpalen, dagsSindsBlessure } = input;
  const now = input.now;

  const todayCheckIn   = checkIns.find(c => c.date === today);
  const weekCheckIns   = checkIns.filter(c => weekDays.includes(c.date));
  const weekScores     = weekCheckIns.map(c => c.dagscore);
  const weekAvg        = avg(weekScores);
  const trend          = computeTrend(weekScores);
  const trainedThisWeek = new Set(dagboekWorkouts.filter(w => weekDays.includes(w.date) && w.completed).map(w => w.date)).size;
  const todayWorkouts  = dagboekWorkouts.filter(w => w.date === today);
  const openToday      = todayWorkouts.filter(w => !w.completed);
  const behaaldVandaag = mijlpalen.filter(m => m.completed && m.completedAt?.slice(0, 10) === today);
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
      return `Je check-in score van vandaag is ${todayCheckIn.dagscore}/5 — dat is goed. Blijf dit ritme vasthouden.`;
    }
    if (todayCheckIn.dagscore <= 2) {
      return `Je score van vandaag is ${todayCheckIn.dagscore}/5. Dat zijn zware momenten. Rust nemen is ook onderdeel van herstel.`;
    }
    if (trend === "dalend" && todayCheckIn.dagscore === 3) {
      return `Je scores laten de afgelopen dagen een licht dalende lijn zien. Je lichaam geeft signalen — luister goed naar wat het nodig heeft.`;
    }
  }

  // No check-in yet
  if (!todayCheckIn) {
    if (now.getHours() >= 18) {
      return `Je hebt vandaag nog geen check-in ingevuld. Een check-in helpt je om goed zicht te houden op je herstel — ook op moeilijkere dagen.`;
    }
    return `Nog geen check-in vandaag. Door dit bij te houden krijg je steeds beter inzicht in hoe je herstel verloopt.`;
  }

  // Strong training week
  if (trainedThisWeek >= 4) {
    return `Je hebt deze week al ${trainedThisWeek} trainingsdagen afgerond. Dat is een sterke week — goed bezig.`;
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
    return `Vandaag ben je ${dagsSindsBlessure} dagen bezig met je herstel. Elke dag telt — ook de rustigere.`;
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
  const nextMijlpaal  = [...mijlpalen].filter(m => !m.completed).sort((a, b) => (a.fase ?? "").localeCompare(b.fase ?? ""))[0] ?? null;

  // Priority 1: open training today
  if (openToday.length > 0) {
    return { nextStep: "Je training van vandaag staat nog open", nextStepAction: "navigate:/dagboek" };
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
      nextStep: `Je hebt morgen een afspraak — kijk je voorbereiding nog even na`,
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

  const weekAvg    = avg(weekScores);
  const prevAvg    = avg(prevScores);
  const trainedDays = new Set(dagboekWorkouts.filter(w => weekDays.includes(w.date) && w.completed).map(w => w.date)).size;
  const medCount   = medicatie.filter(m => weekDays.includes(m.date)).length;
  const compMijl   = mijlpalen.filter(m => m.completed && weekDays.includes(m.completedAt?.slice(0, 10) ?? "")).length;

  const trend: Trend = weekAvg !== null && prevAvg !== null
    ? weekAvg > prevAvg + 0.2 ? "stijgend" : weekAvg < prevAvg - 0.2 ? "dalend" : "stabiel"
    : computeTrend(weekScores);

  let coachTekst = "";
  if (weekCheckIns.length === 0) {
    coachTekst = "Je hebt deze week nog geen check-ins ingevuld. Door dit bij te houden krijg je steeds beter inzicht.";
  } else if (trend === "stijgend" && trainedDays >= 3) {
    coachTekst = "Je zit in een mooie flow met training en structuur. Sterk herstelwerk deze week.";
  } else if (trend === "stijgend") {
    coachTekst = "Je herstel laat deze week een stijgende lijn zien. Goed bezig.";
  } else if (trend === "dalend" && (weekAvg ?? 0) <= 2.5) {
    coachTekst = "Deze week was zwaarder dan de vorige. Neem de tijd, luister naar je lichaam.";
  } else if (trend === "dalend") {
    coachTekst = "De scores deze week zijn iets lager. Misschien is wat extra rust goed voor je herstel.";
  } else if (trainedDays >= 4) {
    coachTekst = "Je hebt deze week consistent getraind. Dat is een sterk fundament voor je herstel.";
  } else if (compMijl > 0) {
    coachTekst = `Je hebt deze week ${compMijl} ${compMijl === 1 ? "mijlpaal" : "mijlpalen"} bereikt. Elke stap telt.`;
  } else {
    coachTekst = "Je herstel laat deze week stabiele voortgang zien. Blijf dit ritme vasthouden.";
  }

  return { avgScore: weekAvg, trainedDays, medCount, completedMijl: compMijl, trend, coachTekst };
}

// ─── Mood tag ─────────────────────────────────────────────────────────────────

function computeMoodTag(weekly: WeeklySummary, todayCheckIn: CheckIn | undefined): CoachMoodTag {
  const score = todayCheckIn?.dagscore ?? weekly.avgScore ?? null;
  if (score === null) return "stabiel";
  if (score >= 4 && (weekly.trend === "stijgend" || weekly.trend === "stabiel")) return "positief";
  if (score <= 2 || weekly.trend === "dalend") return "voorzichtig";
  return "stabiel";
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

  return {
    dailyInsight,
    nextStep,
    nextStepAction,
    weekly,
    moodTag,
    disclaimerTekst: "REVA geeft geen medisch advies. Raadpleeg altijd je zorgverlener bij vragen over je gezondheid.",
  };
}
