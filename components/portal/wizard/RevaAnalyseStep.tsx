"use client";

import { useState } from "react";
import { Plus, Trash2, Bot } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DatePicker } from "@/components/ui/DatePicker";
import type { PortalProtocolCard } from "@/lib/services/protocolService";
import type { IntakeAnalysis, SuggestedGoal } from "@/lib/intakeAnalysis";
import { PlanChoiceSection, type PlanChoiceValue, type CustomPhaseInput } from "./PlanChoice";
import { inputStyle, GOAL_ICON_OPTIONS } from "./shared";

interface RevaAnalyseStepProps {
  analysis: IntakeAnalysis;
  summary: string;
  onSummaryChange: (v: string) => void;
  goals: SuggestedGoal[];
  onGoalsChange: (goals: SuggestedGoal[]) => void;
  allProtocols: PortalProtocolCard[];
  planChoice: PlanChoiceValue;
  onPlanChoiceChange: (v: PlanChoiceValue) => void;
  customPhase: CustomPhaseInput;
  onCustomPhaseChange: (v: CustomPhaseInput) => void;
}

export function RevaAnalyseStep({
  analysis, summary, onSummaryChange, goals, onGoalsChange,
  allProtocols, planChoice, onPlanChoiceChange, customPhase, onCustomPhaseChange,
}: RevaAnalyseStepProps) {
  const [editingSummary, setEditingSummary] = useState(false);
  const allOptions = analysis.recommendation ? [analysis.recommendation, ...analysis.alternatives] : [];

  function updateGoal(index: number, patch: Partial<SuggestedGoal>) {
    onGoalsChange(goals.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }
  function removeGoal(index: number) {
    onGoalsChange(goals.filter((_, i) => i !== index));
  }
  function addGoal() {
    onGoalsChange([...goals, { icon: "🎯", title: "", description: "", targetDate: "" }]);
  }

  return (
    <div className="space-y-6">
      {/* 1. AI Samenvatting */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Bot size={14} style={{ color: "var(--brand-accent, #e8632a)" }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#b5b0a8" }}>REVA Analyse — Samenvatting</h3>
        </div>
        {editingSummary ? (
          <textarea
            value={summary} onChange={(e) => onSummaryChange(e.target.value)} rows={4} autoFocus
            onBlur={() => setEditingSummary(false)}
            className="w-full text-base sm:text-sm rounded-xl border px-3 py-2.5 focus:outline-none resize-none" style={inputStyle}
          />
        ) : (
          <button type="button" onClick={() => setEditingSummary(true)} className="w-full text-left rounded-xl p-3.5 text-sm leading-relaxed text-gray-700" style={{ background: "#f8f7f4" }}>
            {summary}
            <span className="block text-xs mt-2" style={{ color: "var(--brand-accent, #e8632a)" }}>Bewerken</span>
          </button>
        )}
      </div>

      {/* 2. Aandachtspunten */}
      {analysis.attentionPoints.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#b5b0a8" }}>Belangrijkste aandachtspunten</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.attentionPoints.map((p) => (
              <Badge key={p.label} variant={p.severity === "warning" ? "warning" : "muted"}>⚠️ {p.label}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* 3. Hersteldoelen */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#b5b0a8" }}>Hersteldoelen</h3>
        <div className="space-y-2">
          {goals.map((goal, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border p-2.5" style={{ borderColor: "#e8e5df" }}>
              <select
                value={goal.icon} onChange={(e) => updateGoal(i, { icon: e.target.value })}
                className="text-lg rounded-lg border px-1.5 py-1 focus:outline-none shrink-0" style={inputStyle}
              >
                {GOAL_ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  type="text" value={goal.title} onChange={(e) => updateGoal(i, { title: e.target.value })}
                  placeholder="Titel van het doel" className="w-full text-base sm:text-sm font-medium rounded-lg border px-2.5 py-1.5 focus:outline-none min-h-11 sm:min-h-0" style={inputStyle}
                />
                <input
                  type="text" value={goal.description} onChange={(e) => updateGoal(i, { description: e.target.value })}
                  placeholder="Omschrijving (optioneel)" className="w-full text-base sm:text-xs rounded-lg border px-2.5 py-1.5 focus:outline-none" style={inputStyle}
                />
                <DatePicker value={goal.targetDate} onChange={(v) => updateGoal(i, { targetDate: v })} placeholder="Streefdatum (optioneel)" />
              </div>
              <button type="button" onClick={() => removeGoal(i)} className="shrink-0 text-subtle hover:text-red-500 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addGoal} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
            <Plus size={13} /> Doel toevoegen
          </button>
        </div>
      </div>

      {/* 4. Aanbevolen herstelplan */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#b5b0a8" }}>Herstelplan</h3>
        <PlanChoiceSection
          recommendations={allOptions}
          allProtocols={allProtocols}
          value={planChoice}
          onChange={onPlanChoiceChange}
          custom={customPhase}
          onCustomChange={onCustomPhaseChange}
        />
      </div>

      {/* 5. Controle vóór activatie */}
      <div className="rounded-xl p-3.5 text-xs space-y-1" style={{ background: "#f8f7f4" }}>
        <p className="text-gray-500">✓ Intake compleet &nbsp;·&nbsp; ✓ Samenvatting gecontroleerd &nbsp;·&nbsp; ✓ Doelen gecontroleerd &nbsp;·&nbsp; {planChoice.kind !== "none" ? "✓" : "—"} Herstelplan gekozen</p>
      </div>
    </div>
  );
}
