"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { AanleidingStep } from "@/components/portal/wizard/AanleidingStep";
import { IntakeStep } from "@/components/portal/wizard/IntakeStep";
import { FieldLabel } from "@/components/portal/wizard/shared";
import { emptyIntakeInput, type IntakeInput, type VisitReason } from "@/lib/intakeAnalysis";
import { submitMyIntake, type MyPendingIntake } from "@/lib/services/intakeService";

const STEPS = ["Waarvoor kom je?", "Wanneer?", "Je klacht"] as const;

interface PatientIntakeScreenProps {
  pending: MyPendingIntake;
  onDone: () => void;
  onSignOut: () => void;
}

/**
 * Intake die de patiënt zelf invult, direct na het inloggen (migratie 137).
 * Blokkerend, net als het 2FA-scherm: eerst de intake, dan de app. De
 * fysiotherapeut kiest daarna zelf het herstelplan.
 */
export function PatientIntakeScreen({ pending, onDone, onSignOut }: PatientIntakeScreenProps) {
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<IntakeInput>(emptyIntakeInput);
  const [injuryType, setInjuryType] = useState("");
  const [injuryDate, setInjuryDate] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  function update<K extends keyof IntakeInput>(key: K, value: IntakeInput[K]) {
    setIntake((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step === 0) {
      if (!intake.visitReason) { setError("Kies waarvoor je komt"); return; }
      if (intake.visitReason === "sports_injury" && !intake.sportType.trim()) { setError("Kies of vul je sport in"); return; }
      if (!injuryType) { setError(intake.visitReason === "surgery" ? "Kies welke operatie" : "Kies waar de klacht zit"); return; }
    }
    if (step === 1) {
      if (!injuryDate) { setError(intake.visitReason === "surgery" ? "Vul in wanneer de klachten begonnen" : "Vul in wanneer het begon"); return; }
      if (intake.visitReason === "surgery" && !surgeryDate) { setError("Vul de datum van de operatie in"); return; }
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    setSending(true);
    setError("");
    const { error: submitError } = await submitMyIntake(intake, { injuryType, injuryDate, surgeryDate });
    setSending(false);
    if (submitError) { setError(submitError); return; }
    setDone(true);
  }

  const who = pending.therapistName ? pending.therapistName : pending.organizationName ? `je fysiotherapeut van ${pending.organizationName}` : "je fysiotherapeut";

  return (
    <div className="fixed inset-0 z-(--z-gate) overflow-y-auto" style={{ background: "#f8f7f4" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {done ? (
          <div className="rounded-3xl bg-white border p-8 text-center" style={{ borderColor: "#e8e5df" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#ecfdf3" }}>
              <Check size={22} style={{ color: "#16a34a" }} />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Dank je wel!</h1>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-sm mx-auto">
              {who.charAt(0).toUpperCase() + who.slice(1)} bekijkt je antwoorden en zet je herstelplan klaar. Je ziet het in de app zodra het er is.
            </p>
            <Button className="mt-6" onClick={onDone}>Naar de app</Button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#fff3ee" }}>
                <ClipboardList size={20} style={{ color: "var(--brand-accent, #e8632a)" }} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">Vertel ons over je klacht</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Zo kan {who} je herstel goed voorbereiden. Het duurt ongeveer 5 minuten.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: i < step ? "#16a34a" : i === step ? "var(--brand-accent, #e8632a)" : "#e8e5df", color: i <= step ? "#ffffff" : "#6b7280" }}
                  >
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline" style={{ color: i === step ? "#1a1a1a" : "#6b7280" }}>{label}</span>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: "#e8e5df" }} />}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="rounded-2xl bg-white border p-4 sm:p-5" style={{ borderColor: "#e8e5df" }}>
                <AanleidingStep
                  audience="patient"
                  visitReason={intake.visitReason}
                  onVisitReasonChange={(r: VisitReason) => update("visitReason", r)}
                  injuryType={injuryType}
                  onInjuryTypeChange={setInjuryType}
                  sportType={intake.sportType}
                  onSportTypeChange={(v) => update("sportType", v)}
                  bodySide={intake.bodySide}
                  onBodySideChange={(v) => update("bodySide", v)}
                />
              </div>
            )}

            {step === 1 && (
              <div className="rounded-2xl bg-white border p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: "#e8e5df" }}>
                <div>
                  <FieldLabel>{intake.visitReason === "surgery" ? "Wanneer begonnen de klachten?" : "Wanneer begon het?"}</FieldLabel>
                  <DatePicker value={injuryDate} onChange={setInjuryDate} placeholder="Kies een datum" />
                  <p className="text-xs text-subtle mt-1.5">Weet je de precieze dag niet? Kies dan ongeveer.</p>
                </div>
                {intake.visitReason === "surgery" && (
                  <div>
                    <FieldLabel>Datum van de operatie</FieldLabel>
                    <DatePicker value={surgeryDate} onChange={setSurgeryDate} placeholder="Kies een datum" />
                  </div>
                )}
              </div>
            )}

            {step === 2 && <IntakeStep audience="patient" value={intake} onChange={update} injuryType={injuryType} />}

            {error && <p className="text-sm mt-4" role="alert" style={{ color: "#dc2626" }}>{error}</p>}

            <div className="flex items-center justify-between gap-3 mt-6">
              {step > 0 ? (
                <Button variant="secondary" onClick={() => { setError(""); setStep((s) => s - 1); }} disabled={sending}>
                  <ChevronLeft size={14} /> Vorige
                </Button>
              ) : (
                <button type="button" onClick={onSignOut} className="text-sm font-medium text-gray-500 hover:text-gray-700">Uitloggen</button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={next}>Volgende <ChevronRight size={14} /></Button>
              ) : (
                <Button onClick={submit} disabled={sending}>
                  {sending ? <Loader2 size={14} className="animate-spin" /> : "Versturen"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
