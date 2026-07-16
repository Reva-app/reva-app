"use client";

import { useState } from "react";
import { Check, ChevronRight, ChevronLeft, Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  createAndInvitePortalPatient, createPortalProtocol,
  type PortalPatientInput, type PortalLocationOption, type PortalMember, type PortalProtocolOption,
} from "@/lib/services/portalService";

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
  locationId: null, therapistId: null, protocolId: null, treatmentStartDate: "", surgeryDate: "",
};

interface PatientWizardProps {
  organizationId: string;
  locations: PortalLocationOption[];
  members: PortalMember[];
  protocols: PortalProtocolOption[];
  onProtocolCreated: (protocol: PortalProtocolOption) => void;
  onDone: () => void;
  onClose: () => void;
}

export function PatientWizard({
  organizationId, locations, members, protocols, onProtocolCreated, onDone, onClose,
}: PatientWizardProps) {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<PortalPatientInput>(emptyInput);
  const [stepError, setStepError] = useState("");

  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState("");
  const [creatingProtocol, setCreatingProtocol] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const activeMembers = members.filter((m) => m.membershipStatus === "active");

  function update<K extends keyof PortalPatientInput>(key: K, value: PortalPatientInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (step === 0) {
      if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
        setStepError("Vul voornaam, achternaam en e-mailadres in");
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

  async function handleCreateProtocol() {
    if (!newProtocolName.trim()) return;
    setCreatingProtocol(true);
    const { id, error } = await createPortalProtocol(organizationId, newProtocolName);
    setCreatingProtocol(false);
    if (error || !id) return;
    const protocol = { id, name: newProtocolName.trim() };
    onProtocolCreated(protocol);
    update("protocolId", id);
    setNewProtocolName("");
    setShowNewProtocol(false);
  }

  async function handleInvite() {
    setSending(true);
    const res = await createAndInvitePortalPatient(organizationId, input);
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
                background: i < step ? "#16a34a" : i === step ? "#e8632a" : "#e8e5df",
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
              <input type="date" value={input.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
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
              <FieldLabel>Vestiging (optioneel)</FieldLabel>
              <select value={input.locationId ?? ""} onChange={(e) => update("locationId", e.target.value || null)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                <option value="">Geen specifieke vestiging</option>
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
            <FieldLabel>Protocol (optioneel)</FieldLabel>
            {!showNewProtocol ? (
              <div className="flex gap-2">
                <select value={input.protocolId ?? ""} onChange={(e) => update("protocolId", e.target.value || null)}
                  className="flex-1 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                  <option value="">Geen protocol</option>
                  {protocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowNewProtocol(true)}>Nieuw</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={newProtocolName} onChange={(e) => setNewProtocolName(e.target.value)}
                  placeholder="Bijv. Totale Knieprothese" className="flex-1 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
                <Button type="button" size="sm" disabled={creatingProtocol} onClick={handleCreateProtocol}>
                  {creatingProtocol ? <Loader2 size={13} className="animate-spin" /> : "Toevoegen"}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowNewProtocol(false)}>Annuleren</Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Startdatum behandeling (optioneel)</FieldLabel>
              <input type="date" value={input.treatmentStartDate} onChange={(e) => update("treatmentStartDate", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Operatiedatum (indien bekend)</FieldLabel>
              <input type="date" value={input.surgeryDate} onChange={(e) => update("surgeryDate", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
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
                <p><span className="text-gray-500">Vestiging:</span> {locations.find((l) => l.id === input.locationId)?.name ?? "Geen"}</p>
                <p><span className="text-gray-500">Behandelaar:</span> {activeMembers.find((m) => m.userId === input.therapistId)?.fullName ?? "Nog niet toegewezen"}</p>
                <p><span className="text-gray-500">Protocol:</span> {protocols.find((p) => p.id === input.protocolId)?.name ?? "Geen"}</p>
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
