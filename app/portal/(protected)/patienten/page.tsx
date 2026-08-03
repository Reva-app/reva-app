"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, UserPlus, Search, ChevronUp, ChevronDown, Download, Users, AlertTriangle, UserX } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { PatientWizard } from "@/components/portal/PatientWizard";
import { PatientEditForm } from "@/components/portal/PatientEditForm";
import {
  loadPortalPatients, loadPortalLocations, loadPortalMembers,
  invitePortalPatient, updatePortalPatientStatus, deletePortalPatient, logPatientsExport,
  MANAGE_PATIENTS_ROLES, isPatientInactive,
  type PortalPatient, type PortalLocationOption, type PortalMember,
} from "@/lib/services/portalService";
import { loadRevaProtocols, loadOrgProtocols, type PortalProtocolCard } from "@/lib/services/protocolService";

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
      style={{ background: "var(--brand-accent, #e8632a)" }}
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

function genderLabel(gender: string | null) {
  if (gender === "man") return "Man";
  if (gender === "vrouw") return "Vrouw";
  if (gender === "anders") return "Anders";
  return "";
}

function statusLabel(status: string) {
  if (status === "active") return "Actief";
  if (status === "inactive") return "Inactief";
  if (status === "archived") return "Gearchiveerd";
  return status;
}

function accountStatusLabel(p: PortalPatient) {
  if (p.hasAccount) return "Actief";
  if (p.invitedAt) return `Uitgenodigd op ${formatDate(p.invitedAt)}`;
  return "Nog geen account";
}

