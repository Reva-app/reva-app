"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/DatePicker";
import { History } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { ResponsiveList, type ListColumn } from "@/components/ui/ResponsiveList";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field, Select } from "@/components/ui/Field";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalPatients, type PortalPatient } from "@/lib/services/portalService";
import {
  loadAuditLog, buildAuditFieldRows, VIEW_AUDIT_LOG_ROLES, AUDIT_TABLE_LABELS, AUDIT_ACTION_LABELS,
  type AuditLogEntry, type AuditAction,
} from "@/lib/services/auditService";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function actionBadgeVariant(action: AuditAction): "success" | "warning" | "danger" | "purple" | "blue" {
  if (action === "view") return "blue";
  if (action === "insert") return "success";
  if (action === "update") return "warning";
  if (action === "delete") return "danger";
  return "purple";
}

function entryTypeLabel(entry: AuditLogEntry) {
  return AUDIT_TABLE_LABELS[entry.tableName] ?? entry.tableName;
}

type SortKey = "createdAt";

const AUDIT_COLUMNS = (onDetails: (entry: AuditLogEntry) => void): ListColumn<AuditLogEntry, SortKey>[] => [
  { key: "createdAt", header: "Datum & tijd", className: "text-gray-500 whitespace-nowrap", cell: (e) => formatDateTime(e.createdAt) },
  { key: "actor", header: "Gebruiker", className: "text-gray-800", cell: (e) => e.actorName ?? "Onbekende gebruiker" },
  { key: "action", header: "Actie", cell: (e) => <Badge variant={actionBadgeVariant(e.action)}>{AUDIT_ACTION_LABELS[e.action]}</Badge> },
  { key: "type", header: "Type", className: "text-gray-600", cell: entryTypeLabel },
  {
    key: "patient", header: "Patiënt",
    cell: (e) => e.patientId ? (
      <a
        href={`/portal/patienten/${e.patientId}`}
        onClick={(ev) => ev.stopPropagation()}
        className="font-medium hover:underline" style={{ color: "#e8632a" }}
      >
        {e.patientName ?? "Onbekende patiënt"}
      </a>
    ) : (
      <span className="text-gray-400">—</span>
    ),
  },
  {
    key: "details", header: "Details", align: "right",
    cell: (e) => (e.oldData || e.newData) && (
      <button type="button" onClick={(ev) => { ev.stopPropagation(); onDetails(e); }}
        className="text-xs font-medium hover:opacity-70" style={{ color: "#e8632a" }}>
        Bekijken
      </button>
    ),
  },
];

/** Kaart op telefoon: wat er gebeurde, bij wie, door wie en wanneer. */
function AuditCard({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={actionBadgeVariant(entry.action)}>{AUDIT_ACTION_LABELS[entry.action]}</Badge>
        <span className="text-sm text-gray-700">{entryTypeLabel(entry)}</span>
      </div>
      <p className="font-medium text-gray-900 leading-snug mt-1.5">
        {entry.patientId ? (entry.patientName ?? "Onbekende patiënt") : <span className="text-gray-500 font-normal">Geen patiënt</span>}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        {entry.actorName ?? "Onbekende gebruiker"} · {formatDateTime(entry.createdAt)}
      </p>
    </div>
  );
}

