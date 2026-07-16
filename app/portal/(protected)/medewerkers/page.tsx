"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  loadPortalMembers, loadPortalRoles, loadPortalLocations, addPortalMember, updatePortalMember,
  type PortalMember, type PortalRoleOption, type PortalLocationOption,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function roleBadgeVariant(roleKey: string): "accent" | "blue" | "purple" | "default" {
  if (roleKey === "organization_owner" || roleKey === "organization_admin") return "accent";
  if (roleKey === "therapist" || roleKey === "location_manager") return "blue";
  if (roleKey === "finance") return "purple";
  return "default";
}

function membershipStatusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "suspended") return <Badge variant="muted">Geschorst</Badge>;
  if (status === "invited") return <Badge variant="warning">Uitgenodigd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

export default function PortalMembersPage() {
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [roles, setRoles] = useState<PortalRoleOption[]>([]);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([
      loadPortalMembers(membership.organizationId),
      loadPortalRoles(),
      loadPortalLocations(membership.organizationId),
    ]).then(([membersData, rolesData, locationsData]) => {
      if (cancelled) return;
      setMembers(membersData);
      setRoles(rolesData);
      setLocations(locationsData);
      if (rolesData.length > 0) setRoleId(rolesData[0].id);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  async function refresh() {
    if (!membership) return;
    const data = await loadPortalMembers(membership.organizationId);
    setMembers(data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    if (!email.trim() || !roleId) {
      setSaveError("Vul een e-mailadres en rol in");
      return;
    }
    setSaving(true);
    setSaveError("");
    const { error } = await addPortalMember(membership.organizationId, email, roleId, locationId || null);
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    await refresh();
    setEmail("");
    setLocationId("");
    setShowAdd(false);
  }

  function startEdit(m: PortalMember) {
    setEditingId(m.membershipId);
    setEditRoleId(m.roleId);
    setEditLocationId(m.locationId || "");
  }

  async function saveEdit(membershipId: string) {
    setEditSaving(true);
    await updatePortalMember(membershipId, { roleId: editRoleId, locationId: editLocationId || null });
    setEditSaving(false);
    setEditingId(null);
    await refresh();
  }

  async function toggleActive(m: PortalMember) {
    await updatePortalMember(m.membershipId, { status: m.membershipStatus === "active" ? "suspended" : "active" });
    await refresh();
  }

  const membersByRole = [...members].sort((a, b) => a.roleKey.localeCompare(b.roleKey));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Medewerkers"
          subtitle={loading ? "Laden…" : `${members.length} ${members.length === 1 ? "medewerker" : "medewerkers"}`}
        />
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <UserPlus size={14} />
          Medewerker koppelen
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader
            title="Medewerker koppelen"
            subtitle="Koppelt een bestaand REVA-account aan jouw organisatie. Diegene moet al eerder zelf een account hebben aangemaakt."
          />
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>E-mailadres</FieldLabel>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@praktijk.nl" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                />
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
                <FieldLabel>Vestiging (optioneel)</FieldLabel>
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
            {saveError && <p className="text-xs" style={{ color: "#dc2626" }}>{saveError}</p>}
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : "Koppelen"}
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
        ) : membersByRole.length === 0 ? (
          <EmptyState icon={Users} title="Nog geen medewerkers" description="Koppel je eerste medewerker om te beginnen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Rol</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Vestiging</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {membersByRole.map((m) => {
                  const isSelf = user?.id === m.userId;
                  const isEditing = editingId === m.membershipId;
                  return (
                    <tr key={m.membershipId} style={{ borderBottom: "1px solid #f8f7f4" }}>
                      <td className="px-5 py-3.5 font-medium text-gray-800">
                        {m.fullName || m.email || "Onbekend"}
                        {isSelf && <span className="text-xs text-gray-400 font-normal ml-2">(jij)</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {isEditing ? (
                          <select
                            value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)}
                            className="text-sm rounded-lg border px-2 py-1 focus:outline-none" style={inputStyle}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={roleBadgeVariant(m.roleKey)}>{m.roleName}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {isEditing ? (
                          <select
                            value={editLocationId} onChange={(e) => setEditLocationId(e.target.value)}
                            className="text-sm rounded-lg border px-2 py-1 focus:outline-none" style={inputStyle}
                          >
                            <option value="">Hele organisatie</option>
                            {locations.map((l) => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        ) : (
                          m.locationName || "Hele organisatie"
                        )}
                      </td>
                      <td className="px-5 py-3.5">{membershipStatusBadge(m.membershipStatus)}</td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Annuleren</Button>
                            <Button size="sm" disabled={editSaving} onClick={() => saveEdit(m.membershipId)}>
                              {editSaving ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => startEdit(m)}>Bewerken</Button>
                            <Button size="sm" variant="secondary" onClick={() => toggleActive(m)}>
                              {m.membershipStatus === "active" ? "Deactiveren" : "Activeren"}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
