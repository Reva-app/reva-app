import { Check, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { WeeklyExpectation } from "@/lib/regionContent";

interface ThisWeekExpectCardProps {
  expectation: WeeklyExpectation;
}

/**
 * "Deze week kun je verwachten"-kaart. Bewust generiek per lichaamsregio
 * (zie lib/regionContent.ts), niet per protocol: er is geen per-week
 * geauteurde content per herstelplan. De disclaimer maakt dat expliciet,
 * zelfde toon als de andere disclaimers op dit dashboard.
 */
export function ThisWeekExpectCard({ expectation }: ThisWeekExpectCardProps) {
  return (
    <Card>
      <CardHeader title="Deze week kun je verwachten" />
      <div className="space-y-2 mb-4">
        {expectation.verwacht.map((v) => (
          <div key={v} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#f0fdf4" }}>
              <Check size={10} style={{ color: "#16a34a" }} strokeWidth={3} />
            </div>
            <p className="text-xs text-gray-700 leading-snug">{v}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Normale klachten</p>
      <div className="space-y-2 mb-4">
        {expectation.normale.map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#e8632a" }} />
            <p className="text-xs text-gray-600 leading-snug">{n}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-1.5">
        <Info size={11} className="mt-0.5 shrink-0" style={{ color: "#c4bfb7" }} />
        <p className="text-[10px] leading-relaxed" style={{ color: "#c4bfb7" }}>
          Een algemene indicatie op basis van je aandoening, geen persoonlijk medisch advies. Bij twijfel neem je contact op met je behandelaar.
        </p>
      </div>
    </Card>
  );
}
