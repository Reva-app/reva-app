"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, UserPlus, MoreVertical, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { PatientWizard } from "@/components/portal/PatientWizard";
import { PatientEditForm } from "@/components/portal/PatientEditForm";
import {
  loadPortalPatients, loadPortalLocations, loadPortalMembers, loadPortalProtocols,
  invitePortalPatient, updatePortalPatientStatus, deletePortalPatient,
  MANAGE_PATIENTS_ROLES,
  type PortalPatient, type PortalLocationOption, type PortalMember, type PortalProtocolOption,
} from "@/lib/services/portalService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#ffffff",
  color: "#1a1a1a",
};

const CHECKIN_BUCKETS = [
  { value: "", label: "Alle" },
  { value: "7", label: "Laatste 7 dagen" },
  { value: "30", label: "Laatste 30 dagen" },
  { value: "older", label: "Langer dan 30 dagen geleden" },
  { value: "none", label: "Nog geen check-in" },
];

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

function accountBadge(p: PortalPatient) {
  if (p.hasAccount) return <Badge variant="success">Actief</Badge>;
  if (p.invitedAt) return <Badge variant="warning">Uitgenodigd op {formatDate(p.invitedAt)}</Badge>;
  return <Badge variant="muted">Nog geen account</Badge>;
}

function initials(name: string | null, email: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Avatar({ patient }: { patient: PortalPatient }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ background: "#e8632a" }}
    >
      {initials(patient.fullName, patient.email)}
    </div>
  );
}

function matchesCheckinBucket(lastCheckinDate: string | null, bucket: string): boolean {
  if (!bucket) return true;
  if (bucket === "none") return !lastCheckinDate;
  if (!lastCheckinDate) return false;
  const days = (Date.now() - new Date(lastCheckinDate).getTime()) / (1000 * 60 * 60 * 24);
  if (bucket === "7") return days <= 7;
  if (bucket === "30") return days <= 30;
  if (bucket === "older") return days > 30;
  return true;
}

