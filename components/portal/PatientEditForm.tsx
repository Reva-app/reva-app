"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  updatePortalPatient,
  type PortalPatient, type PortalPatientInput, type PortalLocationOption, type PortalMember,
} from "@/lib/services/portalService";
import { isValidEmail, BLESSURE_TYPEN } from "@/lib/data";

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
    dateOfBirth: p.dateOfBirth || "",
    gender: p.gender || "",
    locationId: p.locationId,
    therapistId: p.therapistId,
    treatmentStartDate: p.treatmentStartDate || "",
    surgeryDate: p.surgeryDate || "",
    injuryDate: p.injuryDate || "",
    injuryType: p.injuryType || "",
  };
}

interface PatientEditFormProps {
  patient: PortalPatient;
  locations: PortalLocationOption[];
  members: PortalMember[];
  onSaved: () => void;
  onClose: () => void;
}

export function PatientEditForm({ patient, locations, members, onSaved, onClose }: PatientEditFormProps) {
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
    if (input.email.trim() && !isValidEmail(input.email)) {
      setError("Vul een geldig e-mailadres in (bijv. naam@voorbeeld.nl)");
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
            <FieldLabel>Geboortedatum</FieldLabel>
            <DatePicker value={input.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} placeholder="Kies een datum" />
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
            <FieldLabel>Locatie</FieldLabel>
            <select value={input.locationId ?? ""} onChange={(e) => update("locationId", e.target.value || null)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Geen specifieke locatie</option>
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
            <FieldLabel>Blessuretype</FieldLabel>
            <select value={input.injuryType} onChange={(e) => update("injuryType", e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Nog niet bekend</option>
              {BLESSURE_TYPEN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Datum blessure</FieldLabel>
            <DatePicker value={input.injuryDate} onChange={(v) => update("injuryDate", v)} placeholder="Kies een datum" />
          </div>
          <div>
            <FieldLabel>Startdatum behandeling</FieldLabel>
            <DatePicker value={input.treatmentStartDate} onChange={(v) => update("treatmentStartDate", v)} placeholder="Kies een datum" />
          </div>
          <div>
            <FieldLabel>Operatiedatum</FieldLabel>
            <DatePicker value={input.surgeryDate} onChange={(v) => update("surgeryDate", v)} placeholder="Kies een datum" />
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
