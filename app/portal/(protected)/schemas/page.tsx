"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { ResponsiveList, type ListColumn } from "@/components/ui/ResponsiveList";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field, Select } from "@/components/ui/Field";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadRevaSchedules, loadOrgSchedules, createScheduleLibraryItem, updateScheduleLibraryArchived, duplicateScheduleLibraryItem,
  deleteScheduleLibraryItem,
  MANAGE_PROTOCOLS_ROLES,
  type PortalScheduleLibraryCard,
} from "@/lib/services/protocolService";

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

type SortKey = "title" | "exerciseCount" | "createdAt";

const SORT_OPTIONS: { key: SortKey; dir: "asc" | "desc"; label: string }[] = [
  { key: "title", dir: "asc", label: "Naam (A-Z)" },
  { key: "title", dir: "desc", label: "Naam (Z-A)" },
  { key: "exerciseCount", dir: "desc", label: "Meeste oefeningen" },
  { key: "createdAt", dir: "desc", label: "Nieuwste eerst" },
];

function sourceBadge(s: PortalScheduleLibraryCard) {
  return s.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>;
}

function statusBadge(s: PortalScheduleLibraryCard) {
  return s.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>;
}

function ScheduleIcon() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f8f7f4" }}>
      <ListChecks size={15} className="text-gray-400" aria-hidden />
    </div>
  );
}

const SCHEDULE_COLUMNS: ListColumn<PortalScheduleLibraryCard, SortKey>[] = [
  {
    key: "title", header: "Schema", sortKey: "title",
    cell: (s) => (
      <div className="flex items-center gap-3 min-w-[260px]">
        <ScheduleIcon />
        <div className="min-w-0">
          <p className="font-medium text-gray-900 [overflow-wrap:anywhere]">{s.title}</p>
          {s.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{s.description}</p>}
        </div>
      </div>
    ),
  },
  { key: "exerciseCount", header: "Oefeningen", sortKey: "exerciseCount", className: "text-gray-600", cell: (s) => s.exerciseCount },
  {
    key: "source", header: "Bron",
    cell: (s) => (
      <div className="whitespace-nowrap">
        {sourceBadge(s)}
        {s.scope !== "reva" && s.createdByName && <p className="text-xs text-gray-400 mt-1">{s.createdByName}</p>}
      </div>
    ),
  },
  { key: "status", header: "Status", cell: statusBadge },
];

/** Kaart op telefoon: volledige naam, aantal oefeningen en herkomst. */
function ScheduleCard({ schedule: s }: { schedule: PortalScheduleLibraryCard }) {
  const details = [`${s.exerciseCount} ${s.exerciseCount === 1 ? "oefening" : "oefeningen"}`, s.createdByName].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start gap-3">
      <ScheduleIcon />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 leading-snug [overflow-wrap:anywhere]">{s.title}</p>
        {s.description && <p className="text-sm text-gray-600 leading-snug mt-0.5 line-clamp-2">{s.description}</p>}
        <p className="text-xs text-gray-500 mt-1">{details}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sourceBadge(s)}
          {s.archived && statusBadge(s)}
        </div>
      </div>
    </div>
  );
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

  const activeFilterCount = [statusFilter, sourceFilter].filter(Boolean).length;
  function resetFilters() {
    setStatusFilter(""); setSourceFilter("");
    setPage(1);
  }

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

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Naam…"
        activeCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={filtered.length}
      >
        <Field label="Status" className="md:w-40">
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
          </Select>
        </Field>
        <Field label="Bron" className="md:w-44">
          <Select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            <option value="organization">Eigen bibliotheek</option>
            <option value="reva">REVA-bibliotheek</option>
          </Select>
        </Field>
      </FilterBar>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={allSchedules.length === 0 ? "Nog geen schema's" : "Geen schema's gevonden"}
            description={allSchedules.length === 0 ? "Maak je eerste schema aan om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <ResponsiveList
            rows={paged}
            rowKey={(s) => s.id}
            rowLabel={(s) => s.title}
            onRowClick={(s) => router.push(`/portal/schemas/${s.id}`)}
            columns={SCHEDULE_COLUMNS}
            card={(s) => <ScheduleCard schedule={s} />}
            actions={canManage ? (s) =>
              s.scope === "organization"
                ? [
                    { label: "Dupliceren", onClick: () => handleDuplicate(s) },
                    { label: s.archived ? "Dearchiveren" : "Archiveren", onClick: () => handleToggleArchived(s) },
                    ...(s.archived ? [{ label: "Verwijderen", onClick: () => setConfirmDelete(s), danger: true }] : []),
                  ]
                : [{ label: "Dupliceren", onClick: () => handleDuplicate(s) }]
              : undefined}
            sort={{ key: sortKey, dir: sortDir, onSort: handleSort, onSet: setSort, options: SORT_OPTIONS }}
          />
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