export default function PortalPatientsPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [protocols, setProtocols] = useState<PortalProtocolOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showWizard, setShowWizard] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PortalPatient | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [checkinFilter, setCheckinFilter] = useState("");

  const canManagePatients = !!membership && MANAGE_PATIENTS_ROLES.includes(membership.roleKey);

  async function refresh(organizationId: string) {
    const [patientsData, locationsData, membersData, protocolsData] = await Promise.all([
      loadPortalPatients(organizationId),
      loadPortalLocations(organizationId),
      loadPortalMembers(organizationId),
      loadPortalProtocols(organizationId),
    ]);
    setPatients(patientsData);
    setLocations(locationsData);
    setMembers(membersData);
    setProtocols(protocolsData);
    setLoading(false);
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    const organizationId = membership.organizationId;
    Promise.all([
      loadPortalPatients(organizationId),
      loadPortalLocations(organizationId),
      loadPortalMembers(organizationId),
      loadPortalProtocols(organizationId),
    ]).then(([patientsData, locationsData, membersData, protocolsData]) => {
      if (cancelled) return;
      setPatients(patientsData);
      setLocations(locationsData);
      setMembers(membersData);
      setProtocols(protocolsData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (q && !(p.fullName?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (locationFilter && p.locationId !== locationFilter) return false;
      if (therapistFilter && p.therapistId !== therapistFilter) return false;
      if (protocolFilter && p.protocolId !== protocolFilter) return false;
      if (!matchesCheckinBucket(p.lastCheckinDate, checkinFilter)) return false;
      return true;
    });
  }, [patients, search, statusFilter, locationFilter, therapistFilter, protocolFilter, checkinFilter]);

  const activeMembers = members.filter((m) => m.membershipStatus === "active");

  function showMessage(patientId: string, ok: boolean, text: string) {
    setRowMessages((prev) => ({ ...prev, [patientId]: { ok, text } }));
    setTimeout(() => setRowMessages((prev) => {
      const next = { ...prev };
      delete next[patientId];
      return next;
    }), 4000);
  }

  async function handleInviteAction(p: PortalPatient) {
    setOpenMenuId(null);
    if (!p.email) { showMessage(p.id, false, "Dit dossier heeft geen e-mailadres."); return; }
    const result = await invitePortalPatient(p.id, p.email);
    if (result.outcome === "failed") {
      showMessage(p.id, false, result.error);
    } else {
      showMessage(p.id, true, result.outcome === "linked" ? "Direct gekoppeld." : "Uitnodiging verstuurd.");
      if (membership) refresh(membership.organizationId);
    }
  }

  async function handleArchive(p: PortalPatient) {
    setOpenMenuId(null);
    const nextStatus = p.status === "archived" ? "active" : "archived";
    await updatePortalPatientStatus(p.id, nextStatus);
    if (membership) refresh(membership.organizationId);
  }

  async function handleDelete(p: PortalPatient) {
    await deletePortalPatient(p.id);
    setConfirmDeleteId(null);
    if (membership) refresh(membership.organizationId);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Patiënten"
          subtitle={loading ? "Laden…" : `${filteredPatients.length} van ${patients.length} ${patients.length === 1 ? "patiënt" : "patiënten"}`}
        />
        {canManagePatients && !showWizard && !editingPatient && (
          <Button size="sm" onClick={() => setShowWizard(true)}>
            <UserPlus size={14} />
            Patiënt toevoegen
          </Button>
        )}
      </div>

      {showWizard && membership && (
        <PatientWizard
          organizationId={membership.organizationId}
          locations={locations}
          members={members}
          protocols={protocols}
          onProtocolCreated={(protocol) => setProtocols((prev) => [...prev, protocol].sort((a, b) => a.name.localeCompare(b.name)))}
          onDone={() => { setShowWizard(false); if (membership) refresh(membership.organizationId); }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {editingPatient && membership && (
        <PatientEditForm
          patient={editingPatient}
          locations={locations}
          members={members}
          protocols={protocols}
          onSaved={() => { setEditingPatient(null); refresh(membership.organizationId); }}
          onClose={() => setEditingPatient(null)}
        />
      )}

      {/* Filters */}
      <div className="rounded-2xl border p-4 flex flex-wrap gap-3 items-end" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Zoeken</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam of e-mailadres…" className="w-full text-sm rounded-xl border pl-9 pr-3 py-2 focus:outline-none" style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
            <option value="archived">Gearchiveerd</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Vestiging</label>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Behandelaar</label>
          <select value={therapistFilter} onChange={(e) => setTherapistFilter(e.target.value)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {activeMembers.map((m) => <option key={m.userId} value={m.userId}>{m.fullName || m.email}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Protocol</label>
          <select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {protocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Laatste check-in</label>
          <select value={checkinFilter} onChange={(e) => setCheckinFilter(e.target.value)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            {CHECKIN_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={HeartPulse}
            title={patients.length === 0 ? "Nog geen patiënten" : "Geen patiënten gevonden"}
            description={patients.length === 0 ? "Voeg een patiëntdossier toe om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Behandelaar</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Protocol</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Vestiging</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Laatste check-in</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const message = rowMessages[p.id];
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/portal/patienten/${p.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderBottom: "1px solid #f8f7f4" }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar patient={p} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{p.fullName || "Nog niet ingevuld"}</p>
                            {message && (
                              <p className="text-xs" style={{ color: message.ok ? "#16a34a" : "#dc2626" }}>{message.text}</p>
                            )}
                            {!message && !p.hasAccount && (
                              <div className="text-xs">{accountBadge(p)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{p.therapistName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{p.protocolName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{p.locationName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-400">{p.lastCheckinDate ? formatDate(p.lastCheckinDate) : "—"}</td>
                      <td className="px-5 py-3.5">{statusBadge(p.status)}</td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {canManagePatients && (
                          <div className="relative inline-block" ref={openMenuId === p.id ? menuRef : undefined}>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId((id) => (id === p.id ? null : p.id))}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === p.id && (
                              <div
                                className="absolute right-0 mt-1 w-52 rounded-xl border py-1 z-10 text-sm"
                                style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                              >
                                <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => handleInviteAction(p)}>
                                  Uitnodiging versturen
                                </button>
                                <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { setOpenMenuId(null); setEditingPatient(p); }}>
                                  Wijzigen
                                </button>
                                <button type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => handleArchive(p)}>
                                  {p.status === "archived" ? "Dearchiveren" : "Archiveren"}
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                  style={{ color: "#dc2626" }}
                                  onClick={() => { setOpenMenuId(null); setConfirmDeleteId(p.id); }}
                                >
                                  Verwijderen
                                </button>
                              </div>
                            )}
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

      {confirmDeleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setConfirmDeleteId(null)}>
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: "#ffffff" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Patiënt verwijderen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Dit verwijdert het volledige patiëntdossier permanent. Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)}>Annuleren</Button>
              <Button
                size="sm" variant="danger"
                onClick={() => {
                  const p = patients.find((x) => x.id === confirmDeleteId);
                  if (p) handleDelete(p);
                }}
              >
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
