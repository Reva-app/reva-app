"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  createPortalLocationFull, updatePortalLocationFull,
  OPENING_HOURS_DAY_LABELS, DEFAULT_OPENING_HOURS,
  type PortalLocationFull, type PortalLocationInput, type PortalOpeningHoursDayKey,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

const DAY_ORDER: PortalOpeningHoursDayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function toInput(loc?: PortalLocationFull): PortalLocationInput {
  if (!loc) {
    return {
      name: "", phone: "", email: "", website: "",
      street: "", houseNumber: "", postalCode: "", city: "", country: "Nederland",
      openingHours: DEFAULT_OPENING_HOURS,
    };
  }
  return {
    name: loc.name,
    phone: loc.phone ?? "",
    email: loc.email ?? "",
    website: loc.website ?? "",
    street: loc.street ?? "",
    houseNumber: loc.houseNumber ?? "",
    postalCode: loc.postalCode ?? "",
    city: loc.city ?? "",
    country: loc.country || "Nederland",
    openingHours: loc.openingHours ?? DEFAULT_OPENING_HOURS,
  };
}

interface LocationFormProps {
  organizationId: string;
  location?: PortalLocationFull;
  onSaved: () => void;
  onClose: () => void;
}

export function LocationForm({ organizationId, location, onSaved, onClose }: LocationFormProps) {
  const [input, setInput] = useState<PortalLocationInput>(toInput(location));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof PortalLocationInput>(key: K, value: PortalLocationInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function updateDay(day: PortalOpeningHoursDayKey, patch: Partial<{ open: boolean; from: string; to: string }>) {
    setInput((prev) => ({
      ...prev,
      openingHours: { ...prev.openingHours, [day]: { ...prev.openingHours[day], ...patch } },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.name.trim()) {
      setError("Vul een naam voor de locatie in");
      return;
    }
    setSaving(true);
    setError("");
    const result = location
      ? await updatePortalLocationFull(location.id, input)
      : await createPortalLocationFull(organizationId, input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <CardHeader title={location ? "Locatie wijzigen" : "Nieuwe locatie"} />
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 -mt-1">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Algemene gegevens</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <FieldLabel>Naam</FieldLabel>
              <input type="text" value={input.name} onChange={(e) => update("name", e.target.value)}
                placeholder="Bijv. Locatie Centrum" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Telefoonnummer</FieldLabel>
              <input type="tel" value={input.phone} onChange={(e) => update("phone", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>E-mailadres</FieldLabel>
              <input type="email" value={input.email} onChange={(e) => update("email", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Website (optioneel)</FieldLabel>
              <input type="text" value={input.website} onChange={(e) => update("website", e.target.value)}
                placeholder="https://" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Adres</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Straat</FieldLabel>
              <input type="text" value={input.street} onChange={(e) => update("street", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Huisnummer</FieldLabel>
              <input type="text" value={input.houseNumber} onChange={(e) => update("houseNumber", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Postcode</FieldLabel>
              <input type="text" value={input.postalCode} onChange={(e) => update("postalCode", e.target.value)}
                placeholder="1234 AB" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Plaats</FieldLabel>
              <input type="text" value={input.city} onChange={(e) => update("city", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Land</FieldLabel>
              <input type="text" value={input.country} onChange={(e) => update("country", e.target.value)}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Openingstijden</p>
          <div className="space-y-2">
            {DAY_ORDER.map((day) => {
              const d = input.openingHours[day];
              return (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-32 shrink-0 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={d.open}
                      onChange={(e) => updateDay(day, { open: e.target.checked })}
                      className="rounded"
                    />
                    {OPENING_HOURS_DAY_LABELS[day]}
                  </label>
                  {d.open ? (
                    <div className="flex items-center gap-2">
                      <input type="time" value={d.from} onChange={(e) => updateDay(day, { from: e.target.value })}
                        className="text-sm rounded-lg border px-2 py-1.5 focus:outline-none" style={inputStyle} />
                      <span className="text-gray-400 text-sm">tot</span>
                      <input type="time" value={d.to} onChange={(e) => updateDay(day, { to: e.target.value })}
                        className="text-sm rounded-lg border px-2 py-1.5 focus:outline-none" style={inputStyle} />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Gesloten</span>
                  )}
                </div>
              );
            })}
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
