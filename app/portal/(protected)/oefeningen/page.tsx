"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { StatStrip } from "@/components/ui/StatStrip";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { ResponsiveList, type ListColumn } from "@/components/ui/ResponsiveList";
import { FilterBar } from "@/components/ui/FilterBar";
import { Field, Select } from "@/components/ui/Field";
import { formatDate } from "@/lib/data";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadExerciseLibrary, createOrgExercise, updateExerciseArchived, deleteOrgExercise, duplicateExerciseLibraryItem,
  MANAGE_PROTOCOLS_ROLES, EXERCISE_TYPE_LABELS,
  type PortalExerciseLibraryItem,
} from "@/lib/services/protocolService";

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "nl");
}

type SortKey = "title" | "exerciseType" | "createdAt";

const SORT_OPTIONS: { key: SortKey; dir: "asc" | "desc"; label: string }[] = [
  { key: "title", dir: "asc", label: "Naam (A-Z)" },
  { key: "title", dir: "desc", label: "Naam (Z-A)" },
  { key: "exerciseType", dir: "asc", label: "Categorie" },
  { key: "createdAt", dir: "desc", label: "Nieuwste eerst" },
];

function typeLabel(ex: PortalExerciseLibraryItem) {
  return EXERCISE_TYPE_LABELS[ex.exerciseType] ?? ex.exerciseType;
}

function sourceBadge(ex: PortalExerciseLibraryItem) {
  return ex.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>;
}

function statusBadge(ex: PortalExerciseLibraryItem) {
  return ex.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>;
}

function tagBadges(ex: PortalExerciseLibraryItem) {
  return (
    <>
      {ex.tags.slice(0, 3).map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
      {ex.tags.length > 3 && <Badge variant="muted">+{ex.tags.length - 3}</Badge>}
    </>
  );
}

const EXERCISE_COLUMNS: ListColumn<PortalExerciseLibraryItem, SortKey>[] = [
  {
    key: "title", header: "Oefening", sortKey: "title",
    cell: (ex) => (
      <div className="flex items-center gap-3">
        <ExerciseThumb mediaPath={ex.mediaPath} mediaType={ex.mediaType} size={36} />
        <p className="font-medium text-gray-800 min-w-0 [overflow-wrap:anywhere]">{ex.title}</p>
      </div>
    ),
  },
  { key: "exerciseType", header: "Categorie", sortKey: "exerciseType", className: "text-gray-600", cell: typeLabel },
  { key: "tags", header: "Tags", hideBelow: "lg", cell: (ex) => <div className="flex flex-wrap gap-1">{tagBadges(ex)}</div> },
  { key: "source", header: "Bron", cell: sourceBadge },
  { key: "status", header: "Status", cell: statusBadge },
  { key: "creator", header: "Aangemaakt door", hideBelow: "xl", className: "text-gray-600", cell: (ex) => ex.createdByName ?? "—" },
  { key: "createdAt", header: "Aangemaakt", sortKey: "createdAt", hideBelow: "xl", className: "text-gray-500 whitespace-nowrap", cell: (ex) => formatDate(ex.createdAt) },
];

/** Kaart op telefoon: beeld, volledige naam, categorie en herkomst. */
function ExerciseCard({ exercise: ex }: { exercise: PortalExerciseLibraryItem }) {
  return (
    <div className="flex items-start gap-3">
      <ExerciseThumb mediaPath={ex.mediaPath} mediaType={ex.mediaType} size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 leading-snug [overflow-wrap:anywhere]">{ex.title}</p>
        <p className="text-xs text-gray-500 mt-1">{[typeLabel(ex), ex.createdByName].filter(Boolean).join(" · ")}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sourceBadge(ex)}
          {ex.archived && statusBadge(ex)}
          {tagBadges(ex)}
        </div>
      </div>
    </div>
  );
}

