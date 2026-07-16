"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Loader2, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalPatients, loadPortalLocations, createPortalPatient,
  type PortalPatient, type PortalLocationOption,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export default function PortalPatientsPage() {
  const { checked, membership } = usePortalMembership();
  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([
      loadPortalPatients(membership.organizationId),
      loadPortalLocations(membership.organizationId),
    ]).then(([patientsData, locationsData]) => {
      if (cancelled) return;
      setPatients(patientsData);
      setLocations(locationsData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    if (!firstName.trim() || !lastName.trim()) {
      setSaveError("Vul in ieder geval een voor- en achternaam in");
      return;
    }
    setSaving(true);
    setSaveError("");
    const { error } = await createPortalPatient(membership.organizationId, {
      firstName, lastName, email, phone, dateOfBirth,
      locationId: locationId || null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    const refreshed = await loadPortalPatients(membership.organizationId);
    setPatients(refreshed);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDateOfBirth("");
    setLocationId("");
    setShowAdd(false);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Patiënten"
          subtitle={loading ? "Laden…" : `${patients.length} ${patients.length === 1 ? "patiënt" : "patiënten"} binnen deze organisatie`}
        />
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <UserPlus size={14} />
          Patiënt toevoegen
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader
            title="Nieuw patiëntdossier"
            subtitle="Een dossier kan al bestaan voordat de patiënt zelf een REVA-account heeft — die koppeling volgt later."
          />
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Voornaam</FieldLabel>
                <input
                  type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jan" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Achternaam</FieldLabel>
                <input
                  type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Jansen" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>E-mailadres (optioneel)</FieldLabel>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="jan@voorbeeld.nl" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Telefoonnummer (optioneel)</FieldLabel>
                <input
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12345678" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Geboortedatum (optioneel)</FieldLabel>
                <input
                  type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Vestiging (optioneel)</FieldLabel>
                <select
                  value={locationId} onChange={(e) => setLocationId(e.target.value)}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                >
                  <option value="">Geen specifieke vestiging</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {saveError && <p className="text-xs" style={{ color: "#dc2626" }}>{saveError}</p>}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : "Dossier aanmaken"}
            </Button>
          </form>
        </Card>
      )}

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={HeartPulse}
            title="Nog geen patiënten"
            description="Voeg een patiëntdossier toe, of wacht tot patiënten aan deze organisatie gekoppeld worden."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">E-mail</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Vestiging</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Account</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Toegevoegd op</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{p.fullName || "Nog niet ingevuld"}</td>
                    <td className="px-5 py-3.5 text-gray-600">{p.email || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-600">{p.locationName || "—"}</td>
                    <td className="px-5 py-3.5">
                      {p.hasAccount ? <Badge variant="success">Actief</Badge> : <Badge variant="muted">Nog geen account</Badge>}
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(p.status)}</td>
                    <td className="px-5 py-3.5 text-gray-400">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
