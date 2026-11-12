"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, UserPlus, Download } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { ResponsiveList } from "@/components/ui/ResponsiveList";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/table/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { PatientWizard } from "@/components/portal/PatientWizard";
import { PatientEditForm } from "@/components/portal/PatientEditForm";
import { PatientDirectory } from "@/components/portal/PatientDirectory";
import { PATIENT_COLUMNS, PatientCard, patientNeedsAttention, type PatientSortKey } from "@/components/portal/PatientListParts";
import {
  loadPortalPatients, loadPortalLocations, loadPortalMembers,
  invitePortalPatient, updatePortalPatientStatus, deletePortalPatient, logPatientsExport,
  MANAGE_PATIENTS_ROLES, canViewClinicalData,
  type PortalPatient, type PortalLocationOption, type PortalMember,
} from "@/lib/services/portalService";
import { loadRevaProtocols, loadOrgProtocols, type PortalProtocolCard } from "@/lib/services/protocolService";

const CHECKIN_BUCKETS = [
  { value: "", label: "Alle" },
  { value: "7", label: "Laatste 7 dagen" },
  { value: "30", label: "Laatste 30 dagen" },
  { value: "older", label: "Langer dan 30 dagen geleden" },
  { value: "none", label: "Nog geen check-in" },
];

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

type SortKey = PatientSortKey;

type Segment = "actief" | "aandacht" | "account" | "niet_actief" | "alle";

function matchesSegment(p: PortalPatient, segment: Segment): boolean {
  switch (segment) {
    case "actief": return p.status === "active";
    case "aandacht": return patientNeedsAttention(p);
    case "account": return p.status !== "archived" && !p.hasAccount;
    case "niet_actief": return p.status !== "active";
    default: return true;
  }
}
const PAGE_SIZE = 20;

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

const SORT_OPTIONS: { key: SortKey; dir: "asc" | "desc"; label: string }[] = [
  { key: "name", dir: "asc", label: "Naam (A-Z)" },
  { key: "name", dir: "desc", label: "Naam (Z-A)" },
  { key: "lastCheckin", dir: "desc", label: "Laatste check-in (recent)" },
  { key: "lastCheckin", dir: "asc", label: "Laatste check-in (oudst)" },
  { key: "therapist", dir: "asc", label: "Behandelaar" },
  { key: "protocol", dir: "asc", label: "Herstelplan" },
  { key: "location", dir: "asc", label: "Locatie" },
  { key: "status", dir: "asc", label: "Dossierstatus" },
];

/**
 * Behandelaars (eigenaar, therapeut) krijgen het volledige overzicht met
 * dossiers; overige (oude) rollen alleen de contactlijst.
 */
export default function PortalPatientsPage() {
  const { checked, membership } = usePortalMembership();
  if (!checked || !membership) {
    return <p className="text-sm text-subtle p-6">Laden…</p>;
  }
  return canViewClinicalData(membership.roleKey)
    ? <ClinicalPatientsPage />
    : <PatientDirectory organizationId={membership.organizationId} />;
}