export default function ActiviteitenlogPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const canView = !!membership && VIEW_AUDIT_LOG_ROLES.includes(membership.roleKey);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const [patientFilter, setPatientFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (!checked || !membership || !canView) return;
    loadPortalPatients(membership.organizationId).then(setPatients);
  }, [checked, membership, canView]);

  useEffect(() => {
    if (!checked || !membership || !canView) return;
    let cancelled = false;
    loadAuditLog(membership.organizationId, {
      patientId: patientFilter || undefined,
      tableName: tableFilter || undefined,
      action: (actionFilter as AuditAction) || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then((data) => {
      if (cancelled) return;
      setEntries(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, canView, patientFilter, tableFilter, actionFilter, dateFrom, dateTo]);

  const activeFilterCount = [patientFilter, tableFilter, actionFilter, dateFrom, dateTo].filter(Boolean).length;
  function resetFilters() {
    setPatientFilter(""); setTableFilter(""); setActionFilter(""); setDateFrom(""); setDateTo("");
    setPage(1);
  }

  const { page, setPage, totalPages, paged } = useTableState<AuditLogEntry, SortKey>(
    entries,
    (a, b) => a.createdAt.localeCompare(b.createdAt),
    "createdAt",
    30,
    () => "desc"
  );

  if (checked && membership && !canView) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SectionHeader title="Activiteitenlog" subtitle="Wie welk dossier heeft bekeken of gewijzigd" />
        <p className="text-sm text-gray-400 mt-4">
          Alleen de praktijkeigenaar kan het activiteitenlog bekijken.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <SectionHeader
        title="Activiteitenlog"
        subtitle={loading ? "Laden…" : `${entries.length} ${entries.length === 1 ? "gebeurtenis" : "gebeurtenissen"}`}
      />

      <FilterBar
        activeCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={entries.length}
      >
        <Field label="Van" className="md:w-44">
          <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="Datum" />
        </Field>
        <Field label="Tot" className="md:w-44">
          <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="Datum" />
        </Field>
        <Field label="Patiënt" className="md:w-52">
          <Select value={patientFilter} onChange={(e) => { setPatientFilter(e.target.value); setPage(1); }}>
            <option value="">Alle patiënten</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </Select>
        </Field>
        <Field label="Type" className="md:w-44">
          <Select value={tableFilter} onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}>
            <option value="">Alle types</option>
            {Object.entries(AUDIT_TABLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Actie" className="md:w-40">
          <Select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="">Alle acties</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        </Field>
      </FilterBar>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Laden…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={History}
            title={activeFilterCount > 0 ? "Geen activiteit gevonden" : "Nog geen activiteit"}
            description={activeFilterCount > 0
              ? "Pas de filters aan om meer resultaten te zien."
              : "Inzage en wijzigingen van patiëntgegevens verschijnen hier zodra ze plaatsvinden."}
          />
        ) : (
          <ResponsiveList
            rows={paged}
            rowKey={(entry) => entry.id}
            rowLabel={(entry) => `${AUDIT_ACTION_LABELS[entry.action]}: ${entryTypeLabel(entry)}${entry.patientName ? `, ${entry.patientName}` : ""}`}
            onRowClick={setDetailEntry}
            columns={AUDIT_COLUMNS(setDetailEntry)}
            card={(entry) => <AuditCard entry={entry} />}
          />
        )}
        <Pagination page={page} totalPages={totalPages} totalCount={entries.length} itemLabel="gebeurtenis" itemLabelPlural="gebeurtenissen" onPageChange={setPage} />
      </div>

      {detailEntry && (
        <Modal onClose={() => setDetailEntry(null)} maxWidth="max-w-lg">
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-1">
              {entryTypeLabel(detailEntry)} · {AUDIT_ACTION_LABELS[detailEntry.action]}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {formatDateTime(detailEntry.createdAt)} door {detailEntry.actorName ?? "Onbekende gebruiker"}
              {detailEntry.patientName && <> · {detailEntry.patientName}</>}
            </p>

            {!detailEntry.oldData && !detailEntry.newData ? (
              <p className="text-sm text-gray-500">Bij deze gebeurtenis zijn geen gegevens gewijzigd.</p>
            ) : detailEntry.tableName === "patients_csv_export" ? (
              <p className="text-sm text-gray-600">
                {(detailEntry.newData?.exported_count as number | undefined) ?? "Een onbekend aantal"} patiënten geëxporteerd als CSV-bestand.
              </p>
            ) : (
              (() => {
                const rows = buildAuditFieldRows(detailEntry);
                if (rows.length === 0) {
                  return <p className="text-sm text-gray-400">Geen zichtbare wijzigingen — alleen interne velden zijn aangepast.</p>;
                }
                return (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e8e5df" }}>
                    {rows.map((row, i) => (
                      <div
                        key={row.key}
                        className="px-4 py-2.5 text-sm"
                        style={{ background: i % 2 === 0 ? "#ffffff" : "#f8f7f4" }}
                      >
                        <p className="text-xs font-medium text-gray-500 mb-0.5">{row.label}</p>
                        {row.oldValue !== null ? (
                          <p className="text-gray-800">
                            <span className="text-gray-400 line-through">{row.oldValue}</span>{" "}
                            <span className="text-gray-400">→</span> {row.newValue}
                          </p>
                        ) : (
                          <p className="text-gray-800">{row.newValue}</p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}

            <ModalFooter inset="lg" className="justify-end">
              {detailEntry.patientId && (
                <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/portal/patienten/${detailEntry.patientId}`)}>
                  Naar dossier
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => setDetailEntry(null)}>Sluiten</Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
