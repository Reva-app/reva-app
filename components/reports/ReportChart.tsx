"use client";

import { useId } from "react";
import type { ReportChart as ReportChartData } from "@/lib/reports/reports";

const COLORS = ["var(--brand-accent, #e8632a)", "#94a3b8"];
const fmt = (v: number) => v.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Legend({ chart }: { chart: ReportChartData }) {
  if (chart.series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
      {chart.series.map((s, i) => (
        <span key={s.name} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />{s.name}</span>
      ))}
    </div>
  );
}

function LineView({ chart, height }: { chart: ReportChartData; height: number }) {
  const gid = `rg-${useId().replace(/:/g, "")}`;
  const W = 720, H = height, padL = 40, padR = 8, padT = 10, padB = 28;
  const all = chart.series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const max = niceMax(Math.max(1, ...all));
  const n = chart.labels.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const step = Math.max(1, Math.ceil(n / 7));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label={chart.series.map((s) => s.name).join(", ")}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS[0]} stopOpacity="0.16" />
            <stop offset="100%" stopColor={COLORS[0]} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke="#f0ede8" />
            <text x={padL - 6} y={y(max * f) + 3} textAnchor="end" fontSize="13" fill="#9ca3af">{fmt(max * f)}</text>
          </g>
        ))}
        {chart.series.map((s, si) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => p !== null);
          if (pts.length === 0) return null;
          const line = pts.map((p) => `${p[0]},${p[1]}`).join(" ");
          return (
            <g key={s.name}>
              {si === 0 && pts.length > 1 && <path d={`M${pts[0][0]},${H - padB} ${pts.map((p) => `L${p[0]},${p[1]}`).join(" ")} L${pts[pts.length - 1][0]},${H - padB} Z`} fill={`url(#${gid})`} />}
              <polyline points={line} fill="none" stroke={COLORS[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {pts.length <= 31 && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={COLORS[si]} />)}
            </g>
          );
        })}
        {chart.labels.map((l, i) => (i % step === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="13" fill="#9ca3af">{l}</text>
        ))}
      </svg>
      <Legend chart={chart} />
    </div>
  );
}

function ColumnView({ chart, height }: { chart: ReportChartData; height: number }) {
  const all = chart.series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const max = niceMax(Math.max(1, ...all));
  const step = Math.max(1, Math.ceil(chart.labels.length / 8));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {chart.labels.map((l, i) => (
          <div key={i} className="flex-1 h-full flex items-end justify-center gap-0.5" title={`${l}: ${chart.series.map((s) => `${s.name} ${s.values[i] ?? 0}`).join(", ")}`}>
            {chart.series.map((s, si) => (
              <div key={s.name} className="w-full max-w-[18px] rounded-t" style={{ height: `${((s.values[i] ?? 0) / max) * 100}%`, minHeight: (s.values[i] ?? 0) > 0 ? 2 : 0, background: COLORS[si] }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5">
        {chart.labels.map((l, i) => <span key={i} className="flex-1 text-center text-[10px] text-gray-400 truncate">{i % step === 0 ? l : ""}</span>)}
      </div>
      <Legend chart={chart} />
    </div>
  );
}

function BarView({ chart }: { chart: ReportChartData }) {
  const all = chart.series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const max = Math.max(1, ...all);
  return (
    <div className="space-y-2.5">
      {chart.labels.map((l, i) => (
        <div key={i}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-700 truncate">{l}</span>
            <span className="text-gray-500 tabular-nums text-xs shrink-0">{chart.series.map((s) => (s.values[i] === null ? "—" : `${fmt(s.values[i]!)}${chart.unit ?? ""}`)).join(" → ")}</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {chart.series.map((s, si) => (
              <div key={s.name} className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f0eb" }}>
                <div className="h-full rounded-full" style={{ width: `${((s.values[i] ?? 0) / max) * 100}%`, background: COLORS[si] }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Legend chart={chart} />
    </div>
  );
}

export function ReportChart({ chart, height = 200 }: { chart: ReportChartData; height?: number }) {
  if (chart.labels.length === 0 || chart.series.every((s) => s.values.every((v) => v === null || v === 0))) {
    return <p className="text-sm text-gray-400 py-10 text-center">Geen gegevens voor deze periode</p>;
  }
  if (chart.kind === "line") return <LineView chart={chart} height={height} />;
  if (chart.vertical) return <ColumnView chart={chart} height={height} />;
  return <BarView chart={chart} />;
}
