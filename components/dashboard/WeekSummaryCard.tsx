"use client";

// Kleine kleurschaal voor de dagscore (1-5), zelfde als app/(app)/page.tsx —
// bewust lokaal gehouden, te klein om als gedeelde util de moeite waard te zijn.
const SCORE_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
function scoreColor(s: number) {
  return SCORE_COLORS[Math.min(5, Math.max(1, s))] ?? "#9ca3af";
}

interface WeekSummaryCardProps {
  /** Naam van de huidige protocolfase, alleen getoond als subtitel bij een actief protocol. */
  phaseName?: string | null;
  avgScore: number | null;
  avgPijn: number | null;
  trainingCompleted: number;
  trainingTotal: number;
}

function KpiRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-base font-semibold leading-none" style={{ color: valueColor ?? "#1a1a1a" }}>
        {value}
      </p>
    </div>
  );
}

/**
 * Compacte "Deze week"-kaart met de 3 belangrijkste weekcijfers van de
 * patiënt: gem. dagscore, trainingen, gem. pijnscore. Zelfde 3 KPI's voor
 * protocol- en niet-protocolpatiënten — alleen de bron van "trainingen"
 * verschilt (meegegeven door de caller), niet de weergave.
 */
export function WeekSummaryCard({ phaseName, avgScore, avgPijn, trainingCompleted, trainingTotal }: WeekSummaryCardProps) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1" style={{ color: "#ffffff" }}>
        Deze week{phaseName ? ` · ${phaseName}` : ""}
      </p>
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#ffffff" }}>
        <KpiRow
          label="Gem. dagscore"
          valueColor={avgScore !== null ? scoreColor(Math.round(avgScore)) : "#d1d5db"}
          value={avgScore !== null ? (
            <>{avgScore.toFixed(1)}<span className="text-xs font-normal ml-0.5 text-gray-400">/5</span></>
          ) : "n.v.t."}
        />
        <KpiRow
          label="Trainingen"
          value={<>{trainingCompleted}<span className="text-xs font-normal ml-0.5 text-gray-400">/{trainingTotal}</span></>}
        />
        <KpiRow
          label="Gem. pijnscore"
          value={avgPijn !== null ? (
            <>{avgPijn.toFixed(1)}<span className="text-xs font-normal ml-0.5 text-gray-400">/10</span></>
          ) : "n.v.t."}
        />
      </div>
    </div>
  );
}
