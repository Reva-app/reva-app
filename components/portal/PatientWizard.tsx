"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ChevronLeft, Loader2, X, ClipboardEdit, Send } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createAndInvitePortalPatient,
  type PortalPatientInput, type PortalLocationOption, type PortalMember,
} from "@/lib/services/portalService";
import type { PortalProtocolCard } from "@/lib/services/protocolService";
import { createPatientIntake, requestPatientIntake } from "@/lib/services/intakeService";
import { generateIntakeAnalysis, emptyIntakeInput, type IntakeInput, type SuggestedGoal, type VisitReason } from "@/lib/intakeAnalysis";
import { isValidEmail, BLESSURE_TYPEN } from "@/lib/data";
import { FieldLabel } from "./wizard/shared";
import { AanleidingStep } from "./wizard/AanleidingStep";
import { IntakeStep } from "./wizard/IntakeStep";
import { RevaAnalyseStep } from "./wizard/RevaAnalyseStep";
import { applyPlanChoice, defaultPlanChoice, DEFAULT_CUSTOM_PHASE, type PlanChoiceValue, type CustomPhaseInput } from "./wizard/PlanChoice";

type IntakeMode = "therapist" | "patient";
const THERAPIST_STEPS = ["Basisgegevens", "Aanleiding", "Behandeltraject", "Intake", "REVA Analyse", "Uitnodiging"] as const;
const PATIENT_STEPS = ["Basisgegevens", "Uitnodiging"] as const;
type StepName = (typeof THERAPIST_STEPS)[number];

