"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalPatients, type PortalPatient } from "@/lib/services/portalService";
import {
  loadAuditLog, buildAuditFieldRows, VIEW_AUDIT_LOG_ROLES, AUDIT_TABLE_LABELS, AUDIT_ACTION_LABELS,
  type AuditLogEntry, type AuditAction,
} from "@/lib/services/auditService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function actionBadgeVariant(action: AuditAction): "success" | "warning" | "danger" | "purple" {
  if (action === "insert") return "success";
  if (action === "update") return "warning";
  if (action === "delete") return "danger";
  return "purple";
}

type SortKey = "createdAt";

export default function ActiviteitenlogPage() {
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
        <SectionHeader title="Activiteitenlog" subtitle="Wie wat heeft gewijzigd aan patiëntgegevens" />
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

      <div className="rounded-2xl border p-4 flex flex-wrap gap-3 items-end" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
        <div className="w-[calc(50%-0.375rem)] sm:w-36">
          <FieldLabel>Van</FieldLabel>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-36">
          <FieldLabel>Tot</FieldLabel>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-52">
          <FieldLabel>Patiënt</FieldLabel>
          <select value={patientFilter} onChange={(e) => setPatientFilter(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle patiënten</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <FieldLabel>Type</FieldLabel>
          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle types</option>
            {Object.entries(AUDIT_TABLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <FieldLabel>Actie</FieldLabel>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle acties</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nog geen activiteit"
            description="Wijzigingen aan patiëntgegevens verschijnen hier zodra ze plaatsvinden."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Datum &amp; tijd</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Gebruiker</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Patiënt</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-5 py-3.5 text-gray-800">{entry.actorName ?? "Onbekende gebruiker"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={actionBadgeVariant(entry.action)}>{AUDIT_ACTION_LABELS[entry.action]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{AUDIT_TABLE_LABELS[entry.tableName] ?? entry.tableName}</td>
                    <td className="px-5 py-3.5">
                      {entry.patientId ? (
                        <a href={`/portal/patienten/${entry.patientId}`} className="font-medium hover:underline" style={{ color: "#e8632a" }}>
                          {entry.patientName ?? "Onbekende patiënt"}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(entry.oldData || entry.newData) && (
                        <button type="button" onClick={() => setDetailEntry(entry)}
                          className="text-xs font-medium hover:opacity-70" style={{ color: "#e8632a" }}>
                          Bekijken
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} totalCount={entries.length} itemLabel="gebeurtenis" itemLabelPlural="gebeurtenissen" onPageChange={setPage} />
      </div>

      {detailEntry && (
        <Modal onClose={() => setDetailEntry(null)} maxWidth="max-w-lg">
          <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
            <h3 className="font-semibold text-gray-900 mb-1">
              {AUDIT_TABLE_LABELS[detailEntry.tableName] ?? detailEntry.tableName} · {AUDIT_ACTION_LABELS[detailEntry.action]}
            </h3>
            <p className="text-xs text-gray-400 mb-4">{formatDateTime(detailEntry.createdAt)} door {detailEntry.actorName ?? "Onbekende gebruiker"}</p>

            {detailEntry.tableName === "patients_csv_export" ? (
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
          </div>
        </Modal>
      )}
    </div>
  );
}
