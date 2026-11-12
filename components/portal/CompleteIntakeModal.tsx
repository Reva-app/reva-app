"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RevaAnalyseStep } from "@/components/portal/wizard/RevaAnalyseStep";
import { applyPlanChoice, defaultPlanChoice, DEFAULT_CUSTOM_PHASE, type PlanChoiceValue, type CustomPhaseInput } from "@/components/portal/wizard/PlanChoice";
import { generateIntakeAnalysis, type SuggestedGoal } from "@/lib/intakeAnalysis";
import { completeSubmittedIntake, type PortalPatientIntake } from "@/lib/services/intakeService";
import type { PortalProtocolCard } from "@/lib/services/protocolService";
import { formatDate } from "@/lib/data";

interface CompleteIntakeModalProps {
  patientId: string;
  patientName: string;
  intake: PortalPatientIntake;
  injuryType: string;
  injuryDate: string;
  surgeryDate: string;
  protocols: PortalProtocolCard[];
  onDone: () => void;
  onClose: () => void;
}

/**
 * De patiënt heeft de intake zelf ingevuld (migratie 137): de fysio bekijkt
 * de analyse, past samenvatting en doelen aan en kiest het herstelplan —
 * een plan uit de bibliotheek of een eigen eerste fase.
 */
export function CompleteIntakeModal({
  patientId, patientName, intake, injuryType, injuryDate, surgeryDate, protocols, onDone, onClose,
}: CompleteIntakeModalProps) {
  const available = useMemo(() => protocols.filter((p) => !p.archived), [protocols]);
  const analysis = useMemo(
    () => generateIntakeAnalysis({ injuryType, injuryDate, surgeryDate, intake: intake.input, availableProtocols: available }),
    [injuryType, injuryDate, surgeryDate, intake.input, available]
  );
  const [summary, setSummary] = useState<string | null>(null);
  const [goals, setGoals] = useState<SuggestedGoal[] | null>(null);
  const [choice, setChoice] = useState<PlanChoiceValue | undefined>(undefined);
  const [custom, setCustom] = useState<CustomPhaseInput>(DEFAULT_CUSTOM_PHASE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const planChoice = choice ?? defaultPlanChoice(analysis.recommendation);
  const recommendations = analysis.recommendation ? [analysis.recommendation, ...analysis.alternatives] : [];

  async function save() {
    if (planChoice.kind === "custom" && !custom.phaseName.trim()) { setError("Geef de eerste fase een naam"); return; }
    setSaving(true);
    setError("");
    const plan = await applyPlanChoice(patientId, planChoice, custom);
    if (plan.error) { setSaving(false); setError(plan.error); return; }
    const protocolId = planChoice.kind === "protocol" ? planChoice.protocolId : null;
    const done = await completeSubmittedIntake(intake.id, patientId, {
      aiSummary: summary ?? analysis.summary,
      attentionPoints: analysis.attentionPoints,
      recommendedProtocolId: protocolId,
      recommendationReasoning: recommendations.find((r) => r.protocol.id === protocolId)?.reasoning ?? null,
      stagedGoals: goals ?? analysis.suggestedGoals,
    });
    setSaving(false);
    if (done.error) { setError(done.error); return; }
    onDone();
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl" dismissOnBackdropClick={false}>
      <Card padding="none">
        <div className="p-5">
          <div className="flex items-start justify-between">
            <CardHeader
              title="Herstelplan kiezen"
              subtitle={`${patientName} vulde de intake in${intake.submittedAt ? ` op ${formatDate(intake.submittedAt)}` : ""}. Alle antwoorden staan in het logboek onder Intake.`}
            />
            <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-subtle hover:text-gray-600 shrink-0 -mt-1">
              <X size={18} />
            </button>
          </div>
          <RevaAnalyseStep
            analysis={analysis}
            summary={summary ?? analysis.summary}
            onSummaryChange={setSummary}
            goals={goals ?? analysis.suggestedGoals}
            onGoalsChange={setGoals}
            allProtocols={available}
            planChoice={planChoice}
            onPlanChoiceChange={setChoice}
            customPhase={custom}
            onCustomPhaseChange={setCustom}
          />
          {error && <p className="text-sm mt-3" role="alert" style={{ color: "#dc2626" }}>{error}</p>}
        </div>
        <div className="flex justify-end items-center gap-3 px-5 py-4 sticky bottom-0 sm:rounded-b-2xl" style={{ background: "#ffffff", borderTop: "1px solid #e8e5df" }}>
          <Button size="sm" variant="secondary" onClick={onClose} disabled={saving}>Annuleren</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : "Opslaan en starten"}
          </Button>
        </div>
      </Card>
    </Modal>
  );
}
