"use client";

import { useState } from "react";
import { Check, ChevronRight, ChevronLeft, Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  createAndInvitePortalPatient,
  type PortalPatientInput, type PortalLocationOption, type PortalMember,
} from "@/lib/services/portalService";
import { assignProtocolToPatient, type PortalProtocolCard } from "@/lib/services/protocolService";
import { isValidEmail, BLESSURE_TYPEN } from "@/lib/data";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

const STEPS = ["Basisgegevens", "Behandeltraject", "Uitnodiging"];

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
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<PortalPatientInput>(emptyInput);
  const [stepError, setStepError] = useState("");

  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const activeMembers = members.filter((m) => m.membershipStatus === "active");
  const availableRevaProtocols = revaProtocols.filter((p) => !p.archived);
  const availableOrgProtocols = orgProtocols.filter((p) => !p.archived);
  const allProtocols = [...availableOrgProtocols, ...availableRevaProtocols];

  function update<K extends keyof PortalPatientInput>(key: K, value: PortalPatientInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
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
    setStepError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleInvite() {
    setSending(true);
    const res = await createAndInvitePortalPatient(organizationId, input);
    if (res.outcome !== "failed" && selectedProtocolId) {
      await assignProtocolToPatient(res.patientId, selectedProtocolId);
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
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
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
          </div>
        ))}
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
        <div className="space-y-3">
          <div>
            <FieldLabel>Blessuretype (optioneel)</FieldLabel>
            <select value={input.injuryType} onChange={(e) => update("injuryType", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Nog niet bekend</option>
              {BLESSURE_TYPEN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">Komt automatisch terug in de instellingen van de patiënt zelf.</p>
          </div>
          <div>
            <FieldLabel>Herstelplan (optioneel)</FieldLabel>
            <select value={selectedProtocolId ?? ""} onChange={(e) => setSelectedProtocolId(e.target.value || null)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Geen herstelplan</option>
              {availableOrgProtocols.length > 0 && (
                <optgroup label="Eigen herstelplannen">
                  {availableOrgProtocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
              {availableRevaProtocols.length > 0 && (
                <optgroup label="REVA-herstelplannen">
                  {availableRevaProtocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">Nog geen eigen herstelplan? Maak er een aan via de Herstelplannen-pagina.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Datum blessure (optioneel)</FieldLabel>
              <DatePicker value={input.injuryDate} onChange={(v) => update("injuryDate", v)} placeholder="Kies een datum" />
              <p className="text-xs text-gray-400 mt-1.5">Komt automatisch terug in de instellingen van de patiënt zelf, en kan daar dan niet meer gewijzigd worden.</p>
            </div>
            <div>
              <FieldLabel>Startdatum behandeling (optioneel)</FieldLabel>
              <DatePicker value={input.treatmentStartDate} onChange={(v) => update("treatmentStartDate", v)} placeholder="Kies een datum" />
            </div>
            <div>
              <FieldLabel>Operatiedatum (indien bekend)</FieldLabel>
              <DatePicker value={input.surgeryDate} onChange={(v) => update("surgeryDate", v)} placeholder="Kies een datum" />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {!result ? (
            <>
              <div className="rounded-xl p-4 text-sm space-y-1.5" style={{ background: "#f8f7f4" }}>
                <p><span className="text-gray-500">Naam:</span> <span className="font-medium">{input.firstName} {input.lastName}</span></p>
                <p><span className="text-gray-500">E-mail:</span> {input.email}</p>
                <p><span className="text-gray-500">Locatie:</span> {locations.find((l) => l.id === input.locationId)?.name ?? "Geen"}</p>
                <p><span className="text-gray-500">Behandelaar:</span> {activeMembers.find((m) => m.userId === input.therapistId)?.fullName ?? "Nog niet toegewezen"}</p>
                <p><span className="text-gray-500">Blessuretype:</span> {BLESSURE_TYPEN.find((b) => b.value === input.injuryType)?.label ?? "Nog niet bekend"}</p>
                <p><span className="text-gray-500">Herstelplan:</span> {allProtocols.find((p) => p.id === selectedProtocolId)?.name ?? "Geen"}</p>
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
            <ChevronLeft size={14} /> Vorige
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
