"use client";

import { useEffect, useState } from "react";
import { Gauge, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { LineChart } from "@/components/ui/Charts";
import { loadPatientTests, formatTestValue, headlineValue, lsi, type PatientTest } from "@/lib/services/testService";
import { formatDate, formatDateShort } from "@/lib/data";

/**
 * Testen die de fysio bij de patiënt afnam, in gewone taal: waar je begon,
 * waar je nu staat en hoeveel je bent vooruitgegaan. Alleen lezen.
 */
export function MyTests({ patientId }: { patientId: string }) {
  const [tests, setTests] = useState<PatientTest[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPatientTests(patientId).then((t) => { if (!cancelled) setTests(t.filter((x) => x.results.length > 0)); });
    return () => { cancelled = true; };
  }, [patientId]);

  if (!tests || tests.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Jouw testen"
        subtitle="Metingen van je fysiotherapeut. Zo zie je zwart op wit hoe ver je al bent."
        action={<Gauge size={16} className="text-gray-400" />}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tests.map((t) => {
          const first = t.results[0];
          const last = t.results[t.results.length - 1];
          const fv = headlineValue(t, first);
          const lv = headlineValue(t, last);
          const delta = t.results.length >= 2 && fv !== null && lv !== null ? lv - fv : null;
          const better = delta !== null && delta !== 0 ? (t.higherIsBetter ? delta > 0 : delta < 0) : null;
          const sym = lsi(t, last);
          const series = t.results.map((r) => headlineValue(t, r)).filter((x): x is number => x !== null);
          const reached = t.targetValue !== null && lv !== null && (t.higherIsBetter ? lv >= t.targetValue : lv <= t.targetValue);
          return (
            <div key={t.id} className="rounded-2xl border p-4" style={{ borderColor: "#ece9e3" }}>
              <p className="text-sm font-semibold text-gray-900">{t.name}</p>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-2xl font-bold tracking-tight text-gray-900 tabular-nums">{formatTestValue(lv, t.unit)}</p>
                {delta !== null && better !== null && (
                  <span className="mb-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5" style={better ? { background: "#dcfce7", color: "#15803d" } : { background: "#f3f4f6", color: "#4b5563" }}>
                    {better ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {better ? "Vooruit" : "Iets terug"}: {delta > 0 ? "+" : ""}{formatTestValue(delta, t.unit)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.results.length >= 2
                  ? `Begonnen op ${formatTestValue(fv, t.unit)} (${formatDateShort(first.measuredOn)}), laatst gemeten ${formatDate(last.measuredOn)}`
                  : `Gemeten op ${formatDate(last.measuredOn)}. Na de volgende meting zie je je vooruitgang.`}
              </p>
              {sym !== null && (
                <p className="text-xs mt-2 text-gray-700">
                  Je {t.involvedSide === "left" ? "linker" : "rechter"} kant haalt <span className="font-semibold">{Math.round(sym)}%</span> van je andere kant
                  {sym >= 90 ? ". Dat is bijna gelijk!" : "."}
                </p>
              )}
              {t.targetValue !== null && (
                <p className="text-xs mt-1.5 inline-flex items-center gap-1" style={{ color: reached ? "#15803d" : "#6b7280" }}>
                  <Target size={12} /> Doel: {formatTestValue(t.targetValue, t.unit)}{reached ? ", behaald!" : ""}
                </p>
              )}
              {series.length >= 2 && (
                <div className="mt-2">
                  <LineChart data={series} dates={t.results.filter((r) => headlineValue(t, r) !== null).map((r) => r.measuredOn)} color="var(--brand-accent, #e8632a)" max={Math.max(...series, t.targetValue ?? 0) * 1.1} height={60} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
