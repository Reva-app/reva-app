"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type Period = 7 | 14 | 30;
export type Trend = "stijgend" | "dalend" | "stabiel";

function fmt(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", opts ?? { day: "numeric", month: "short" });
}

function round1(n: number): string {
  return n.toFixed(1);
}

export function LineChart({
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
  const safeMax = max > 0 ? max : 1;

  const pts = data.map((v, i) => ({
    x: padX + i * xStep,
    y: padY + (1 - Math.min(v, safeMax) / safeMax) * (H - padY * 2),
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${H} ` + pts.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${H} Z`;

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
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
      </svg>
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

export function TrendIcon({ trend, size = 14 }: { trend: Trend; size?: number }) {
  if (trend === "stijgend") return <TrendingUp size={size} style={{ color: "#16a34a" }} />;
  if (trend === "dalend")   return <TrendingDown size={size} style={{ color: "#ef4444" }} />;
  return <Minus size={size} style={{ color: "#9ca3af" }} />;
}

export function trendColor(trend: Trend): string {
  if (trend === "stijgend") return "#16a34a";
  if (trend === "dalend")   return "#ef4444";
  return "#9ca3af";
}

export function Bar({ label, value, max, color = "#e8632a", sublabel, format = round1 }: {
  label: string; value: number; max: number; color?: string; sublabel?: string; format?: (value: number) => string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600">{label}</span>
        <div className="flex items-center gap-1.5">
          {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
          <span className="text-xs font-semibold text-gray-800">{format(value)}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f0eb" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function Delta({ curr, prev, higherIsBetter = true, unit = "" }: {
  curr: number; prev: number; higherIsBetter?: boolean; unit?: string;
}) {
  const diff = curr - prev;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 0.05;
  const color = neutral ? "#9ca3af" : good ? "#16a34a" : "#ef4444";
  const sign = diff > 0 ? "+" : "";
  return (
    <span className="text-xs font-semibold" style={{ color }}>
      {neutral ? "n.v.t." : `${sign}${round1(diff)}${unit}`}
    </span>
  );
}

/**
 * Kleine dag-dichtheidsindicator voor kalendercellen: één stip per bron met
 * activiteit op die dag (check-in, training, medicatie). Afspraken hebben al
 * hun eigen kleur-per-type stippen/chips elders in de cel; deze indicator is
 * puur voor de drie overige bronnen.
 */
export function DayActivityDots({ hasCheckIn, hasTraining, hasMedicatie }: {
  hasCheckIn: boolean;
  hasTraining: boolean;
  hasMedicatie: boolean;
}) {
  const dots = [
    hasCheckIn && { key: "checkin", color: "#e8632a" },
    hasTraining && { key: "training", color: "#16a34a" },
    hasMedicatie && { key: "medicatie", color: "#7c3aed" },
  ].filter(Boolean) as { key: string; color: string }[];

  if (dots.length === 0) return null;

  return (
    <div className="flex gap-0.5">
      {dots.map((d) => (
        <span key={d.key} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} />
      ))}
    </div>
  );
}

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: "#f3f0eb" }}>
      {([7, 14, 30] as Period[]).map((p) => (
        <button
          key={p}
          type="button"
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
