"use client";

import { useMemo } from "react";
import { ClipboardList, AlertTriangle, Info, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InsightBadge } from "@/components/insights/InsightCard";
import { generateIntakeAnalysis } from "@/lib/intakeAnalysis";
import type { PortalPatientIntake } from "@/lib/services/intakeService";
import type { PortalProtocolCard } from "@/lib/services/protocolService";
import { formatDate } from "@/lib/data";

/**
 * Zelf ingevulde intake op het overzicht: meteen de samenvatting,
 * aandachtspunten en het passende herstelplan, zodat de fysio in één
 * oogopslag weet waar het over gaat. Kiezen gebeurt in het venster erna.
 */
export function IntakeInsight({ intake, injuryType, injuryDate, surgeryDate, protocols, onChoose }: {
  intake: PortalPatientIntake;
  injuryType: string;
  injuryDate: string;
  surgeryDate: string;
  protocols: PortalProtocolCard[];
  onChoose: () => void;
}) {
  const analysis = useMemo(
    () => generateIntakeAnalysis({ injuryType, injuryDate, surgeryDate, intake: intake.input, availableProtocols: protocols.filter((p) => !p.archived) }),
    [injuryType, injuryDate, surgeryDate, intake.input, protocols]
  );
  const points = [...analysis.attentionPoints].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1)).slice(0, 4);
  const rec = analysis.recommendation;

  return (
    <div className="rounded-3xl border p-5 sm:p-6" style={{ background: "var(--brand-accent-softer, #fef7f4)", borderColor: "var(--brand-accent-border, #f6d3c2)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-accent, #e8632a)" }}>
            <ClipboardList size={17} color="#ffffff" />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Intake ingevuld door de patiënt</p>
            <p className="text-xs text-gray-500">{intake.submittedAt ? `Op ${formatDate(intake.submittedAt)}` : "Wacht op jouw herstelplan"}</p>
          </div>
        </div>
        <InsightBadge />
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mt-4">{analysis.summary}</p>

      {points.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: p.severity === "warning" ? "#b45309" : "#4b5563" }}>
              {p.severity === "warning" ? <AlertTriangle size={13} className="shrink-0 mt-px" /> : <Info size={13} className="shrink-0 mt-px" />}
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl bg-white border p-3.5 flex items-center gap-3 flex-wrap" style={{ borderColor: "#efe7e1" }}>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Voorgesteld herstelplan</p>
          {rec ? (
            <>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 inline-flex items-center gap-2">
                {rec.protocol.name}
                <span className="inline-flex gap-0.5" style={{ color: "var(--brand-accent, #e8632a)" }}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} fill={i < rec.stars ? "currentColor" : "none"} strokeWidth={1.5} />)}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{rec.reasoning}</p>
            </>
          ) : (
            <p className="text-sm text-gray-700 mt-0.5">Geen plan dat precies past: begin met een eigen eerste fase of kies uit de bibliotheek.</p>
          )}
        </div>
        <Button size="sm" onClick={onChoose}>Herstelplan kiezen</Button>
      </div>
    </div>
  );
}
