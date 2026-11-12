"use client";

import { Star, Sparkles } from "lucide-react";
import { Input, Textarea, Select } from "@/components/ui/Field";
import {
  INJURY_CATEGORY_LABELS, assignProtocolToPatient, createCustomPatientProtocol,
  type PortalProtocolCard,
} from "@/lib/services/protocolService";
import type { ProtocolRecommendation } from "@/lib/intakeAnalysis";

/** Wat de fysio kiest als start van het herstel. */
export type PlanChoiceValue =
  | { kind: "protocol"; protocolId: string }
  | { kind: "custom" }
  | { kind: "none" };

export interface CustomPhaseInput {
  planName: string;
  phaseName: string;
  phaseDescription: string;
  frequencyPerWeek: number;
}

export const DEFAULT_CUSTOM_PHASE: CustomPhaseInput = {
  planName: "",
  phaseName: "Fase 1: Opstart",
  phaseDescription: "",
  frequencyPerWeek: 3,
};

/** Standaardkeuze: de aanbeveling, of — als er geen passend plan is (bv. "Anders") — een eigen eerste fase. */
export function defaultPlanChoice(recommendation: ProtocolRecommendation | null): PlanChoiceValue {
  return recommendation ? { kind: "protocol", protocolId: recommendation.protocol.id } : { kind: "custom" };
}

/** Voert de keuze uit voor een (net aangemaakte) patiënt. */
export async function applyPlanChoice(
  patientId: string, choice: PlanChoiceValue, custom: CustomPhaseInput
): Promise<{ error: string | null }> {
  if (choice.kind === "protocol") return assignProtocolToPatient(patientId, choice.protocolId);
  if (choice.kind === "custom") {
    return createCustomPatientProtocol(patientId, {
      planName: custom.planName, phaseName: custom.phaseName,
      phaseDescription: custom.phaseDescription, frequencyPerWeek: custom.frequencyPerWeek,
    });
  }
  return { error: null };
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" style={{ color: "var(--brand-accent, #e8632a)" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} fill={i < count ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function OptionCard({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className="w-full text-left rounded-xl border p-3 transition-colors cursor-pointer"
      style={{ borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: selected ? "#fff3ee" : "#ffffff" }}
    >
      {children}
    </div>
  );
}

interface PlanChoiceSectionProps {
  recommendations: ProtocolRecommendation[];
  allProtocols: PortalProtocolCard[];
  value: PlanChoiceValue;
  onChange: (v: PlanChoiceValue) => void;
  custom: CustomPhaseInput;
  onCustomChange: (v: CustomPhaseInput) => void;
}

export function PlanChoiceSection({ recommendations, allProtocols, value, onChange, custom, onCustomChange }: PlanChoiceSectionProps) {
  const recommendedIds = new Set(recommendations.map((r) => r.protocol.id));
  const otherProtocols = allProtocols.filter((p) => !recommendedIds.has(p.id));
  const selectedOther = value.kind === "protocol" && !recommendedIds.has(value.protocolId) ? value.protocolId : "";

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Herstelplan">
      {recommendations.length === 0 && (
        <p className="text-sm rounded-xl p-3.5" style={{ background: "#f8f7f4", color: "#6b7280" }}>
          Er is geen herstelplan dat precies past. Begin met een eigen eerste fase, of kies een plan uit de bibliotheek.
        </p>
      )}

      {recommendations.map((rec) => (
        <OptionCard
          key={rec.protocol.id}
          selected={value.kind === "protocol" && value.protocolId === rec.protocol.id}
          onSelect={() => onChange({ kind: "protocol", protocolId: rec.protocol.id })}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{rec.protocol.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{INJURY_CATEGORY_LABELS[rec.protocol.injuryCategory] ?? rec.protocol.injuryCategory}</p>
            </div>
            <Stars count={rec.stars} />
          </div>
          <p className="text-xs text-gray-600 mt-2">{rec.reasoning}</p>
        </OptionCard>
      ))}

      {otherProtocols.length > 0 && (
        <OptionCard selected={!!selectedOther} onSelect={() => { if (!selectedOther && otherProtocols[0]) onChange({ kind: "protocol", protocolId: otherProtocols[0].id }); }}>
          <p className="text-sm font-semibold text-gray-900">Ander herstelplan uit de bibliotheek</p>
          {selectedOther && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <Select value={selectedOther} onChange={(e) => onChange({ kind: "protocol", protocolId: e.target.value })}>
                {otherProtocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
          )}
        </OptionCard>
      )}

      <OptionCard selected={value.kind === "custom"} onSelect={() => onChange({ kind: "custom" })}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--brand-accent, #e8632a)" }} />
          <p className="text-sm font-semibold text-gray-900">Eigen plan voor deze patiënt</p>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Begin met een eerste fase; volgende fases voeg je later toe in het dossier.</p>
        {value.kind === "custom" && (
          <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Naam van de eerste fase</p>
                <Input value={custom.phaseName} onChange={(e) => onCustomChange({ ...custom, phaseName: e.target.value })} placeholder="Fase 1: Opstart" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Oefenen per week</p>
                <Select value={custom.frequencyPerWeek} onChange={(e) => onCustomChange({ ...custom, frequencyPerWeek: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7, 14].map((n) => <option key={n} value={n}>{n === 14 ? "2× per dag" : `${n}× per week`}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Doel van deze fase (optioneel)</p>
              <Textarea rows={2} value={custom.phaseDescription} onChange={(e) => onCustomChange({ ...custom, phaseDescription: e.target.value })} placeholder="Bijv. pijn en zwelling onder controle, rustig mobiliseren" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Naam van het plan (optioneel)</p>
              <Input value={custom.planName} onChange={(e) => onCustomChange({ ...custom, planName: e.target.value })} placeholder="Eigen herstelplan" />
            </div>
            <p className="text-xs text-subtle">Oefeningen voeg je na het aanmaken toe in het dossier van de patiënt.</p>
          </div>
        )}
      </OptionCard>

      <OptionCard selected={value.kind === "none"} onSelect={() => onChange({ kind: "none" })}>
        <p className="text-sm text-gray-600">Nog geen herstelplan — later kiezen in het dossier</p>
      </OptionCard>
    </div>
  );
}
