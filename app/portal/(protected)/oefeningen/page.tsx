"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { StatCard } from "@/components/ui/StatCard";
import { SortableHeader } from "@/components/ui/table/SortableHeader";
import { Pagination } from "@/components/ui/table/Pagination";
import { useTableState } from "@/components/ui/table/useTableState";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadExerciseLibrary, createOrgExercise, updateExerciseArchived, deleteOrgExercise, duplicateExerciseLibraryItem,
  MANAGE_PROTOCOLS_ROLES, EXERCISE_TYPE_LABELS,
  type PortalExerciseLibraryItem,
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

type SortKey = "title" | "exerciseType" | "createdAt";

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Totaal" value={exercises.length} icon={Dumbbell} />
        <StatCard label="Eigen bibliotheek" value={ownCount} icon={Dumbbell} />
        <StatCard label="REVA-bibliotheek" value={revaCount} icon={Dumbbell} />
        <StatCard label="Gearchiveerd" value={archivedCount} icon={Dumbbell} />
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
        <div className="w-[calc(50%-0.375rem)] sm:w-36">
          <FieldLabel>Status</FieldLabel>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <FieldLabel>Categorie</FieldLabel>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <FieldLabel>Bron</FieldLabel>
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
            <option value="">Alle</option>
            <option value="organization">Eigen bibliotheek</option>
            <option value="reva">REVA-bibliotheek</option>
          </select>
        </div>
        {allTags.length > 0 && (
          <div className="w-[calc(50%-0.375rem)] sm:w-40">
            <FieldLabel>Tag</FieldLabel>
            <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              <option value="">Alle</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <FieldLabel>Sorteren</FieldLabel>
          <select
            value={sortKey === "createdAt" && sortDir === "desc" ? "nieuwste" : sortKey === "exerciseType" ? "categorie" : "naam"}
            onChange={(e) => {
              if (e.target.value === "nieuwste") setSort("createdAt", "desc");
              else if (e.target.value === "categorie") setSort("exerciseType", "asc");
              else setSort("title", "asc");
            }}
            className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
          >
            <option value="naam">Naam (A-Z)</option>
            <option value="categorie">Categorie</option>
            <option value="nieuwste">Nieuwste eerst</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={exercises.length === 0 ? "Nog geen oefeningen" : "Geen oefeningen gevonden"}
            description={exercises.length === 0 ? "Voeg je eerste oefening toe om te beginnen." : "Pas de filters aan om meer resultaten te zien."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <SortableHeader label="Oefening" sortKeyValue="title" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Categorie" sortKeyValue="exerciseType" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Tags</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Bron</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt door</th>
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((ex) => {
                  const editable = canManage;
                  return (
                    <tr
                      key={ex.id}
                      onClick={() => { if (editable) router.push(`/portal/oefeningen/${ex.id}`); }}
                      className={`transition-colors ${editable ? "cursor-pointer hover:bg-gray-50" : ""}`}
                      style={{ borderBottom: "1px solid #f8f7f4" }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ExerciseThumb mediaPath={ex.mediaPath} mediaType={ex.mediaType} size={36} />
                          <p className="font-medium text-gray-800 truncate">{ex.title}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{EXERCISE_TYPE_LABELS[ex.exerciseType] ?? ex.exerciseType}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {ex.tags.slice(0, 3).map((t) => <Badge key={t} variant="muted">{t}</Badge>)}
                          {ex.tags.length > 3 && <Badge variant="muted">+{ex.tags.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{ex.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}</td>
                      <td className="px-5 py-3.5">{ex.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}</td>
                      <td className="px-5 py-3.5 text-gray-600">{ex.createdByName ?? "—"}</td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {canManage && (
                          <ActionMenu
                            items={
                              ex.scope === "organization"
                                ? [
                                    { label: ex.archived ? "Dearchiveren" : "Archiveren", onClick: () => handleToggleArchived(ex) },
                                    { label: "Verwijderen", onClick: () => setConfirmDelete(ex), danger: true },
                                  ]
                                : [{ label: "Dupliceren", onClick: () => handleDuplicate(ex) }]
                            }
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
