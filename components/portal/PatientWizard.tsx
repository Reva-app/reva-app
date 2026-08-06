"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ChevronLeft, Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createAndInvitePortalPatient,
  type PortalPatientInput, type PortalLocationOption, type PortalMember,
} from "@/lib/services/portalService";
import { assignProtocolToPatient, type PortalProtocolCard } from "@/lib/services/protocolService";
import { createPatientIntake } from "@/lib/services/intakeService";
import { generateIntakeAnalysis, emptyIntakeInput, type IntakeInput, type SuggestedGoal, type VisitReason } from "@/lib/intakeAnalysis";
import { isValidEmail, BLESSURE_TYPEN } from "@/lib/data";
import { FieldLabel, inputStyle } from "./wizard/shared";
import { AanleidingStep } from "./wizard/AanleidingStep";
import { IntakeStep } from "./wizard/IntakeStep";
import { RevaAnalyseStep } from "./wizard/RevaAnalyseStep";

const STEPS = ["Basisgegevens", "Aanleiding", "Behandeltraject", "Intake", "REVA Analyse", "Uitnodiging"];

const emptyInput: PortalPatientInput = {
  firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", gender: "",
  locationId: null, therapistId: null, treatmentStartDate: "", surgeryDate: "",
  injuryDate: "", injuryType: "",
};

interface PatientWizardProps {
  organizationId: string;
  locations: PortalLocationOption[];
  members: PortalMember[];
  revaProtocols: PortalProtocolCard[];
  orgProtocols: PortalProtocolCard[];
  onDone: () => void;
  onClose: () => void;
}

