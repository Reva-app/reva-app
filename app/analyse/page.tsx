"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAppData } from "@/lib/store";
import {
  TrendingUp, TrendingDown, Minus, Activity, Zap,
  Dumbbell, Pill, Target, Lightbulb, ChevronRight,
  CheckCircle2, Circle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 7 | 14 | 30;
type Trend = "stijgend" | "dalend" | "stabiel";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function trendOf(curr: number, prev: number, threshold = 0.15): Trend {
  if (!prev || !curr) return "stabiel";
  const delta = (curr - prev) / prev;
  if (Math.abs(delta) < threshold) return "stabiel";
  return delta > 0 ? "stijgend" : "dalend";
}

function fmt(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", opts ?? { day: "numeric", month: "short" });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + "T12:00:00").getTime() - Date.now()) / 86_400_000);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86_400_000);
}

function round1(n: number): string {
  return n.toFixed(1);
}

// ─── SVG line chart ───────────────────────────────────────────────────────────

function LineChart({
  data,
  dates,
  color,
  max,
  height = 80,
}: {
  data: number[];
  dates: string[];
  color: string;
  max: number;
  height?: number;
}) {
  if (data.length < 2) return (
    <div className="flex items-center justify-center text-xs text-gray-300" style={{ height }}>
      Onvoldoende data
    </div>
  );

  const W = 480;
  const H = height;
  const padX = 4;
  const padY = 6;
  const xStep = (W - padX * 2) / (data.length - 1);

  const pts = data.map((v, i) => ({
    x: padX + i * xStep,
    y: padY + (1 - Math.min(v, max) / max) * (H - padY * 2),
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${H} ` + pts.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${H} Z`;

  // Show up to 5 date labels
  const labelIndices = (() => {
    if (data.length <= 5) return data.map((_, i) => i);
    const step = Math.floor((data.length - 1) / 4);
    return [0, step, step * 2, step * 3, data.length - 1];
  })();

  const gradId = `line-grad-${color.replace("#", "")}`;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Subtle grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX} y1={padY + f * (H - padY * 2)}
            x2={W - padX} y2={padY + f * (H - padY * 2)}
            stroke="#f0ede8" strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
      </svg>
      {/* Date labels */}
      <div className="flex justify-between mt-1 px-1">
        {labelIndices.map((idx) => (
          <span key={idx} className="text-[9px]" style={{ color: "#c4bfb9" }}>
            {dates[idx] ? fmt(dates[idx]) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function Sparkline({ data, color, max }: { data: number[]; color: string; max: number }) {
  if (data.length < 2) return null;
  const W = 80, H = 28, pad = 2;
  const xStep = (W - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => `${pad + i * xStep},${pad + (1 - Math.min(v, max) / max) * (H - pad * 2)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 80, height: 28, flexShrink: 0 }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ trend, size = 14 }: { trend: Trend; size?: number }) {
  if (trend === "stijgend") return <TrendingUp size={size} style={{ color: "#16a34a" }} />;
  if (trend === "dalend")   return <TrendingDown size={size} style={{ color: "#ef4444" }} />;
  return <Minus size={size} style={{ color: "#9ca3af" }} />;
}

function trendColor(trend: Trend): string {
  if (trend === "stijgend") return "#16a34a";
  if (trend === "dalend")   return "#ef4444";
  return "#9ca3af";
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function Bar({ label, value, max, color = "#e8632a", sublabel }: {
  label: string; value: number; max: number; color?: string; sublabel?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600">{label}</span>
        <div className="flex items-center gap-1.5">
          {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
          <span className="text-xs font-semibold text-gray-800">{round1(value)}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f0eb" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Delta chip ───────────────────────────────────────────────────────────────

function Delta({ curr, prev, higherIsBetter = true, unit = "" }: {
  curr: number; prev: number; higherIsBetter?: boolean; unit?: string;
}) {
  const diff = curr - prev;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 0.05;
  const color = neutral ? "#9ca3af" : good ? "#16a34a" : "#ef4444";
  const sign = diff > 0 ? "+" : "";
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {neutral ? "—" : `${sign}${round1(diff)}${unit}`}
    </span>
  );
}

// ─── Period filter ────────────────────────────────────────────────────────────

function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: "#f3f0eb" }}>
      {([7, 14, 30] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: value === p ? "#ffffff" : "transparent",
            color: value === p ? "#1a1a1a" : "#9ca3af",
            boxShadow: value === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {p} dagen
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalysePage() {
  const {
    hydrated, checkIns, medicatie, trainingLogs,
    appointments, mijlpalen, fotoUpdates,
  } = useAppData();

  const [period, setPeriod] = useState<Period>(14);

  const s = useMemo(() => {
    if (!hydrated) return null;

    const todayStr  = localDateStr(new Date());
    const curStart  = daysAgo(period);
    const prevStart = daysAgo(period * 2);

    // ── Slice data by period ────────────────────────────────────────────────
    const curCI  = checkIns.filter(c => c.date >= curStart  && c.date <= todayStr);
    const prevCI = checkIns.filter(c => c.date >= prevStart && c.date <  curStart);

    const curMed  = medicatie.filter(m => m.date >= curStart);
    const prevMed = medicatie.filter(m => m.date >= prevStart && m.date < curStart);

    const curTrain  = trainingLogs.filter(t => t.date >= curStart);
    const prevTrain = trainingLogs.filter(t => t.date >= prevStart && t.date < curStart);

    // ── Week slices (always 7-day) ──────────────────────────────────────────
    const thisWeekStart = daysAgo(7);
    const lastWeekStart = daysAgo(14);
    const thisWeekCI  = checkIns.filter(c => c.date >= thisWeekStart);
    const lastWeekCI  = checkIns.filter(c => c.date >= lastWeekStart && c.date < thisWeekStart);
    const thisWeekTr  = trainingLogs.filter(t => t.date >= thisWeekStart);
    const lastWeekTr  = trainingLogs.filter(t => t.date >= lastWeekStart && t.date < thisWeekStart);
    const thisWeekMed = medicatie.filter(m => m.date >= thisWeekStart);
    const lastWeekMed = medicatie.filter(m => m.date >= lastWeekStart && m.date < thisWeekStart);

    // ── Averages ────────────────────────────────────────────────────────────
    const avgScore      = avg(curCI.map(c => c.dagscore));
    const prevAvgScore  = avg(prevCI.map(c => c.dagscore));
    const avgPijn       = avg(curCI.map(c => c.pijn));
    const prevAvgPijn   = avg(prevCI.map(c => c.pijn));
    const avgMob        = avg(curCI.map(c => c.mobiliteit));
    const prevAvgMob    = avg(prevCI.map(c => c.mobiliteit));
    const avgEnergie    = avg(curCI.map(c => c.energie));
    const avgSlaap      = avg(curCI.map(c => c.slaap));

    // ── Trends ──────────────────────────────────────────────────────────────
    const scoreTrend = trendOf(avgScore, prevAvgScore);
    const pijnTrend  = trendOf(prevAvgPijn, avgPijn); // invert: lower pijn = beter
    const mobTrend   = trendOf(avgMob, prevAvgMob);

    // ── Chart data (sorted) ─────────────────────────────────────────────────
    const sorted    = [...curCI].sort((a, b) => a.date.localeCompare(b.date));
    const scoreSeries = sorted.map(c => c.dagscore);
    const pijnSeries  = sorted.map(c => c.pijn);
    const chartDates  = sorted.map(c => c.date);

    // ── Training insight ────────────────────────────────────────────────────
    const trainingDates = new Set([
      ...trainingLogs.map(t => t.date),
      ...checkIns.filter(c => c.trainingGedaan).map(c => c.date),
    ]);
    const avgScoreOnTrain    = avg(curCI.filter(c => trainingDates.has(c.date)).map(c => c.dagscore));
    const avgScoreOffTrain   = avg(curCI.filter(c => !trainingDates.has(c.date)).map(c => c.dagscore));
    const thisWeekTrainDays  = new Set(thisWeekTr.map(t => t.date)).size;

    // ── Medicatie breakdown ─────────────────────────────────────────────────
    const medGroups = new Map<string, number>();
    curMed.forEach(m => medGroups.set(m.naam, (medGroups.get(m.naam) ?? 0) + 1));
    const medByName = [...medGroups.entries()].sort((a, b) => b[1] - a[1]);
    const maxMedCount = medByName[0]?.[1] ?? 1;
    const medTrend = trendOf(prevMed.length || 0, curMed.length, 0.1) as Trend;
    // for medicatie: less = better, so invert label
    const medTrendLabel: Trend = medTrend === "stijgend" ? "dalend" : medTrend === "dalend" ? "stijgend" : "stabiel";

    // ── Mijlpalen ───────────────────────────────────────────────────────────
    const done     = mijlpalen.filter(m => m.completed);
    const nextMijl = mijlpalen.find(m => !m.completed);
    const progress = mijlpalen.length ? done.length / mijlpalen.length : 0;
    const recentDone = [...done]
      .filter(m => m.completedAt)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 3);

    // ── Smart summary ───────────────────────────────────────────────────────
    let summary = "";
    if (curCI.length === 0) {
      summary = "Vul dagelijkse check-ins in om inzicht te krijgen in jouw herstelvoortgang.";
    } else if (scoreTrend === "stijgend") {
      summary = "Je hersteltrend gaat de goede kant op — je dagscores stijgen.";
    } else if (scoreTrend === "dalend") {
      summary = "Je hersteltrend toont een lichte daling. Schommelingen zijn normaal in herstel.";
    } else {
      summary = `Je hersteltrend is stabiel over de afgelopen ${period} dagen.`;
    }
    if (curCI.length > 0) {
      if (pijnTrend === "stijgend") summary += " Je pijnniveau verbetert.";
      else if (avgMob > 3.5) summary += " Je mobiliteit is op een goed niveau.";
      if (curMed.length < prevMed.length && prevMed.length > 0)
        summary += " Je medicatiegebruik neemt af.";
    }

    // ── "Wat valt op" observations ──────────────────────────────────────────
    const obs: string[] = [];

    // Consecutive low scores
    const recSorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const ci of recSorted) { if (ci.dagscore <= 2) streak++; else break; }
    if (streak >= 3) obs.push(`Je check-in score is al ${streak} dagen op rij lager dan 3.`);

    // Training vs last week
    const tw = thisWeekTr.length, lw = lastWeekTr.length;
    if (tw > lw) obs.push(`Je hebt deze week ${tw - lw} ${tw - lw === 1 ? "training" : "trainingen"} meer afgerond dan vorige week.`);
    else if (lw > tw && lw > 0) obs.push(`Je hebt deze week minder getraind dan vorige week.`);

    // Last foto update
    if (fotoUpdates.length > 0) {
      const lastFoto = [...fotoUpdates].sort((a, b) => b.date.localeCompare(a.date))[0];
      const ago = daysSince(lastFoto.date);
      if (ago >= 7) obs.push(`Je laatste foto update is ${ago} dagen geleden.`);
    } else {
      obs.push("Je hebt nog geen voortgangsfoto toegevoegd aan het dossier.");
    }

    // Next appointment
    const futureAppts = appointments
      .filter(a => a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (futureAppts.length > 0) {
      const next = futureAppts[0];
      const d = daysUntil(next.date);
      if (d <= 7) {
        const when = d === 0 ? "vandaag" : d === 1 ? "morgen" : `over ${d} dagen`;
        obs.push(`Je volgende afspraak — "${next.title}" — is ${when}.`);
      }
    }

    // Medicatie trend
    if (curMed.length < prevMed.length && prevMed.length > 0)
      obs.push("Je medicatiegebruik neemt af ten opzichte van de vorige periode.");
    else if (curMed.length > prevMed.length && prevMed.length > 0)
      obs.push("Je medicatiegebruik is hoger dan in de vorige periode.");

    // Mobiliteit improving
    if (avgMob > prevAvgMob + 0.2 && Math.abs(avgPijn - prevAvgPijn) < 0.8)
      obs.push("Je mobiliteit verbetert terwijl je pijnniveau stabiel blijft.");

    // Good score streak
    let highStreak = 0;
    for (const ci of recSorted) { if (ci.dagscore >= 4) highStreak++; else break; }
    if (highStreak >= 3) obs.push(`Je check-in score is al ${highStreak} dagen op rij 4 of hoger — goed bezig.`);

    return {
      // Period averages
      avgScore, prevAvgScore, scoreTrend,
      avgPijn, prevAvgPijn, pijnTrend,
      avgMob, prevAvgMob, mobTrend,
      avgEnergie, avgSlaap,
      // Counts
      ciCount: curCI.length, trainCount: curTrain.length, medCount: curMed.length,
      // Charts
      scoreSeries, pijnSeries, chartDates,
      // Week comparison
      thisWeekCI, lastWeekCI, thisWeekTr, lastWeekTr, thisWeekMed, lastWeekMed,
      thisWeekTrainDays,
      // Training insight
      avgScoreOnTrain, avgScoreOffTrain,
      // Medicatie
      medByName, maxMedCount, medTrendLabel,
      // Mijlpalen
      done, nextMijl, progress, recentDone, mijlpalenTotal: mijlpalen.length,
      // Narrative
      summary, obs,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, checkIns, medicatie, trainingLogs, appointments, mijlpalen, fotoUpdates, period]);

  const noData = !s || s.ciCount === 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <SectionHeader
            title="Analyse"
            subtitle="Inzicht in jouw herstelvoortgang"
          />
          {s && (
            <p className="text-sm mt-2 leading-relaxed max-w-xl" style={{ color: "#6b7280" }}>
              {s.summary}
            </p>
          )}
        </div>
        <div className="shrink-0 mt-1">
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* ── Rij 2: 3 inzichtkaarten ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Kaart 1: Hersteltrend */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "#e8e5df", background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>Hersteltrend</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: "#1a1a1a" }}>
                {s ? round1(s.avgScore) : "—"}<span className="text-sm font-normal text-gray-400">/5</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#fff5f0" }}>
              <Activity size={15} style={{ color: "#e8632a" }} />
            </div>
          </div>
          {s && (
            <>
              <Sparkline data={s.scoreSeries.slice(-10)} color="#e8632a" max={5} />
              <div className="flex items-center gap-1.5 mt-2">
                <TrendIcon trend={s.scoreTrend} size={13} />
                <span className="text-xs font-medium capitalize" style={{ color: trendColor(s.scoreTrend) }}>
                  {s.scoreTrend}
                </span>
                <span className="text-xs text-gray-400">t.o.v. vorige periode</span>
              </div>
            </>
          )}
        </div>

        {/* Kaart 2: Pijn & Mobiliteit */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "#e8e5df", background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>Pijn & Mobiliteit</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: "#1a1a1a" }}>
                {s ? round1(s.avgPijn) : "—"}<span className="text-sm font-normal text-gray-400">/10</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#fef3c7" }}>
              <Zap size={15} style={{ color: "#d97706" }} />
            </div>
          </div>
          {s && (
            <>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Pijn</span>
                  <div className="flex items-center gap-1"><TrendIcon trend={s.pijnTrend} size={11} /><span style={{ color: trendColor(s.pijnTrend) }} className="font-medium capitalize">{s.pijnTrend}</span></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Mobiliteit</span>
                  <span className="font-semibold text-gray-800">{round1(s.avgMob)}/5</span>
                </div>
              </div>
              {s.avgMob > s.prevAvgMob + 0.1 && Math.abs(s.avgPijn - s.prevAvgPijn) < 1 && (
                <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "#9ca3af" }}>
                  Mobiliteit stijgt terwijl pijn stabiel blijft
                </p>
              )}
            </>
          )}
        </div>

        {/* Kaart 3: Activiteit */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "#e8e5df", background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>Activiteit</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: "#1a1a1a" }}>
                {s ? s.ciCount : "—"}<span className="text-sm font-normal text-gray-400"> check-ins</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#f0fdf4" }}>
              <Dumbbell size={15} style={{ color: "#16a34a" }} />
            </div>
          </div>
          {s && (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Trainingen</span>
                <span className="font-semibold text-gray-800">{s.trainCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Medicatie innames</span>
                <span className="font-semibold text-gray-800">{s.medCount}</span>
              </div>
              {s.avgScoreOnTrain > s.avgScoreOffTrain + 0.2 && s.trainCount > 0 && (
                <p className="text-[10px] pt-1 leading-relaxed" style={{ color: "#9ca3af" }}>
                  Op trainingsdagen is je score gemiddeld hoger
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Rij 3: hoofdgrafieken ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader title="Check-in trend" subtitle={`Dagscore — laatste ${period} dagen`} />
          {noData ? (
            <p className="text-sm text-gray-400 mt-2">Geen check-in data beschikbaar.</p>
          ) : (
            <>
              <div className="mt-3">
                <LineChart data={s!.scoreSeries} dates={s!.chartDates} color="#e8632a" max={5} height={88} />
              </div>
              <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: "1px solid #f3f0eb" }}>
                <span className="text-xs text-gray-400">Gem. {round1(s!.avgScore)}/5</span>
                <div className="flex items-center gap-1">
                  <TrendIcon trend={s!.scoreTrend} size={12} />
                  <span className="text-xs font-medium capitalize" style={{ color: trendColor(s!.scoreTrend) }}>{s!.scoreTrend}</span>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Pijnniveau trend" subtitle={`Pijnscore — laatste ${period} dagen`} />
          {noData ? (
            <p className="text-sm text-gray-400 mt-2">Geen check-in data beschikbaar.</p>
          ) : (
            <>
              <div className="mt-3">
                <LineChart data={s!.pijnSeries} dates={s!.chartDates} color="#f59e0b" max={10} height={88} />
              </div>
              <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: "1px solid #f3f0eb" }}>
                <span className="text-xs text-gray-400">Gem. {round1(s!.avgPijn)}/10</span>
                <div className="flex items-center gap-1">
                  <TrendIcon trend={s!.pijnTrend} size={12} />
                  <span className="text-xs font-medium capitalize" style={{ color: trendColor(s!.pijnTrend) }}>{s!.pijnTrend}</span>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Rij 4: detail analyse ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gemiddelde herstelwaarden */}
        <Card>
          <CardHeader title="Gemiddelde herstelwaarden" subtitle={`Over de afgelopen ${period} dagen`} />
          {noData ? (
            <p className="text-sm text-gray-400 mt-2">Geen data beschikbaar.</p>
          ) : (
            <div className="space-y-4 mt-3">
              <Bar label="Pijn (omgekeerd)" value={10 - s!.avgPijn} max={10} color="#e8632a" sublabel="/10 — lager is beter" />
              <Bar label="Mobiliteit" value={s!.avgMob} max={5} color="#3b82f6" sublabel="/5" />
              <Bar label="Energie" value={s!.avgEnergie} max={5} color="#8b5cf6" sublabel="/5" />
              <Bar label="Slaapkwaliteit" value={s!.avgSlaap} max={5} color="#0ea5e9" sublabel="/5" />
            </div>
          )}
        </Card>

        {/* Weekvergelijking */}
        <Card>
          <CardHeader title="Weekvergelijking" subtitle="Deze week vs vorige week" />
          {!s ? (
            <p className="text-sm text-gray-400 mt-2">Geen data beschikbaar.</p>
          ) : (
            <div className="space-y-0 mt-2">
              {[
                {
                  label: "Check-in score",
                  curr: avg(s.thisWeekCI.map(c => c.dagscore)),
                  prev: avg(s.lastWeekCI.map(c => c.dagscore)),
                  unit: "",
                  higherIsBetter: true,
                  display: `${round1(avg(s.thisWeekCI.map(c => c.dagscore)))}/5`,
                },
                {
                  label: "Pijnniveau",
                  curr: avg(s.thisWeekCI.map(c => c.pijn)),
                  prev: avg(s.lastWeekCI.map(c => c.pijn)),
                  unit: "",
                  higherIsBetter: false,
                  display: `${round1(avg(s.thisWeekCI.map(c => c.pijn)))}/10`,
                },
                {
                  label: "Trainingen",
                  curr: s.thisWeekTr.length,
                  prev: s.lastWeekTr.length,
                  unit: "×",
                  higherIsBetter: true,
                  display: `${s.thisWeekTr.length}×`,
                },
                {
                  label: "Medicatie innames",
                  curr: s.thisWeekMed.length,
                  prev: s.lastWeekMed.length,
                  unit: "×",
                  higherIsBetter: false,
                  display: `${s.thisWeekMed.length}×`,
                },
              ].map(({ label, curr, prev, unit, higherIsBetter, display }) => (
                <div key={label} className="flex items-center justify-between py-3"
                  style={{ borderBottom: "1px solid #f8f7f4" }}>
                  <span className="text-sm text-gray-600">{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">{display}</span>
                    <Delta curr={curr} prev={prev} higherIsBetter={higherIsBetter} unit={unit} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Rij 5: training & medicatie ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Training analyse */}
        <Card>
          <CardHeader
            title="Training"
            subtitle="Activiteit & voortgang"
            action={<Dumbbell size={15} className="text-gray-400" />}
          />
          {!s ? null : (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Trainingen deze week", value: s.thisWeekTrainDays },
                  { label: "Trainingen totaal", value: s.trainCount },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {s.avgScoreOnTrain > 0 && s.avgScoreOffTrain > 0 && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Score op trainingsdagen</span>
                    <span className="font-semibold">{round1(s.avgScoreOnTrain)}/5</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Score op rustdagen</span>
                    <span className="font-semibold">{round1(s.avgScoreOffTrain)}/5</span>
                  </div>
                </div>
              )}
              {s.thisWeekTr.length > s.lastWeekTr.length && (
                <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                  Je hebt deze week {s.thisWeekTr.length - s.lastWeekTr.length} training{s.thisWeekTr.length - s.lastWeekTr.length !== 1 ? "en" : ""} meer afgerond dan vorige week.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Medicatie analyse */}
        <Card>
          <CardHeader
            title="Medicatie"
            subtitle="Gebruik & trend"
            action={<Pill size={15} className="text-gray-400" />}
          />
          {!s ? null : s.medByName.length === 0 ? (
            <p className="text-sm text-gray-400 mt-2">Geen medicatie gelogd in deze periode.</p>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="space-y-3">
                {s.medByName.slice(0, 5).map(([naam, count]) => (
                  <div key={naam}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{naam}</span>
                      <span className="text-xs font-semibold text-gray-800">{count}×</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f0eb" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(count / s.maxMedCount) * 100}%`, background: "#f59e0b" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid #f3f0eb" }}>
                <TrendIcon trend={s.medTrendLabel} size={13} />
                <span className="text-xs text-gray-500">
                  Medicatiegebruik is{" "}
                  <span className="font-medium" style={{ color: trendColor(s.medTrendLabel) }}>
                    {s.medTrendLabel}
                  </span>{" "}
                  t.o.v. vorige periode
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Rij 6: Mijlpalen ────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Mijlpalen & voortgang"
          subtitle="Behaalde stappen in het hersteltraject"
          action={<Target size={15} className="text-gray-400" />}
        />
        {!s ? null : s.mijlpalenTotal === 0 ? (
          <p className="text-sm text-gray-400 mt-2">Nog geen mijlpalen ingesteld.</p>
        ) : (
          <div className="space-y-5 mt-3">
            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Totale voortgang</span>
                <span className="text-sm font-bold text-gray-800">
                  {s.done.length}/{s.mijlpalenTotal} behaald
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#f3f0eb" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.progress * 100}%`, background: "#e8632a" }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{Math.round(s.progress * 100)}% van de mijlpalen bereikt</p>
            </div>

            {/* Recently completed */}
            {s.recentDone.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent behaald</p>
                <div className="space-y-1.5">
                  {s.recentDone.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <CheckCircle2 size={14} style={{ color: "#e8632a", flexShrink: 0 }} />
                      <span className="text-sm text-gray-700 flex-1">{m.title}</span>
                      {m.completedAt && (
                        <span className="text-[10px] text-gray-400">{fmt(m.completedAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next milestone */}
            {s.nextMijl && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "#faf9f7", border: "1px solid #ece9e3" }}>
                <Circle size={14} style={{ color: "#d1cdc7", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Volgende mijlpaal</p>
                  <p className="text-sm font-medium text-gray-700 truncate">{s.nextMijl.title}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Rij 7: Wat valt op ──────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Wat valt op"
          subtitle="Observaties op basis van jouw data"
          action={<Lightbulb size={15} className="text-gray-400" />}
        />
        {!s || s.obs.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">Vul meer check-ins in voor slimme observaties.</p>
        ) : (
          <div className="space-y-3 mt-3">
            {s.obs.slice(0, 5).map((obs, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#e8632a" }} />
                <p className="text-sm text-gray-600 leading-relaxed">{obs}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] mt-5 pt-3" style={{ borderTop: "1px solid #f3f0eb", color: "#c4bfb7" }}>
          Deze observaties zijn informatief en vormen geen medisch advies.
        </p>
      </Card>

    </div>
  );
}
