"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ModalFooter } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  inviteStaffMember, ROLE_EXPLANATIONS,
  type PortalRoleOption, type PortalLocationOption, type InviteStaffMemberResult,
} from "@/lib/services/portalService";

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
          subtitle="Heeft deze persoon al een REVA-account, dan wordt die direct gekoppeld en krijgt diegene een e-mail. Anders ontvangt diegene een e-mail om zelf een wachtwoord te kiezen."
        />
        <button type="button" onClick={onClose} aria-label="Sluiten" className="relative tap-target text-gray-400 hover:text-gray-600 shrink-0 -mt-1">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Voornaam">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Achternaam">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="E-mailadres" className="sm:col-span-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@praktijk.nl" autoComplete="off" />
          </Field>
          <Field label="Rol" hint={ROLE_EXPLANATIONS[roles.find((r) => r.id === roleId)?.key ?? ""]}>
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hoofdlocatie" optional>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Hele organisatie</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
        <ModalFooter inset="md">
          <Button type="button" size="sm" variant="secondary" onClick={onClose} disabled={saving}>Annuleren</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : "Uitnodigen"}
          </Button>
        </ModalFooter>
      </form>
    </Card>
  );
}
