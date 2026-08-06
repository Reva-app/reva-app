"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Plus, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SortableHeader } from "@/components/ui/table/SortableHeader";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadRevaSchedules, loadOrgSchedules, createScheduleLibraryItem, updateScheduleLibraryArchived, duplicateScheduleLibraryItem,
  deleteScheduleLibraryItem,
  MANAGE_PROTOCOLS_ROLES,
  type PortalScheduleLibraryCard,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

type SortKey = "title" | "exerciseCount" | "createdAt";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function PortalSchemasPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [revaSchedules, setRevaSchedules] = useState<PortalScheduleLibraryCard[]>([]);
  const [orgSchedules, setOrgSchedules] = useState<PortalScheduleLibraryCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [creatingDraft, setCreatingDraft] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PortalScheduleLibraryCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);

  function refresh(organizationId: string) {
    Promise.all([loadRevaSchedules(), loadOrgSchedules(organizationId)]).then(([reva, org]) => {
      setRevaSchedules(reva);
      setOrgSchedules(org);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([loadRevaSchedules(), loadOrgSchedules(membership.organizationId)]).then(([reva, org]) => {
      if (cancelled) return;
      setRevaSchedules(reva);
      setOrgSchedules(org);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership]);

  const allSchedules = useMemo(() => [...orgSchedules, ...revaSchedules], [orgSchedules, revaSchedules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSchedules.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false;
      if (statusFilter === "actief" && s.archived) return false;
      if (statusFilter === "gearchiveerd" && !s.archived) return false;
      if (sourceFilter && s.scope !== sourceFilter) return false;
      return true;
    });
  }, [allSchedules, search, statusFilter, sourceFilter]);

  const { sortKey, sortDir, handleSort, setSort, page, setPage, totalPages, paged } = useTableState<PortalScheduleLibraryCard, SortKey>(
    filtered,
    (a, b, key) =>
      key === "title" ? compareNullableStrings(a.title, b.title)
      : key === "exerciseCount" ? a.exerciseCount - b.exerciseCount
      : a.createdAt.localeCompare(b.createdAt),
    "title",
    20,
    (key) => (key === "createdAt" ? "desc" : "asc")
  );

  async function handleCreateDraft() {
    if (!membership) return;
    setCreatingDraft(true);
    const { id, error } = await createScheduleLibraryItem(membership.organizationId, { title: "Nieuw schema", description: "" });
    setCreatingDraft(false);
    if (error || !id) { showToast(error ?? "Aanmaken is niet gelukt.", "error"); return; }
    router.push(`/portal/schemas/${id}?draft=1`);
  }

  async function handleToggleArchived(s: PortalScheduleLibraryCard) {
    if (!membership) return;
    const nextArchived = !s.archived;
    const { error } = await updateScheduleLibraryArchived(s.id, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Schema gearchiveerd" : "Schema gedearchiveerd");
    refresh(membership.organizationId);
  }

  async function handleDuplicate(s: PortalScheduleLibraryCard) {
    if (!membership) return;
    const { error } = await duplicateScheduleLibraryItem(s.id, membership.organizationId);
    if (error) { showToast(error, "error"); return; }
    showToast("Schema gedupliceerd naar eigen bibliotheek");
    refresh(membership.organizationId);
  }

  async function handleConfirmDelete() {
    if (!confirmDelete || !membership) return;
    setDeleting(true);
    const { error } = await deleteScheduleLibraryItem(confirmDelete.id);
    setDeleting(false);
    if (error) { showToast(error, "error"); setConfirmDelete(null); return; }
    showToast("Schema verwijderd");
    setConfirmDelete(null);
    refresh(membership.organizationId);
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Schema's" subtitle={loading ? "Laden…" : `${filtered.length} van ${allSchedules.length} ${allSchedules.length === 1 ? "schema" : "schema's"}`} />
        {canManage && (
          <Button size="sm" disabled={creatingDraft} onClick={handleCreateDraft}>
            <Plus size={14} /> {creatingDraft ? "Aanmaken…" : "Schema toevoegen"}
          </Button>
        )}
      </div>

      <div className="rounded-2xl border p-4 flex flex-wrap gap-3 items-end" style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
        <div className="flex-1 min-w-[200px]">
          <FieldLabel>Zoeken</FieldLabel>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Naam…" className="w-full text-sm rounded-xl border pl-9 pr-3 py-2 focus:outline-none" style={inputStyle}
            />
          </div>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <FieldLabel>Status</FieldLabel>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <FieldLabel>Bron</FieldLabel>
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="organization">Eigen bibliotheek</option>
            <option value="reva">REVA-bibliotheek</option>
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <FieldLabel>Sorteren</FieldLabel>
          <select
            value={sortKey === "createdAt" && sortDir === "desc" ? "nieuwste" : "naam"}
            onChange={(e) => {
              if (e.target.value === "nieuwste") setSort("createdAt", "desc");
              else setSort("title", "asc");
            }}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
          >
            <option value="naam">Naam (A-Z)</option>
            <option value="nieuwste">Nieuwste eerst</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={allSchedules.length === 0 ? "Nog geen schema's" : "Geen schema's gevonden"}
            description={allSchedules.length === 0 ? "Maak je eerste schema aan om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <SortableHeader label="Schema" sortKeyValue="title" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Omschrijving</th>
                  <SortableHeader label="Oefeningen" sortKeyValue="exerciseCount" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Aangemaakt" sortKeyValue="createdAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt door</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Bron</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/portal/schemas/${s.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ borderBottom: "1px solid #f8f7f4" }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f8f7f4" }}>
                          <ListChecks size={15} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-800 truncate">{s.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{s.description || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-600">{s.exerciseCount}</td>
                    <td className="px-5 py-3.5 text-gray-500">{fmtDate(s.createdAt)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{s.createdByName ?? "—"}</td>
                    <td className="px-5 py-3.5">{s.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}</td>
                    <td className="px-5 py-3.5">{s.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <ActionMenu
                          items={
                            s.scope === "organization"
                              ? [
                                  { label: "Dupliceren", onClick: () => handleDuplicate(s) },
                                  { label: s.archived ? "Dearchiveren" : "Archiveren", onClick: () => handleToggleArchived(s) },
                                  ...(s.archived ? [{ label: "Verwijderen", onClick: () => setConfirmDelete(s), danger: true }] : []),
                                ]
                              : [{ label: "Dupliceren", onClick: () => handleDuplicate(s) }]
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} itemLabel="resultaat" itemLabelPlural="resultaten" onPageChange={setPage} />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Schema verwijderen?"
          message={`"${confirmDelete.title}" wordt permanent verwijderd. Dit kan alleen als het schema nergens meer in een herstelplan wordt gebruikt.`}
          confirmLabel="Schema verwijderen"
          loading={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {toastNode}
    </div>
  );
}
