"use client";

import { useMemo, useState } from "react";
import { Star, Sparkles, Search, Check, Building2 } from "lucide-react";
import { Input, Textarea, Select } from "@/components/ui/Field";
import {
  INJURY_CATEGORY_LABELS, assignProtocolToPatient, createCustomPatientProtocol,
  type PortalProtocolCard,
} from "@/lib/services/protocolService";
import type { ProtocolRecommendation } from "@/lib/intakeAnalysis";
import { PROTOCOL_REGION_LABELS, PROTOCOL_REGION_ORDER, protocolRegion, type ProtocolRegion } from "@/lib/protocolRegions";

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
      style={{ borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: selected ? "var(--brand-accent-soft, #fff3ee)" : "#ffffff" }}
    >
      {children}
    </div>
  );
}


type RegionFilter = "alle" | "praktijk" | ProtocolRegion;

/**
 * Bibliotheek doorzoeken: zoeken op naam of blessure, filteren op
 * lichaamsdeel of de eigen plannen van de praktijk, gegroepeerd per
 * lichaamsdeel. Vervangt een lange keuzelijst zonder structuur.
 */
function LibraryPicker({ protocols, selectedId, onPick }: { protocols: PortalProtocolCard[]; selectedId: string; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RegionFilter>("alle");

  const regionsPresent = useMemo(() => {
    const set = new Set(protocols.map((p) => protocolRegion(p.injuryCategory)));
    return PROTOCOL_REGION_ORDER.filter((r) => set.has(r));
  }, [protocols]);
  const hasOwn = protocols.some((p) => p.scope === "organization");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = protocols.filter((p) => {
      if (filter === "praktijk" && p.scope !== "organization") return false;
      if (filter !== "alle" && filter !== "praktijk" && protocolRegion(p.injuryCategory) !== filter) return false;
      if (!q) return true;
      const label = INJURY_CATEGORY_LABELS[p.injuryCategory] ?? "";
      return `${p.name} ${label} ${p.description ?? ""}`.toLowerCase().includes(q);
    });
    return PROTOCOL_REGION_ORDER
      .map((region) => ({
        region,
        items: matches
          .filter((p) => protocolRegion(p.injuryCategory) === region)
          .sort((a, b) => (a.scope === b.scope ? a.name.localeCompare(b.name, "nl") : a.scope === "organization" ? -1 : 1)),
      }))
      .filter((g) => g.items.length > 0);
  }, [protocols, query, filter]);

  const chip = (key: RegionFilter, label: React.ReactNode) => {
    const active = filter === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setFilter(key)}
        className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors"
        style={active
          ? { background: "var(--brand-accent, #e8632a)", borderColor: "var(--brand-accent, #e8632a)", color: "#ffffff" }
          : { background: "#ffffff", borderColor: "#e8e5df", color: "#4b5563" }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op naam of blessure, bijv. knie of enkel" style={{ paddingLeft: 40 }} aria-label="Zoek een herstelplan" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chip("alle", "Alle")}
        {hasOwn && chip("praktijk", <><Building2 size={12} /> Eigen praktijk</>)}
        {regionsPresent.map((r) => chip(r, PROTOCOL_REGION_LABELS[r]))}
      </div>
      <div className="rounded-xl border bg-white max-h-80 overflow-y-auto" style={{ borderColor: "#e8e5df" }}>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">Geen herstelplan gevonden. Probeer een ander woord of kies een eigen plan.</p>
        ) : groups.map((g) => (
          <div key={g.region}>
            <p className="sticky top-0 z-[1] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b" style={{ background: "#faf9f7", borderColor: "#f0ede8" }}>
              {PROTOCOL_REGION_LABELS[g.region]}
            </p>
            {g.items.map((p) => {
              const selected = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onPick(p.id)}
                  className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left border-b last:border-b-0 transition-colors hover:bg-gray-50"
                  style={{ borderColor: "#f0ede8", background: selected ? "var(--brand-accent-softer, #fef7f4)" : undefined }}
                >
                  <span className="mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                    style={selected ? { background: "var(--brand-accent, #e8632a)", borderColor: "var(--brand-accent, #e8632a)" } : { borderColor: "#d6d3cd" }}>
                    {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{p.name}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {INJURY_CATEGORY_LABELS[p.injuryCategory] ?? p.injuryCategory}
                      {p.phaseCount > 0 && ` · ${p.phaseCount} ${p.phaseCount === 1 ? "fase" : "fases"}`}
                    </span>
                  </span>
                  {p.scope === "organization" && (
                    <span className="shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: "var(--brand-accent-soft, #fdefea)", color: "var(--brand-accent-ink, #8a3a17)" }}>Eigen praktijk</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
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
  // De bibliotheek openen kiest nog niets; pas een klik op een plan telt.
  const [browsing, setBrowsing] = useState(false);
  const libraryOpen = browsing || !!selectedOther;
  const selectedOtherName = otherProtocols.find((p) => p.id === selectedOther)?.name;
  const pick = (v: PlanChoiceValue) => { setBrowsing(false); onChange(v); };

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
          onSelect={() => pick({ kind: "protocol", protocolId: rec.protocol.id })}
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
        <OptionCard selected={libraryOpen} onSelect={() => setBrowsing(true)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{recommendations.length > 0 ? "Ander herstelplan uit de bibliotheek" : "Herstelplan uit de bibliotheek"}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedOtherName ? <>Gekozen: <span className="font-medium text-gray-800">{selectedOtherName}</span></> : `${otherProtocols.length} plannen, te filteren op lichaamsdeel`}
              </p>
            </div>
          </div>
          {libraryOpen && (
            <div onClick={(e) => e.stopPropagation()}>
              <LibraryPicker protocols={otherProtocols} selectedId={selectedOther} onPick={(id) => onChange({ kind: "protocol", protocolId: id })} />
            </div>
          )}
        </OptionCard>
      )}

      <OptionCard selected={value.kind === "custom"} onSelect={() => pick({ kind: "custom" })}>
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

      <OptionCard selected={value.kind === "none"} onSelect={() => pick({ kind: "none" })}>
        <p className="text-sm text-gray-600">Nog geen herstelplan — later kiezen in het dossier</p>
      </OptionCard>
    </div>
  );
}
