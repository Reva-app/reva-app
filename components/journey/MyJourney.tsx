"use client";

import { useEffect, useState } from "react";
import { Flag, Dumbbell, CalendarCheck, Repeat, Timer, TrendingDown, Trophy, Gauge, Sparkles, Star, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { loadMyProtocolTimeline, type PatientProtocolTimelinePhase } from "@/lib/services/patientProtocolService";
import { loadTrainingTotals, type TrainingTotals } from "@/lib/services/journeyService";
import { loadPatientTests, headlineValue, formatTestValue, type PatientTest } from "@/lib/services/testService";
import type { CheckIn, Mijlpaal, TrainingLog } from "@/lib/data";

interface Moment { date: string; title: string; detail?: string; icon: typeof Flag; tone: "accent" | "green" | "gray" }

const fmtDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const nf = (n: number) => n.toLocaleString("nl-NL");

function countMilestones<T>(dates: string[], steps: number[], make: (n: number, date: string) => T): T[] {
  return steps.filter((s) => dates.length >= s).map((s) => make(s, dates[s - 1]));
}

/**
 * "Jouw traject": wat je in je hele herstel al gedaan hebt en welke stappen
 * je gezet hebt. Bij een lang herstel vergeet je dat snel; hier staat het
 * zwart op wit.
 */
export function MyJourney({ patientId, checkIns, mijlpalen, trainingLogs, daysSinceStart }: {
  patientId: string | null;
  checkIns: CheckIn[];
  mijlpalen: Mijlpaal[];
  trainingLogs: TrainingLog[];
  daysSinceStart: number;
}) {
  const [phases, setPhases] = useState<PatientProtocolTimelinePhase[]>([]);
  const [totals, setTotals] = useState<TrainingTotals | null>(null);
  const [tests, setTests] = useState<PatientTest[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    Promise.all([loadMyProtocolTimeline(patientId), loadTrainingTotals(patientId), loadPatientTests(patientId)]).then(([p, t, ts]) => {
      if (cancelled) return;
      setPhases(p); setTotals(t); setTests(ts);
    });
    return () => { cancelled = true; };
  }, [patientId]);

  const ci = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const ownTrainings = trainingLogs.filter((t) => t.completed).map((t) => t.date).sort();
  const sessionDates = [...(totals?.sessionDates ?? []), ...ownTrainings].sort();
  const trainings = sessionDates.length;
  const phasesDone = phases.filter((p) => p.status === "completed");
  const milestonesDone = mijlpalen.filter((m) => m.completed).length + phases.reduce((s, p) => s + p.milestonesCompleted, 0);

  const painFirst = ci.find((c) => c.pijn > 0)?.pijn ?? null;
  const recent = ci.slice(-7).filter((c) => c.pijn > 0);
  const painNow = recent.length ? Math.round((recent.reduce((s, c) => s + c.pijn, 0) / recent.length) * 10) / 10 : null;
  const testsBetter = tests.filter((t) => {
    if (t.results.length < 2) return false;
    const a = headlineValue(t, t.results[0]), b = headlineValue(t, t.results[t.results.length - 1]);
    return a !== null && b !== null && (t.higherIsBetter ? b > a : b < a);
  });

  // Langste reeks dagen achter elkaar met een check-in
  let streak = 0, best = 0, prev: string | null = null;
  for (const c of ci) {
    const d = c.date;
    streak = prev && (new Date(`${d}T12:00:00`).getTime() - new Date(`${prev}T12:00:00`).getTime()) / 86_400_000 === 1 ? streak + 1 : 1;
    best = Math.max(best, streak);
    prev = d;
  }

  if (ci.length === 0 && trainings === 0 && phasesDone.length === 0) return null;

  // ── Tijdlijn van momenten ──
  const moments: Moment[] = [];
  if (ci[0]) moments.push({ date: ci[0].date, title: "Je eerste check-in", detail: "Het begin van je traject in REVA", icon: Flag, tone: "gray" });
  for (const p of phasesDone) if (p.completedAt) moments.push({ date: p.completedAt, title: `${p.name} afgerond`, icon: Trophy, tone: "green" });
  for (const p of phases) if (p.status === "active" && p.startedAt) moments.push({ date: p.startedAt, title: `Gestart met ${p.name}`, icon: Sparkles, tone: "accent" });
  for (const m of mijlpalen) if (m.completed && m.completedAt) moments.push({ date: m.completedAt, title: `Mijlpaal: ${m.title}`, icon: Star, tone: "accent" });
  moments.push(...countMilestones(ci.map((c) => c.date), [10, 25, 50, 100, 200], (n, date) => ({ date, title: `${n} check-ins ingevuld`, icon: CalendarCheck, tone: "gray" as const })));
  moments.push(...countMilestones(sessionDates, [1, 10, 25, 50, 100], (n, date) => ({ date, title: n === 1 ? "Je eerste training" : `${n} trainingen gedaan`, icon: Dumbbell, tone: "gray" as const })));
  for (const t of testsBetter) {
    const last = t.results[t.results.length - 1];
    moments.push({ date: last.measuredOn, title: `${t.name}: vooruitgang`, detail: `${formatTestValue(headlineValue(t, t.results[0]), t.unit)} → ${formatTestValue(headlineValue(t, last), t.unit)}`, icon: Gauge, tone: "green" });
  }
  moments.sort((a, b) => b.date.localeCompare(a.date));
  const visible = showAll ? moments : moments.slice(0, 6);

  const stats = [
    { icon: CalendarCheck, value: nf(Math.max(daysSinceStart, 0)), label: "dagen aan je herstel" },
    { icon: Flag, value: nf(ci.length), label: "check-ins" },
    { icon: Dumbbell, value: nf(trainings), label: "trainingen" },
    ...(totals && totals.reps > 0 ? [{ icon: Repeat, value: nf(totals.reps), label: "herhalingen" }] : []),
    ...(totals && totals.minutes > 0 ? [{ icon: Timer, value: nf(totals.minutes), label: "minuten geoefend" }] : []),
    ...(phases.length ? [{ icon: Trophy, value: `${phasesDone.length} / ${phases.length}`, label: "fases afgerond" }] : []),
    ...(milestonesDone ? [{ icon: Star, value: nf(milestonesDone), label: "mijlpalen" }] : []),
    ...(best >= 3 ? [{ icon: Sparkles, value: nf(best), label: "dagen op rij ingecheckt (record)" }] : []),
  ];

  const toneStyle = (t: Moment["tone"]) => t === "green" ? { background: "#dcfce7", color: "#15803d" } : t === "accent" ? { background: "var(--brand-accent-soft, #fdefea)", color: "var(--brand-accent, #e8632a)" } : { background: "#f3f4f6", color: "#6b7280" };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1c1c1e 0%, #2d2a27 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand-accent-on-dark, #f6b08c)" }}>Jouw traject</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">Kijk eens hoe ver je al bent</h2>
        {painFirst !== null && painNow !== null && painNow < painFirst ? (
          <p className="text-sm sm:text-base text-white/75 mt-2 max-w-2xl inline-flex items-center gap-2">
            <TrendingDown size={16} /> Je pijn ging van {painFirst} naar gemiddeld {String(painNow).replace(".", ",")} deze week.
          </p>
        ) : (
          <p className="text-sm sm:text-base text-white/75 mt-2 max-w-2xl">Elke check-in en training brengt je een stap verder. Dit heb je al gedaan:</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {stats.slice(0, 8).map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.07] px-4 py-3">
              <s.icon size={15} className="text-white/60" />
              <p className="text-xl sm:text-2xl font-bold tabular-nums mt-1.5">{s.value}</p>
              <p className="text-xs text-white/60 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {moments.length > 0 && (
        <Card>
          <p className="font-semibold text-gray-900">Stappen die je gezet hebt</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">Van nieuw naar oud. Bij een lang herstel vergeet je snel wat je al bereikt hebt.</p>
          <ol className="relative">
            {visible.map((m, i) => (
              <li key={`${m.title}-${m.date}-${i}`} className="flex gap-3 pb-4 last:pb-0 relative">
                {i < visible.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px" style={{ background: "#ece9e3" }} />}
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative" style={toneStyle(m.tone)}><m.icon size={14} /></span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">{fmtDate(m.date)}{m.detail ? ` · ${m.detail}` : ""}</p>
                </div>
              </li>
            ))}
          </ol>
          {moments.length > 6 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
              <ChevronDown size={14} className={showAll ? "rotate-180" : ""} /> {showAll ? "Minder tonen" : `Alle ${moments.length} momenten`}
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