export default function PortalOefeningenPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const [exercises, setExercises] = useState<PortalExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [creatingDraft, setCreatingDraft] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PortalExerciseLibraryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);

  function refresh(organizationId: string) {
    loadExerciseLibrary(organizationId).then((data) => { setExercises(data); setLoading(false); });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    loadExerciseLibrary(membership.organizationId).then((data) => {
      if (cancelled) return;
      setExercises(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) for (const t of ex.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b, "nl"));
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (q && !ex.title.toLowerCase().includes(q)) return false;
      if (statusFilter === "actief" && ex.archived) return false;
      if (statusFilter === "gearchiveerd" && !ex.archived) return false;
      if (categoryFilter && ex.exerciseType !== categoryFilter) return false;
      if (sourceFilter && ex.scope !== sourceFilter) return false;
      if (tagFilter && !ex.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [exercises, search, statusFilter, categoryFilter, sourceFilter, tagFilter]);

  const { sortKey, sortDir, handleSort, setSort, page, setPage, totalPages, paged } = useTableState<PortalExerciseLibraryItem, SortKey>(
    filtered,
    (a, b, key) => {
      if (key === "title") return compareNullableStrings(a.title, b.title);
      if (key === "createdAt") return a.createdAt.localeCompare(b.createdAt);
      return compareNullableStrings(a.exerciseType, b.exerciseType);
    },
    "title"
  );

  const ownCount = exercises.filter((e) => e.scope === "organization").length;
  const revaCount = exercises.filter((e) => e.scope === "reva").length;
  const archivedCount = exercises.filter((e) => e.archived).length;

  const activeFilterCount = [statusFilter, categoryFilter, sourceFilter, tagFilter].filter(Boolean).length;
  function resetFilters() {
    setStatusFilter(""); setCategoryFilter(""); setSourceFilter(""); setTagFilter("");
    setPage(1);
  }

  async function handleCreateDraft() {
    if (!membership) return;
    setCreatingDraft(true);
    const { id, error } = await createOrgExercise(membership.organizationId, {
      title: "Nieuwe oefening", exerciseType: "kracht", description: "", instructions: "",
      defaultSets: null, defaultReps: null, defaultDurationSeconds: null, defaultLoadText: "",
      tags: [], mediaPath: null, mediaType: null,
    });
    setCreatingDraft(false);
    if (error || !id) { showToast(error ?? "Aanmaken is niet gelukt.", "error"); return; }
    router.push(`/portal/oefeningen/${id}?draft=1`);
  }

  async function handleToggleArchived(ex: PortalExerciseLibraryItem) {
    if (!membership) return;
    const nextArchived = !ex.archived;
    const { error } = await updateExerciseArchived(ex.id, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Oefening gearchiveerd" : "Oefening gedearchiveerd");
    refresh(membership.organizationId);
  }

  async function handleConfirmDelete() {
    if (!confirmDelete || !membership) return;
    setDeleting(true);
    const { error } = await deleteOrgExercise(confirmDelete.id);
    setDeleting(false);
    if (error) { showToast(error, "error"); setConfirmDelete(null); return; }
    showToast("Oefening verwijderd");
    setConfirmDelete(null);
    refresh(membership.organizationId);
  }

  async function handleDuplicate(ex: PortalExerciseLibraryItem) {
    if (!membership) return;
    const { error } = await duplicateExerciseLibraryItem(ex.id, membership.organizationId);
    if (error) { showToast(error, "error"); return; }
    showToast("Oefening gedupliceerd naar eigen bibliotheek");
    refresh(membership.organizationId);
  }


  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Oefeningen" subtitle={loading ? "Laden…" : `${filtered.length} van ${exercises.length} ${exercises.length === 1 ? "oefening" : "oefeningen"}`} />
        {canManage && (
          <Button size="sm" disabled={creatingDraft} onClick={handleCreateDraft}>
            <Plus size={14} /> {creatingDraft ? "Aanmaken…" : "Nieuwe oefening"}
          </Button>
        )}
      </div>

      <StatStrip
        items={[
          { label: "Totaal", value: exercises.length, icon: Dumbbell },
          { label: "Eigen bibliotheek", value: ownCount, icon: Dumbbell },
          { label: "REVA-bibliotheek", value: revaCount, icon: Dumbbell },
          { label: "Gearchiveerd", value: archivedCount, icon: Dumbbell },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Naam…"
        activeCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={filtered.length}
      >
        <Field label="Status" className="md:w-36">
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
          </Select>
        </Field>
        <Field label="Categorie" className="md:w-40">
          <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Bron" className="md:w-40">
          <Select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
            <option value="">Alle</option>
            <option value="organization">Eigen bibliotheek</option>
            <option value="reva">REVA-bibliotheek</option>
          </Select>
        </Field>
        {allTags.length > 0 && (
          <Field label="Tag" className="md:w-40">
            <Select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}>
              <option value="">Alle</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        )}
      </FilterBar>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={exercises.length === 0 ? "Nog geen oefeningen" : "Geen oefeningen gevonden"}
            description={exercises.length === 0 ? "Voeg je eerste oefening toe om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <ResponsiveList
            rows={paged}
            rowKey={(ex) => ex.id}
            rowLabel={(ex) => ex.title}
            onRowClick={canManage ? (ex) => router.push(`/portal/oefeningen/${ex.id}`) : undefined}
            columns={EXERCISE_COLUMNS}
            card={(ex) => <ExerciseCard exercise={ex} />}
            actions={canManage ? (ex) =>
              ex.scope === "organization"
                ? [
                    { label: ex.archived ? "Dearchiveren" : "Archiveren", onClick: () => handleToggleArchived(ex) },
                    { label: "Verwijderen", onClick: () => setConfirmDelete(ex), danger: true },
                  ]
                : [{ label: "Dupliceren", onClick: () => handleDuplicate(ex) }]
              : undefined}
            sort={{ key: sortKey, dir: sortDir, onSort: handleSort, onSet: setSort, options: SORT_OPTIONS }}
          />
        )}
        <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} itemLabel="resultaat" itemLabelPlural="resultaten" onPageChange={setPage} />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Oefening verwijderen?"
          message={`"${confirmDelete.title}" wordt permanent verwijderd uit de bibliotheek. Wordt de oefening nog gebruikt in een schema, dan mislukt het verwijderen — archiveer de oefening in dat geval in plaats daarvan.`}
          confirmLabel="Oefening verwijderen"
          loading={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {toastNode}
    </div>
  );
}