function ClinicalPatientsPage() {
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
  const [segment, setSegment] = useState<Segment>("actief");
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
    // Vanuit de snelle-actieknop (PortalQuickActionFAB): direct de wizard openen.
    if (params.get("nieuw") === "1") {
      setShowWizard(true);
      params.delete("nieuw");
      const rest = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
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
      if (!matchesSegment(p, segment)) return false;
      if (locationFilter && p.locationId !== locationFilter) return false;
      if (therapistFilter && p.therapistId !== therapistFilter) return false;
      if (protocolFilter && p.protocolName !== protocolFilter) return false;
      if (!matchesCheckinBucket(p.lastCheckinDate, checkinFilter)) return false;
      return true;
    });
  }, [patients, search, segment, locationFilter, therapistFilter, protocolFilter, checkinFilter]);

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

  function setSort(key: SortKey, dir: "asc" | "desc") {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }

  function resetFilters() {
    setLocationFilter(""); setTherapistFilter(""); setProtocolFilter(""); setCheckinFilter("");
    setPage(1);
  }
  const activeFilterCount = [locationFilter, therapistFilter, protocolFilter, checkinFilter].filter(Boolean).length;

  const activeMembers = members.filter((m) => m.membershipStatus === "active");

  async function handleInviteAction(p: PortalPatient) {
    if (!p.email) { showToast("Dit dossier heeft geen e-mailadres.", "error"); return; }
    if (!membership) return;
    const result = await invitePortalPatient(p.id, membership.organizationId, p.email, true);
    if (result.outcome === "failed") {
      showToast(result.error, "error");
    } else {
      showToast(result.outcome === "linked" ? "Gekoppeld aan bestaand account, e-mail verstuurd." : "Uitnodiging verstuurd.");
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

  const segmentCount = (seg: Segment) => patients.filter((p) => matchesSegment(p, seg)).length;
  const segmentOptions: { value: Segment; label: string }[] = [
    { value: "actief", label: `Actief (${segmentCount("actief")})` },
    { value: "aandacht", label: `Aandacht nodig (${segmentCount("aandacht")})` },
    { value: "account", label: `Nog geen account (${segmentCount("account")})` },
    { value: "niet_actief", label: `Inactief & gearchiveerd (${segmentCount("niet_actief")})` },
    { value: "alle", label: `Alle (${patients.length})` },
  ];

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

      {showWizard && membership && (
        <Modal onClose={() => setShowWizard(false)} maxWidth="max-w-3xl" dismissOnBackdropClick={false}>
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

      <Tabs options={segmentOptions} value={segment} onChange={(v) => { setSegment(v); setPage(1); }} />

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Naam of e-mailadres…"
        activeCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={filteredPatients.length}
      >
        <Field label="Locatie" className="md:w-44">
          <Select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Behandelaar" className="md:w-40">
          <Select value={therapistFilter} onChange={(e) => { setTherapistFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            {activeMembers.map((m) => <option key={m.userId} value={m.userId}>{m.fullName || m.email}</option>)}
          </Select>
        </Field>
        <Field label="Herstelplan" className="md:w-40">
          <Select value={protocolFilter} onChange={(e) => { setProtocolFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            {[...new Set([...orgProtocols, ...revaProtocols].map((p) => p.name))].sort().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Laatste check-in" className="md:w-44">
          <Select value={checkinFilter} onChange={(e) => { setCheckinFilter(e.target.value); setPage(1); }}>
            {CHECKIN_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </Select>
        </Field>
      </FilterBar>

      {/* Vanaf md één kaart met een tabel; op telefoon losse patiëntkaarten. */}
      <div className="md:rounded-2xl md:border md:overflow-hidden md:bg-white md:border-[#e8e5df] md:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {loading ? (
          <p className="text-sm text-gray-500 p-6 rounded-2xl border bg-white md:border-0 md:rounded-none" style={{ borderColor: "#e8e5df" }}>Laden…</p>
        ) : filteredPatients.length === 0 ? (
          <div className="rounded-2xl border bg-white md:border-0 md:rounded-none" style={{ borderColor: "#e8e5df" }}>
          <EmptyState
            icon={HeartPulse}
            title={patients.length === 0 ? "Nog geen patiënten" : segment === "aandacht" && !search && activeFilterCount === 0 ? "Niemand heeft nu extra aandacht nodig" : "Geen patiënten gevonden"}
            description={patients.length === 0
              ? "Voeg een patiëntdossier toe om te beginnen."
              : segment === "aandacht" && !search && activeFilterCount === 0
                ? "Patiënten met signalen uit hun check-in of weinig activiteit verschijnen hier."
                : "Pas de zoekopdracht, filters of de gekozen groep aan."}
          />
          </div>
        ) : (
          <ResponsiveList
            rows={pagedPatients}
            rowKey={(p) => p.id}
            rowLabel={(p) => p.fullName || "Patiënt zonder naam"}
            onRowClick={(p) => router.push(`/portal/patienten/${p.id}`)}
            columns={PATIENT_COLUMNS}
            card={(p) => <PatientCard patient={p} />}
            mobileVariant="cards"
            actions={canManagePatients ? (p) => [
              { label: "Uitnodiging versturen", onClick: () => handleInviteAction(p) },
              { label: "Wijzigen", onClick: () => setEditingPatient(p) },
              { label: p.status === "archived" ? "Dearchiveren" : "Archiveren", onClick: () => handleArchive(p) },
              { label: "Verwijderen", onClick: () => setConfirmDeleteId(p.id), danger: true },
            ] : undefined}
            sort={{
              key: sortKey,
              dir: sortDir,
              onSort: handleSort,
              onSet: setSort,
              options: SORT_OPTIONS,
            }}
          />
        )}
        {!loading && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalCount={sortedPatients.length}
            itemLabel="resultaat"
            itemLabelPlural="resultaten"
            onPageChange={setPage}
          />
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
