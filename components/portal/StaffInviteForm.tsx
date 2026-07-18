"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  inviteStaffMember,
  type PortalRoleOption, type PortalLocationOption, type InviteStaffMemberResult,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

interface StaffInviteFormProps {
  organizationId: string;
  roles: PortalRoleOption[];
  locations: PortalLocationOption[];
  onInvited: (result: InviteStaffMemberResult) => void;
  onClose: () => void;
}

export function StaffInviteForm({ organizationId, roles, locations, onInvited, onClose }: StaffInviteFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !roleId) {
      setError("Vul voornaam, achternaam, e-mailadres en rol in.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await inviteStaffMember(organizationId, {
      firstName, lastName, email, roleId, locationId: locationId || null,
    });
    setSaving(false);
    if (result.outcome === "failed") {
      setError(result.error);
      return;
    }
    onInvited(result);
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <CardHeader
          title="Medewerker uitnodigen"
          subtitle="Heeft deze persoon al een REVA-account, dan wordt die direct gekoppeld. Anders ontvangt diegene een e-mail om zelf een wachtwoord te kiezen."
        />
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 -mt-1">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Voornaam</FieldLabel>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Achternaam</FieldLabel>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>E-mailadres</FieldLabel>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@praktijk.nl" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Rol</FieldLabel>
            <select
              value={roleId} onChange={(e) => setRoleId(e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Hoofdvestiging (optioneel)</FieldLabel>
            <select
              value={locationId} onChange={(e) => setLocationId(e.target.value)}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
            >
              <option value="">Hele organisatie</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : "Uitnodigen"}
        </Button>
      </form>
    </Card>
  );
}
