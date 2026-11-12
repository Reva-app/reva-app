"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { loadInsightStats, INSIGHT_RULE_LABELS, type InsightRuleStat } from "@/lib/services/insightFeedbackService";

/**
 * Wat doet het team met REVA-voorstellen? Per soort voorstel: toegepast,
 * bekeken of genegeerd. Zo zie je welke voorstellen waardevol zijn.
 */
export function InsightStatsCard({ organizationId, days }: { organizationId: string; days: number }) {
  const [rows, setRows] = useState<InsightRuleStat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadInsightStats(organizationId, days).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [organizationId, days]);

  const total = rows?.reduce((s, r) => s + r.applied + r.dismissed + r.opened, 0) ?? 0;

  return (
    <Card>
      <CardHeader
        title="REVA-voorstellen"
        subtitle={`Wat het team met de voorstellen deed (laatste ${days} dagen)`}
        action={<Sparkles size={16} style={{ color: "var(--brand-accent, #e8632a)" }} />}
      />
      {rows === null ? (
        <p className="text-sm text-subtle">Laden…</p>
      ) : total === 0 ? (
        <p className="text-sm text-subtle">Nog geen reacties op voorstellen in deze periode.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const n = r.applied + r.dismissed + r.opened;
            const useful = r.applied + r.opened;
            const pct = Math.round((useful / n) * 100);
            return (
              <div key={r.rule}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-800 truncate">{INSIGHT_RULE_LABELS[r.rule] ?? r.rule}</span>
                  <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                    {r.applied} toegepast · {r.opened} bekeken · {r.dismissed} genegeerd
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full overflow-hidden flex" style={{ background: "#efece6" }} title={`${pct}% opgevolgd`}>
                  <div style={{ width: `${(r.applied / n) * 100}%`, background: "var(--brand-accent, #e8632a)" }} />
                  <div style={{ width: `${(r.opened / n) * 100}%`, background: "var(--brand-accent-border, #f8d0bf)" }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-subtle pt-1">Vaak genegeerde voorstellen zijn kandidaten om slimmer of minder vaak te tonen.</p>
        </div>
      )}
    </Card>
  );
}
