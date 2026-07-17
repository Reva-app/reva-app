"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Pencil, UserPlus, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LocationForm } from "@/components/portal/LocationForm";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalLocationFull, loadPortalRoles, addPortalMember,
  OPENING_HOURS_DAY_LABELS, MANAGE_LOCATIONS_ROLES,
  type PortalLocationFull, type PortalRoleOption, type PortalOpeningHoursDayKey,
} from "@/lib/services/portalService";

const DAY_ORDER: PortalOpeningHoursDayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function initials(name: string | null) {
  const source = (name || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function EmployeeAvatar({ fullName, avatarUrl }: { fullName: string | null; avatarUrl: string | null }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 overflow-hidden"
      style={{ background: avatarUrl ? "transparent" : "var(--brand-accent, #e8632a)" }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(fullName)
      )}
    </div>
  );
}

export default function PortalLocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.id as string;
  const { checked, membership } = usePortalMembership();
  const [location, setLocation] = useState<PortalLocationFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  const [roles, setRoles] = useState<PortalRoleOption[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeRoleId, setEmployeeRoleId] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState("");

  const canManage = !!membership && MANAGE_LOCATIONS_ROLES.includes(membership.roleKey);

  function refresh() {
    loadPortalLocationFull(locationId).then((data) => {
      setLocation(data);
      setNotFound(!data);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([loadPortalLocationFull(locationId), loadPortalRoles()]).then(([data, rolesData]) => {
      if (cancelled) return;
      setLocation(data);
      setNotFound(!data);
      setRoles(rolesData);
      if (rolesData.length > 0) setEmployeeRoleId(rolesData[0].id);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership, locationId]);

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    if (!employeeEmail.trim() || !employeeRoleId) {
      setAddEmployeeError("Vul een e-mailadres en rol in");
      return;
    }
    setAddingEmployee(true);
    setAddEmployeeError("");
    const { error } = await addPortalMember(membership.organizationId, employeeEmail, employeeRoleId, locationId);
    setAddingEmployee(false);
    if (error) {
      setAddEmployeeError(error);
      return;
    }
    setEmployeeEmail("");
    setShowAddEmployee(false);
    refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push("/portal/locaties")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Terug naar vestigingen
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !location ? (
        <p className="text-sm text-gray-400">Deze vestiging is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <SectionHeader title={location.name} />
              {location.isMainLocation && (
                <Badge variant="accent" className="flex items-center gap-1"><Star size={10} /> Hoofdvestiging</Badge>
              )}
              {location.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
            </div>
            {canManage && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil size={13} /> Wijzigen
              </Button>
            )}
          </div>

          <Card>
            <CardHeader title="Algemene gegevens" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-gray-500">Telefoonnummer:</span> <span className="text-gray-800">{location.phone || "—"}</span></div>
              <div><span className="text-gray-500">E-mailadres:</span> <span className="text-gray-800">{location.email || "—"}</span></div>
              <div><span className="text-gray-500">Website:</span> <span className="text-gray-800">{location.website || "—"}</span></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Adres" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-gray-500">Straat:</span> <span className="text-gray-800">{location.street || "—"}</span></div>
              <div><span className="text-gray-500">Huisnummer:</span> <span className="text-gray-800">{location.houseNumber || "—"}</span></div>
              <div><span className="text-gray-500">Postcode:</span> <span className="text-gray-800">{location.postalCode || "—"}</span></div>
              <div><span className="text-gray-500">Plaats:</span> <span className="text-gray-800">{location.city || "—"}</span></div>
              <div><span className="text-gray-500">Land:</span> <span className="text-gray-800">{location.country || "—"}</span></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Openingstijden" />
            <div className="space-y-1.5 text-sm">
              {DAY_ORDER.map((day) => {
                const d = location.openingHours[day];
                return (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-gray-500">{OPENING_HOURS_DAY_LABELS[day]}</span>
                    <span className="text-gray-800">{d?.open ? `${d.from} – ${d.to}` : "Gesloten"}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Medewerkers"
              subtitle={`${location.employees.length} ${location.employees.length === 1 ? "medewerker" : "medewerkers"}`}
              action={canManage ? (
                <Button size="sm" variant="secondary" onClick={() => setShowAddEmployee(true)}>
                  <UserPlus size={13} /> Medewerker toevoegen
                </Button>
              ) : undefined}
            />
            {location.employees.length === 0 ? (
              <p className="text-sm text-gray-400">Nog geen medewerkers aan deze vestiging gekoppeld.</p>
            ) : (
              <div className="space-y-3">
                {location.employees.map((emp) => (
                  <div key={emp.membershipId} className="flex items-center gap-3">
                    <EmployeeAvatar fullName={emp.fullName} avatarUrl={emp.avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{emp.fullName || "Onbekend"}</p>
                      <p className="text-xs text-gray-400">{emp.roleName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {editing && membership && (
            <Modal onClose={() => setEditing(false)} maxWidth="max-w-2xl">
              <LocationForm
                organizationId={membership.organizationId}
                location={location}
                onSaved={() => { setEditing(false); refresh(); }}
                onClose={() => setEditing(false)}
              />
            </Modal>
          )}

          {showAddEmployee && (
            <Modal onClose={() => setShowAddEmployee(false)} maxWidth="max-w-sm">
              <Card>
                <CardHeader title="Medewerker toevoegen" subtitle="Koppelt een bestaand REVA-account aan deze vestiging." />
                <form onSubmit={handleAddEmployee} className="space-y-3">
                  <div>
                    <FieldLabel>E-mailadres</FieldLabel>
                    <input
                      type="email" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)}
                      placeholder="naam@praktijk.nl" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                    />
                  </div>
                  <div>
                    <FieldLabel>Rol</FieldLabel>
                    <select
                      value={employeeRoleId} onChange={(e) => setEmployeeRoleId(e.target.value)}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                    >
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  {addEmployeeError && <p className="text-xs" style={{ color: "#dc2626" }}>{addEmployeeError}</p>}
                  <Button type="submit" size="sm" disabled={addingEmployee}>
                    {addingEmployee ? <Loader2 size={13} className="animate-spin" /> : "Koppelen"}
                  </Button>
                </form>
              </Card>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