function escapeCsvField(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function exportPatientsCsv(patients: PortalPatient[]) {
  const headers = [
    "Naam", "E-mail", "Telefoon", "Geboortedatum", "Geslacht", "Behandelaar", "Herstelplan",
    "Locatie", "Laatste check-in", "Dossierstatus", "Account", "Aangemaakt op",
  ];
  const rows = patients.map((p) => [
    p.fullName ?? "",
    p.email ?? "",
    p.phone ?? "",
    p.dateOfBirth ? formatDate(p.dateOfBirth) : "",
    genderLabel(p.gender),
    p.therapistName ?? "",
    p.protocolName ?? "",
    p.locationName ?? "",
    p.lastCheckinDate ? formatDate(p.lastCheckinDate) : "",
    statusLabel(p.status),
    accountStatusLabel(p),
    formatDate(p.createdAt),
  ]);
  const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `patienten-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = "name" | "therapist" | "protocol" | "location" | "lastCheckin" | "status";
const PAGE_SIZE = 20;

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

function SortableHeader({
  label, sortKeyValue, activeKey, direction, onSort, align = "left",
}: {
  label: string; sortKeyValue: SortKey; activeKey: SortKey; direction: "asc" | "desc";
  onSort: (key: SortKey) => void; align?: "left" | "right";
}) {
  const isActive = activeKey === sortKeyValue;
  return (
    <th
      onClick={() => onSort(sortKeyValue)}
      className={`${align === "left" ? "text-left" : "text-right"} font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3 cursor-pointer select-none hover:text-gray-600`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {isActive ? (direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
      </span>
    </th>
  );
}

export default function PortalPatientsPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [revaProtocols, setRevaProtocols] = useState<PortalProtocolCard[]>([]);
  const [orgProtocols, setOrgProtocols] = useState<PortalProtocolCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [showWizard, setShowWizard] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PortalPatient | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast, toastNode } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [checkinFilter, setCheckinFilter] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Vooraf filteren via een URL-parameter, zodat het dashboard hierheen kan
  // doorlinken (bv. "mijn patiënten" of "patiënten zonder recente activiteit").
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const therapist = params.get("therapist");
    const checkin = params.get("checkin");
    if (therapist) setTherapistFilter(therapist);
    if (checkin) setCheckinFilter(checkin);
  }, []);

  const canManagePatients = !!membership && MANAGE_PATIENTS_ROLES.includes(membership.roleKey);

  async function refresh(organizationId: string) {
    const [patientsData, locationsData, membersData, revaProtocolsData, orgProtocolsData] = await Promise.all([
      loadPortalPatients(organizationId),
      loadPortalLocations(organizationId),
      loadPortalMembers(organizationId),
      loadRevaProtocols(),
      loadOrgProtocols(organizationId),
    ]);
    setPatients(patientsData);
    setLocations(locationsData);
    setMembers(membersData);
    setRevaProtocols(revaProtocolsData);
    setOrgProtocols(orgProtocolsData);
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
      loadRevaProtocols(),
      loadOrgProtocols(organizationId),
    ]).then(([patientsData, locationsData, membersData, revaProtocolsData, orgProtocolsData]) => {
      if (cancelled) return;
      setPatients(patientsData);
      setLocations(locationsData);
      setMembers(membersData);
      setRevaProtocols(revaProtocolsData);
      setOrgProtocols(orgProtocolsData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (q && !(p.fullName?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (locationFilter && p.locationId !== locationFilter) return false;
      if (therapistFilter && p.therapistId !== therapistFilter) return false;
      if (protocolFilter && p.protocolName !== protocolFilter) return false;
      if (!matchesCheckinBucket(p.lastCheckinDate, checkinFilter)) return false;
      return true;
    });
  }, [patients, search, statusFilter, locationFilter, therapistFilter, protocolFilter, checkinFilter]);

  const sortedPatients = useMemo(() => {
    const sorted = [...filteredPatients].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = compareNullableStrings(a.fullName, b.fullName); break;
        case "therapist": cmp = compareNullableStrings(a.therapistName, b.therapistName); break;
        case "protocol": cmp = compareNullableStrings(a.protocolName, b.protocolName); break;
        case "location": cmp = compareNullableStrings(a.locationName, b.locationName); break;
        case "lastCheckin": cmp = compareNullableStrings(a.lastCheckinDate, b.lastCheckinDate); break;
        case "status": cmp = compareNullableStrings(a.status, b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPatients, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedPatients = sortedPatients.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const activeMembers = members.filter((m) => m.membershipStatus === "active");

  async function handleInviteAction(p: PortalPatient) {
    if (!p.email) { showToast("Dit dossier heeft geen e-mailadres.", "error"); return; }
    if (!membership) return;
    const result = await invitePortalPatient(p.id, membership.organizationId, p.email, true);
    if (result.outcome === "failed") {
      showToast(result.error, "error");
    } else {
      showToast(result.outcome === "linked" ? "Direct gekoppeld." : "Uitnodiging verstuurd.");
      if (membership) refresh(membership.organizationId);
    }
  }

  async function handleArchive(p: PortalPatient) {
    const nextStatus = p.status === "archived" ? "active" : "archived";
    const { error } = await updatePortalPatientStatus(p.id, nextStatus);
    if (error) {
      showToast("Opslaan mislukt: " + error, "error");
      return;
    }
    showToast(nextStatus === "archived" ? "Patiënt gearchiveerd" : "Patiënt gedearchiveerd");
    if (membership) refresh(membership.organizationId);
  }

  async function handleDelete(p: PortalPatient) {
    setDeleting(true);
    const { error } = await deletePortalPatient(p.id);
    setDeleting(false);
    setConfirmDeleteId(null);
    if (error) {
      showToast("Verwijderen mislukt: " + error, "error");
      return;
    }
    showToast("Patiënt verwijderd");
    if (membership) refresh(membership.organizationId);
  }

  const activePatientsCount = patients.filter((p) => p.status === "active").length;
  const lowActivityCount = patients.filter((p) => p.status === "active" && isPatientInactive(p.lastCheckinDate, p.createdAt)).length;
  const noAccountCount = patients.filter((p) => !p.hasAccount).length;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Patiënten"
          subtitle={loading ? "Laden…" : `${filteredPatients.length} van ${patients.length} ${patients.length === 1 ? "patiënt" : "patiënten"}`}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => {
            exportPatientsCsv(sortedPatients);
            if (membership) logPatientsExport(membership.organizationId, sortedPatients.length);
          }} disabled={sortedPatients.length === 0}>
            <Download size={14} />
            Exporteren
          </Button>
          {canManagePatients && !showWizard && !editingPatient && (
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <UserPlus size={14} />
              Patiënt toevoegen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Totaal" value={patients.length} icon={Users} />
        <StatCard label="Actief" value={activePatientsCount} icon={HeartPulse} />
        <StatCard label="Weinig activiteit" value={lowActivityCount} icon={AlertTriangle} />
        <StatCard label="Nog geen account" value={noAccountCount} icon={UserX} />
      </div>

      {showWizard && membership && (
        <Modal onClose={() => setShowWizard(false)} maxWidth="max-w-2xl" dismissOnBackdropClick={false}>
          <PatientWizard
            organizationId={membership.organizationId}
            locations={locations}
            members={members}
            revaProtocols={revaProtocols}
            orgProtocols={orgProtocols}
            onDone={() => { setShowWizard(false); if (membership) refresh(membership.organizationId); showToast("Patiënt toegevoegd"); }}
            onClose={() => setShowWizard(false)}
          />
        </Modal>
      )}

      {editingPatient && membership && (
        <Modal onClose={() => setEditingPatient(null)} maxWidth="max-w-2xl" dismissOnBackdropClick={false}>
          <PatientEditForm
            patient={editingPatient}
            locations={locations}
            members={members}
            onSaved={() => { setEditingPatient(null); refresh(membership.organizationId); showToast("Patiënt opgeslagen"); }}
            onClose={() => setEditingPatient(null)}
          />
        </Modal>
      )}

      {/* Filters */}
      <div className="rounded-2xl border p-4 flex flex-wrap gap-3 items-end" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Zoeken</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Naam of e-mailadres…" className="w-full text-sm rounded-xl border pl-9 pr-3 py-2 focus:outline-none" style={inputStyle}
            />
          </div>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Dossierstatus</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
            <option value="archived">Gearchiveerd</option>
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Locatie</label>
          <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Behandelaar</label>
          <select value={therapistFilter} onChange={(e) => { setTherapistFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {activeMembers.map((m) => <option key={m.userId} value={m.userId}>{m.fullName || m.email}</option>)}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Herstelplan</label>
          <select value={protocolFilter} onChange={(e) => { setProtocolFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {[...new Set([...orgProtocols, ...revaProtocols].map((p) => p.name))].sort().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Laatste check-in</label>
          <select value={checkinFilter} onChange={(e) => { setCheckinFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
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
                  <SortableHeader label="Naam" sortKeyValue="name" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Behandelaar" sortKeyValue="therapist" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Herstelplan" sortKeyValue="protocol" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Locatie" sortKeyValue="location" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Laatste check-in" sortKeyValue="lastCheckin" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Dossierstatus" sortKeyValue="status" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {pagedPatients.map((p) => {
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
                            {!p.hasAccount && (
                              <div className="text-xs">{accountBadge(p)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{p.therapistName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{p.protocolName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{p.locationName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{p.lastCheckinDate ? formatDate(p.lastCheckinDate) : "—"}</span>
                          {p.status === "active" && isPatientInactive(p.lastCheckinDate, p.createdAt) && (
                            <Badge variant="warning">{p.lastCheckinDate ? "Weinig activiteit" : "Nog geen activiteit"}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(p.status)}</td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {canManagePatients && (
                          <ActionMenu
                            items={[
                              { label: "Uitnodiging versturen", onClick: () => handleInviteAction(p) },
                              { label: "Wijzigen", onClick: () => setEditingPatient(p) },
                              { label: p.status === "archived" ? "Dearchiveren" : "Archiveren", onClick: () => handleArchive(p) },
                              { label: "Verwijderen", onClick: () => setConfirmDeleteId(p.id), danger: true },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && sortedPatients.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2" style={{ borderTop: "1px solid #f8f7f4" }}>
            <span className="text-xs text-gray-400">
              Pagina {safePage} van {totalPages} — {sortedPatients.length} {sortedPatients.length === 1 ? "resultaat" : "resultaten"}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Vorige</Button>
              <Button size="sm" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Volgende</Button>
            </div>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Patiënt verwijderen?"
          message="Dit verwijdert het volledige patiëntdossier permanent. Deze actie kan niet ongedaan worden gemaakt."
          confirmLabel="Verwijderen"
          loading={deleting}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            const p = patients.find((x) => x.id === confirmDeleteId);
            if (p) handleDelete(p);
          }}
        />
      )}
      {toastNode}
    </div>
  );
}
