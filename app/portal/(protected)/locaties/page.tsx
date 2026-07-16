"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, Plus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalLocationDetails, createPortalLocation, updatePortalLocationStatus,
  type PortalLocationDetail,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function locationStatusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "suspended") return <Badge variant="muted">Geschorst</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export default function PortalLocationsPage() {
  const { checked, membership } = usePortalMembership();
  const [locations, setLocations] = useState<PortalLocationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadPortalLocationDetails(membership.organizationId).then((data) => {
      if (cancelled) return;
      setLocations(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    if (!name.trim()) {
      setSaveError("Vul een naam voor de vestiging in");
      return;
    }
    setSaving(true);
    setSaveError("");
    const { error } = await createPortalLocation(membership.organizationId, name, city);
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    const refreshed = await loadPortalLocationDetails(membership.organizationId);
    setLocations(refreshed);
    setName("");
    setCity("");
    setShowAdd(false);
  }

  async function handleToggleStatus(loc: PortalLocationDetail) {
    if (!membership) return;
    setTogglingId(loc.id);
    const nextStatus = loc.status === "active" ? "suspended" : "active";
    await updatePortalLocationStatus(loc.id, nextStatus);
    const refreshed = await loadPortalLocationDetails(membership.organizationId);
    setLocations(refreshed);
    setTogglingId(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Vestigingen"
          subtitle={loading ? "Laden…" : `${locations.length} ${locations.length === 1 ? "vestiging" : "vestigingen"}`}
        />
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={14} />
          Nieuwe vestiging
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader title="Nieuwe vestiging" subtitle="Voeg een locatie van jouw praktijk toe" />
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Naam</FieldLabel>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Bijv. Vestiging Centrum" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Plaats (optioneel)</FieldLabel>
                <input
                  type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Utrecht" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
            </div>
            {saveError && <p className="text-xs" style={{ color: "#dc2626" }}>{saveError}</p>}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : "Vestiging toevoegen"}
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
        ) : locations.length === 0 ? (
          <EmptyState icon={MapPin} title="Nog geen vestigingen" description="Voeg je eerste vestiging toe om te beginnen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Plaats</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{loc.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{loc.city || "—"}</td>
                    <td className="px-5 py-3.5">{locationStatusBadge(loc.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm" variant="secondary"
                        disabled={togglingId === loc.id}
                        onClick={() => handleToggleStatus(loc)}
                      >
                        {togglingId === loc.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : loc.status === "active" ? "Deactiveren" : "Activeren"}
                      </Button>
                    </td>
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