const emptyInput: PortalPatientInput = {
  firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", gender: "",
  locationId: null, therapistId: null, surgeryDate: "",
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
  const [intakeMode, setIntakeMode] = useState<IntakeMode>("therapist");
  const STEPS: readonly StepName[] = intakeMode === "patient" ? PATIENT_STEPS : THERAPIST_STEPS;
  const current = STEPS[Math.min(step, STEPS.length - 1)];

  // undefined = nog niet aangeraakt door de therapeut → volgt de aanbeveling
  // (of een eigen eerste fase als er geen passend plan is).
  const [planChoiceOverride, setPlanChoiceOverride] = useState<PlanChoiceValue | undefined>(undefined);
  const [customPhase, setCustomPhase] = useState<CustomPhaseInput>(DEFAULT_CUSTOM_PHASE);
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
      intake, availableProtocols: allProtocols,
    }),
    [input.injuryType, input.injuryDate, input.surgeryDate, intake, allProtocols]
  );
  const summary = summaryOverride ?? analysis.summary;
  const goals = goalsOverride ?? analysis.suggestedGoals;
  const planChoice = planChoiceOverride ?? defaultPlanChoice(analysis.recommendation);
  const effectiveProtocolId = planChoice.kind === "protocol" ? planChoice.protocolId : null;
  const protocolOptions = analysis.recommendation ? [analysis.recommendation, ...analysis.alternatives] : [];

  function update<K extends keyof PortalPatientInput>(key: K, value: PortalPatientInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function updateIntake<K extends keyof IntakeInput>(key: K, value: IntakeInput[K]) {
    setIntake((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (current === "Basisgegevens") {
      if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
        setStepError("Vul voornaam, achternaam en e-mailadres in");
        return;
      }
      if (!isValidEmail(input.email)) {
        setStepError("Vul een geldig e-mailadres in (bijv. naam@voorbeeld.nl)");
        return;
      }
    }
    if (current === "Aanleiding") {
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
    if (current === "Behandeltraject") {
      if (!input.injuryDate) {
        setStepError("Vul de datum van de blessure in");
        return;
      }
      if (intake.visitReason === "surgery" && !input.surgeryDate) {
        setStepError("Vul de operatiedatum in");
        return;
      }
    }
    if (current === "REVA Analyse" && planChoice.kind === "custom" && !customPhase.phaseName.trim()) {
      setStepError("Geef de eerste fase een naam");
      return;
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
    const res = await createAndInvitePortalPatient(
      organizationId, input,
      intakeMode === "patient" ? (patientId) => requestPatientIntake(organizationId, patientId, user?.id ?? null) : undefined
    );
    if (res.outcome !== "failed" && intakeMode !== "patient") {
      const reasoning = protocolOptions.find((r) => r.protocol.id === effectiveProtocolId)?.reasoning ?? null;
      await createPatientIntake(organizationId, res.patientId, user?.id ?? null, intake, {
        aiSummary: summary,
        attentionPoints: analysis.attentionPoints,
        recommendedProtocolId: effectiveProtocolId,
        recommendationReasoning: reasoning,
        stagedGoals: goals,
      });
      const planResult = await applyPlanChoice(res.patientId, planChoice, customPhase);
      if (planResult.error) {
        setSending(false);
        setResult({ ok: false, text: `Dossier aangemaakt en uitnodiging verstuurd, maar het herstelplan kon niet worden aangemaakt: ${planResult.error} Kies het herstelplan in het dossier.` });
        return;
      }
    }
    setSending(false);
    if (res.outcome === "linked") {
      setResult({ ok: true, text: intakeMode === "patient"
        ? "Dossier aangemaakt en gekoppeld aan het bestaande REVA-account van deze patiënt. Bij de volgende keer inloggen vult de patiënt de intake in."
        : "Dossier aangemaakt en gekoppeld aan het bestaande REVA-account van deze patiënt. We hebben een e-mail gestuurd dat het dossier klaarstaat." });
    } else if (res.outcome === "invited") {
      setResult({ ok: true, text: intakeMode === "patient"
        ? "Dossier aangemaakt en uitnodiging verstuurd. Na het inloggen vult de patiënt de intake in; daarna zie je de patiënt bij \"Aandacht nodig\" om het herstelplan te kiezen."
        : "Dossier aangemaakt en uitnodiging verstuurd." });
    } else {
      setResult({ ok: false, text: res.error });
    }
  }

  return (
    <Card padding="none">
      <div className="p-5">
      <div className="flex items-start justify-between">
        <CardHeader title="Patiënt toevoegen" subtitle={`Stap ${step + 1} van ${STEPS.length}: ${current}`} />
        <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-subtle hover:text-gray-600 shrink-0 -mt-1">
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
                  color: i <= step ? "#ffffff" : "#6b7280",
                }}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: i === step ? "#1a1a1a" : "#6b7280" }}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: "#e8e5df" }} />}
            </button>
          );
        })}
      </div>

      {current === "Basisgegevens" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Voornaam">
              <Input value={input.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Jan" autoComplete="off" />
            </Field>
            <Field label="Achternaam">
              <Input value={input.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Jansen" autoComplete="off" />
            </Field>
            <Field label="E-mailadres">
              <Input type="email" value={input.email} onChange={(e) => update("email", e.target.value)} placeholder="jan@voorbeeld.nl" autoComplete="off" />
            </Field>
            <Field label="Telefoonnummer" optional>
              <Input type="tel" value={input.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06 12345678" autoComplete="off" />
            </Field>
            <Field label="Geboortedatum" optional>
              <DatePicker value={input.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} placeholder="Kies een datum" />
            </Field>
            <Field label="Geslacht" optional>
              <Select value={input.gender} onChange={(e) => update("gender", e.target.value)}>
                <option value="">Niet opgegeven</option>
                <option value="man">Man</option>
                <option value="vrouw">Vrouw</option>
                <option value="anders">Anders</option>
              </Select>
            </Field>
            <Field label="Locatie" optional>
              <Select value={input.locationId ?? ""} onChange={(e) => update("locationId", e.target.value || null)}>
                <option value="">Geen specifieke locatie</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label="Behandelend therapeut" optional>
              <Select value={input.therapistId ?? ""} onChange={(e) => update("therapistId", e.target.value || null)}>
                <option value="">Nog niet toegewezen</option>
                {activeMembers.map((m) => <option key={m.userId} value={m.userId}>{m.fullName || m.email}</option>)}
              </Select>
            </Field>
          </div>
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Wie vult de intake in?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([
                { mode: "therapist" as const, icon: ClipboardEdit, title: "Ik vul het nu in", text: "Samen met de patiënt of op basis van het eerste gesprek." },
                { mode: "patient" as const, icon: Send, title: "De patiënt vult het zelf in", text: "Na het inloggen in de app. Daarna kies jij het herstelplan." },
              ]).map(({ mode, icon: Icon, title, text }) => {
                const selected = intakeMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setIntakeMode(mode); setMaxStepReached(0); }}
                    className="flex items-start gap-3 text-left rounded-xl border px-4 py-3.5 transition-colors"
                    style={{ borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: selected ? "#fff3ee" : "#ffffff" }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: selected ? "var(--brand-accent, #e8632a)" : "#f8f7f4" }}>
                      <Icon size={15} style={{ color: selected ? "#ffffff" : "#6b7280" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{text}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {stepError && <p className="text-xs" style={{ color: "#dc2626" }}>{stepError}</p>}
        </div>
      )}

      {current === "Aanleiding" && (
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

      {current === "Behandeltraject" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Datum blessure</FieldLabel>
              <DatePicker value={input.injuryDate} onChange={(v) => update("injuryDate", v)} placeholder="Kies een datum" />
              <p className="text-xs text-subtle mt-1.5">Komt automatisch terug in de instellingen van de patiënt zelf, en kan daar dan niet meer gewijzigd worden.</p>
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

      {current === "Intake" && (
        <IntakeStep value={intake} onChange={updateIntake} injuryType={input.injuryType} />
      )}

      {current === "REVA Analyse" && (
        <>
          <RevaAnalyseStep
            analysis={analysis}
            summary={summary}
            onSummaryChange={setSummaryOverride}
            goals={goals}
            onGoalsChange={setGoalsOverride}
            allProtocols={allProtocols}
            planChoice={planChoice}
            onPlanChoiceChange={setPlanChoiceOverride}
            customPhase={customPhase}
            onCustomPhaseChange={setCustomPhase}
          />
          {stepError && <p className="text-xs mt-3" style={{ color: "#dc2626" }}>{stepError}</p>}
        </>
      )}

      {current === "Uitnodiging" && (
        <div className="space-y-4">
          {!result ? (
            <>
              <div className="rounded-xl p-4 text-sm space-y-1.5" style={{ background: "#f8f7f4" }}>
                <p><span className="text-gray-500">Naam:</span> <span className="font-medium">{input.firstName} {input.lastName}</span></p>
                <p><span className="text-gray-500">E-mail:</span> {input.email}</p>
                <p><span className="text-gray-500">Locatie:</span> {locations.find((l) => l.id === input.locationId)?.name ?? "Geen"}</p>
                <p><span className="text-gray-500">Behandelaar:</span> {activeMembers.find((m) => m.userId === input.therapistId)?.fullName ?? "Nog niet toegewezen"}</p>
                {intakeMode === "patient" ? (
                  <p><span className="text-gray-500">Intake:</span> vult de patiënt zelf in, daarna kies jij het herstelplan</p>
                ) : (
                  <>
                    <p><span className="text-gray-500">Blessuretype:</span> {BLESSURE_TYPEN.find((b) => b.value === input.injuryType)?.label ?? "Nog niet bekend"}</p>
                    <p><span className="text-gray-500">Herstelplan:</span> {planChoice.kind === "protocol"
                      ? allProtocols.find((p) => p.id === planChoice.protocolId)?.name ?? "Onbekend"
                      : planChoice.kind === "custom" ? `Eigen plan, start met "${customPhase.phaseName.trim() || "Fase 1"}"` : "Later kiezen"}</p>
                  </>
                )}
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
      </div>

      {/* Sticky footer — blijft altijd bereikbaar onderin de modal, ook
          wanneer een stap (bv. Intake) langer is dan het scherm. Eerder
          scrollde deze knopbalk gewoon mee met de stap-inhoud, waardoor
          "Volgende" op mobiel vaak pas na scrollen (of helemaal niet
          zichtbaar, achter het toetsenbord) te raken was. */}
      {!result && (
        <div
          className="flex justify-between items-center gap-3 px-5 py-4 sticky bottom-0 sm:rounded-b-2xl"
          style={{ background: "#ffffff", borderTop: "1px solid #e8e5df" }}
        >
          <Button type="button" size="sm" variant="secondary" onClick={goBack} disabled={step === 0}>
            <ChevronLeft size={14} /> {current === "REVA Analyse" ? "Intake aanpassen" : "Vorige"}
          </Button>
          {step < STEPS.length - 1 && (
            <Button type="button" size="sm" onClick={goNext}>
              Volgende <ChevronRight size={14} />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
