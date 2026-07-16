"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  updatePortalPatient,
  type PortalPatient, type PortalPatientInput, type PortalLocationOption, type PortalMember, type PortalProtocolOption,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function toInput(p: PortalPatient): PortalPatientInput {
  const [firstName, ...rest] = (p.fullName || "").split(" ");
  return {
    firstName: firstName || "",
    lastName: rest.join(" ") || "",
    email: p.email || "",
    phone: p.phone || "",
    dateOfBirth: "",
    gender: p.gender || "",
    locationId: p.locationId,
    therapistId: p.therapistId,
    protocolId: p.protocolId,
    treatmentStartDate: p.treatmentStartDate || "",
    surgeryDate: p.surgeryDate || "",
  };
}

interface PatientEditFormProps {
  patient: PortalPatient;
  locations: PortalLocationOption[];
  members: PortalMember[];
  protocols: PortalProtocolOption[];
  onSaved: () => void;
  onClose: () => void;
}

export function PatientEditForm({ patient, locations, members, protocols, onSaved, onClose }: PatientEditFormProps) {
  const [input, setInput] = useState<PortalPatientInput>(toInput(patient));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeMembers = members.filter((m) => m.membershipStatus === "active");

  function update<K extends keyof PortalPatientInput>(key: K, value: PortalPatientInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.firstName.trim() || !input.lastName.trim()) {
      setError("Vul voornaam en achternaam in");
      return;
    }
    setSaving(true);
    setError("");
    const { error: saveError } = await updatePortalPatient(patient.id, input);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    onSaved();
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <CardHeader title="Patiëntgegevens wijzigen" />
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 -mt-1">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Voornaam</FieldLabel>
            <input type="text" value={input.firstName} onChange={(e) => update("firstName", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Achternaam</FieldLabel>
            <input type="text" value={input.lastName} onChange={(e) => update("lastName", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Telefoonnummer</FieldLabel>
            <input type="tel" value={input.phone} onChange={(e) => update("phone", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Geslacht</FieldLabel>
            <select value={input.gender} onChange={(e) => update("gender", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Niet opgegeven</option>
              <option value="man">Man</option>
              <option value="vrouw">Vrouw</option>
              <option value="anders">Anders</option>
            </select>
          </div>
          <div>
            <FieldLabel>Vestiging</FieldLabel>
            <select value={input.locationId ?? ""} onChange={(e) => update("locationId", e.target.value || null)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Geen specifieke vestiging</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Behandelend therapeut</FieldLabel>
            <select value={input.therapistId ?? ""} onChange={(e) => update("therapistId", e.target.value || null)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Nog niet toegewezen</option>
              {activeMembers.map((m) => <option key={m.userId} value={m.userId}>{m.fullName || m.email}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Protocol</FieldLabel>
            <select value={input.protocolId ?? ""} onChange={(e) => update("protocolId", e.target.value || null)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Geen protocol</option>
              {protocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Startdatum behandeling</FieldLabel>
            <input type="date" value={input.treatmentStartDate} onChange={(e) => update("treatmentStartDate", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Operatiedatum</FieldLabel>
            <input type="date" value={input.surgeryDate} onChange={(e) => update("surgeryDate", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
        </Button>
      </form>
    </Card>
  );
}