export function PatientWizard({
  organizationId, locations, members, revaProtocols, orgProtocols, onDone, onClose,
}: PatientWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [input, setInput] = useState<PortalPatientInput>(emptyInput);
  const [intake, setIntake] = useState<IntakeInput>(emptyIntakeInput);
  const [stepError, setStepError] = useState("");

  // undefined = nog niet aangeraakt door de therapeut → volgt de AI-aanbeveling;
  // null = expliciet "geen herstelplan" gekozen.
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null | undefined>(undefined);
  const [summaryOverride, setSummaryOverride] = useState<string | null>(null);
  const [goalsOverride, setGoalsOverride] = useState<SuggestedGoal[] | null>(null);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const activeMembers = members.filter((m) => m.membershipStatus === "active");

  // De therapeut die de patiënt aanmaakt is standaard ook de behandelaar —
  // kan altijd handmatig aangepast worden, maar scheelt een klik in de
  // meest voorkomende situatie.
  useEffect(() => {
    if (user?.id && activeMembers.some((m) => m.userId === user.id)) {
      setInput((prev) => (prev.therapistId === null ? { ...prev, therapistId: user.id } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const availableRevaProtocols = useMemo(() => revaProtocols.filter((p) => !p.archived), [revaProtocols]);
  const availableOrgProtocols = useMemo(() => orgProtocols.filter((p) => !p.archived), [orgProtocols]);
  const allProtocols = useMemo(() => [...availableOrgProtocols, ...availableRevaProtocols], [availableOrgProtocols, availableRevaProtocols]);

  const analysis = useMemo(
    () => generateIntakeAnalysis({
      injuryType: input.injuryType, injuryDate: input.injuryDate, surgeryDate: input.surgeryDate,
      treatmentStartDate: input.treatmentStartDate, intake, availableProtocols: allProtocols,
    }),
    [input.injuryType, input.injuryDate, input.surgeryDate, input.treatmentStartDate, intake, allProtocols]
  );
  const summary = summaryOverride ?? analysis.summary;
  const goals = goalsOverride ?? analysis.suggestedGoals;
  const effectiveProtocolId = selectedProtocolId !== undefined ? selectedProtocolId : analysis.recommendation?.protocol.id ?? null;
  const protocolOptions = analysis.recommendation ? [analysis.recommendation, ...analysis.alternatives] : [];

  function update<K extends keyof PortalPatientInput>(key: K, value: PortalPatientInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function updateIntake<K extends keyof IntakeInput>(key: K, value: IntakeInput[K]) {
    setIntake((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (step === 0) {
      if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
        setStepError("Vul voornaam, achternaam en e-mailadres in");
        return;
      }
      if (!isValidEmail(input.email)) {
        setStepError("Vul een geldig e-mailadres in (bijv. naam@voorbeeld.nl)");
        return;
      }
    }
    if (step === 1) {
      if (!intake.visitReason) {
        setStepError("Kies waarvoor de patiënt komt");
        return;
      }
      if (intake.visitReason === "sports_injury" && !intake.sportType.trim()) {
        setStepError("Kies of vul de sport in");
        return;
      }
      if (!input.injuryType) {
        setStepError(intake.visitReason === "surgery" ? "Kies welke operatie" : "Kies waar de klacht zit");
        return;
      }
    }
    if (step === 2) {
      if (!input.injuryDate) {
        setStepError("Vul de datum van de blessure in");
        return;
      }
      if (intake.visitReason === "surgery" && !input.surgeryDate) {
        setStepError("Vul de operatiedatum in");
        return;
      }
    }
    setStepError("");
    setStep((s) => {
      const next = Math.min(s + 1, STEPS.length - 1);
      setMaxStepReached((m) => Math.max(m, next));
      return next;
    });
  }

  function goToStep(target: number) {
    if (target > maxStepReached) return;
    setStepError("");
    setStep(target);
  }

  function goBack() {
    setStepError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleInvite() {
    setSending(true);
    const res = await createAndInvitePortalPatient(organizationId, input);
    if (res.outcome !== "failed") {
      const reasoning = protocolOptions.find((r) => r.protocol.id === effectiveProtocolId)?.reasoning ?? null;
      await createPatientIntake(organizationId, res.patientId, user?.id ?? null, intake, {
        aiSummary: summary,
        attentionPoints: analysis.attentionPoints,
        recommendedProtocolId: effectiveProtocolId,
        recommendationReasoning: reasoning,
        stagedGoals: goals,
      });
      if (effectiveProtocolId) {
        await assignProtocolToPatient(res.patientId, effectiveProtocolId);
      }
    }
    setSending(false);
    if (res.outcome === "linked") {
      setResult({ ok: true, text: "Dossier aangemaakt en direct gekoppeld aan een bestaand account." });
    } else if (res.outcome === "invited") {
      setResult({ ok: true, text: "Dossier aangemaakt en uitnodiging verstuurd." });
    } else {
      setResult({ ok: false, text: res.error });
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <CardHeader title="Patiënt toevoegen" subtitle={`Stap ${step + 1} van ${STEPS.length}: ${STEPS[step]}`} />
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 -mt-1">
          <X size={18} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => {
          const reachable = i <= maxStepReached && !result && !sending;
          return (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(i)}
              disabled={!reachable}
              className="flex items-center gap-2 flex-1"
              style={{ cursor: reachable ? "pointer" : "default" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  background: i < step ? "#16a34a" : i === step ? "var(--brand-accent, #e8632a)" : "#e8e5df",
                  color: i <= step ? "#ffffff" : "#9ca3af",
                }}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: i === step ? "#1a1a1a" : "#9ca3af" }}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: "#e8e5df" }} />}
            </button>
          );
        })}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Voornaam</FieldLabel>
              <input type="text" value={input.firstName} onChange={(e) => update("firstName", e.target.value)}
                placeholder="Jan" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Achternaam</FieldLabel>
              <input type="text" value={input.lastName} onChange={(e) => update("lastName", e.target.value)}
                placeholder="Jansen" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>E-mailadres</FieldLabel>
              <input type="email" value={input.email} onChange={(e) => update("email", e.target.value)}
                placeholder="jan@voorbeeld.nl" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Telefoonnummer (optioneel)</FieldLabel>
              <input type="tel" value={input.phone} onChange={(e) => update("phone", e.target.value)}
                placeholder="06 12345678" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Geboortedatum (optioneel)</FieldLabel>
              <DatePicker value={input.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} placeholder="Kies een datum" />
            </div>
            <div>
              <FieldLabel>Geslacht (optioneel)</FieldLabel>
              <select value={input.gender} onChange={(e) => update("gender", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                <option value="">Niet opgegeven</option>
                <option value="man">Man</option>
                <option value="vrouw">Vrouw</option>
                <option value="anders">Anders</option>
              </select>
            </div>
            <div>
              <FieldLabel>Locatie (optioneel)</FieldLabel>
              <select value={input.locationId ?? ""} onChange={(e) => update("locationId", e.target.value || null)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                <option value="">Geen specifieke locatie</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Behandelend therapeut (optioneel)</FieldLabel>
              <select value={input.therapistId ?? ""} onChange={(e) => update("therapistId", e.target.value || null)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                <option value="">Nog niet toegewezen</option>
                {activeMembers.map((m) => <option key={m.userId} value={m.userId}>{m.fullName || m.email}</option>)}
              </select>
            </div>
          </div>
          {stepError && <p className="text-xs" style={{ color: "#dc2626" }}>{stepError}</p>}
        </div>
      )}

      {step === 1 && (
        <AanleidingStep
          visitReason={intake.visitReason}
          onVisitReasonChange={(r: VisitReason) => updateIntake("visitReason", r)}
          injuryType={input.injuryType}
          onInjuryTypeChange={(v) => update("injuryType", v)}
          sportType={intake.sportType}
          onSportTypeChange={(v) => updateIntake("sportType", v)}
          bodySide={intake.bodySide}
          onBodySideChange={(v) => updateIntake("bodySide", v)}
          error={stepError}
        />
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Datum blessure</FieldLabel>
              <DatePicker value={input.injuryDate} onChange={(v) => update("injuryDate", v)} placeholder="Kies een datum" />
              <p className="text-xs text-gray-400 mt-1.5">Komt automatisch terug in de instellingen van de patiënt zelf, en kan daar dan niet meer gewijzigd worden.</p>
            </div>
            {intake.visitReason === "surgery" && (
              <div>
                <FieldLabel>Operatiedatum</FieldLabel>
                <DatePicker value={input.surgeryDate} onChange={(v) => update("surgeryDate", v)} placeholder="Kies een datum" />
              </div>
            )}
          </div>
          {stepError && <p className="text-xs" style={{ color: "#dc2626" }}>{stepError}</p>}
        </div>
      )}

      {step === 3 && (
        <IntakeStep value={intake} onChange={updateIntake} injuryType={input.injuryType} />
      )}

      {step === 4 && (
        <RevaAnalyseStep
          analysis={analysis}
          summary={summary}
          onSummaryChange={setSummaryOverride}
          goals={goals}
          onGoalsChange={setGoalsOverride}
          selectedProtocolId={effectiveProtocolId}
          onSelectProtocol={setSelectedProtocolId}
        />
      )}

      {step === 5 && (
        <div className="space-y-4">
          {!result ? (
            <>
              <div className="rounded-xl p-4 text-sm space-y-1.5" style={{ background: "#f8f7f4" }}>
                <p><span className="text-gray-500">Naam:</span> <span className="font-medium">{input.firstName} {input.lastName}</span></p>
                <p><span className="text-gray-500">E-mail:</span> {input.email}</p>
                <p><span className="text-gray-500">Locatie:</span> {locations.find((l) => l.id === input.locationId)?.name ?? "Geen"}</p>
                <p><span className="text-gray-500">Behandelaar:</span> {activeMembers.find((m) => m.userId === input.therapistId)?.fullName ?? "Nog niet toegewezen"}</p>
                <p><span className="text-gray-500">Blessuretype:</span> {BLESSURE_TYPEN.find((b) => b.value === input.injuryType)?.label ?? "Nog niet bekend"}</p>
                <p><span className="text-gray-500">Herstelplan:</span> {allProtocols.find((p) => p.id === effectiveProtocolId)?.name ?? "Geen"}</p>
              </div>
              <p className="text-xs text-gray-500">
                Bij het versturen wordt het dossier aangemaakt en ontvangt de patiënt direct een uitnodiging op {input.email || "het opgegeven e-mailadres"}.
              </p>
              <Button type="button" disabled={sending} onClick={handleInvite}>
                {sending ? <Loader2 size={14} className="animate-spin" /> : "Uitnodiging versturen"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm" style={{ color: result.ok ? "#16a34a" : "#dc2626" }}>{result.text}</p>
              <Button type="button" onClick={onDone}>Klaar</Button>
            </>
          )}
        </div>
      )}

      {!result && (
        <div className="flex justify-between mt-6">
          <Button type="button" size="sm" variant="secondary" onClick={goBack} disabled={step === 0}>
            <ChevronLeft size={14} /> {step === 4 ? "Intake aanpassen" : "Vorige"}
          </Button>
          {step < STEPS.length - 1 && (
            <Button type="button" size="sm" onClick={goNext}>
              {step === 4 ? "🚀 Start herstelplan" : "Volgende"} {step !== 4 && <ChevronRight size={14} />}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
