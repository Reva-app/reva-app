"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Plus, Search, X } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
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
  loadExerciseLibrary, createOrgExercise, createOrgExerciseFromSource, updateOrgExercise, updateExerciseArchived, deleteOrgExercise, duplicateExerciseLibraryItem,
  uploadExerciseMedia,
  MANAGE_PROTOCOLS_ROLES, EXERCISE_TYPE_LABELS,
  type PortalExerciseLibraryItem, type PortalExerciseLibraryInput,
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

const emptyExerciseInput: PortalExerciseLibraryInput = {
  title: "", exerciseType: "kracht", description: "", instructions: "",
  defaultSets: null, defaultReps: null, defaultDurationSeconds: null, defaultLoadText: "", tags: [],
  mediaPath: null, mediaType: null,
};

export default function PortalOefeningenPage() {
  const { checked, membership } = usePortalMembership();
  const [exercises, setExercises] = useState<PortalExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [modal, setModal] = useState<{ exercise?: PortalExerciseLibraryItem } | null>(null);
  // Stabiel id voor een nieuwe oefening (of een REVA-kopie-in-wording) zodat
  // een eventuele afbeelding-upload vóór het opslaan al hetzelfde pad kan
  // gebruiken als waarmee de rij straks wordt aangemaakt.
  const [pendingNewId, setPendingNewId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
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

  async function handleSaveExercise(input: PortalExerciseLibraryInput) {
    if (!membership) return;
    setSaving(true);
    setModalError("");
    // Een REVA-oefening bewerken raakt nooit de gedeelde bibliotheek zelf
    // (dat zou alle praktijken raken) — pas bij het opslaan ontstaat een
    // eigen kopie, met de (eventueel aangepaste) formulierwaarden. Vóór het
    // opslaan (bv. bij Annuleren) is er dus nog helemaal niets aangemaakt.
    const { error } = !modal?.exercise
      ? await createOrgExercise(membership.organizationId, input, pendingNewId)
      : modal.exercise.scope === "organization"
        ? await updateOrgExercise(modal.exercise.id, input)
        : await createOrgExerciseFromSource(membership.organizationId, modal.exercise.id, input, pendingNewId);
    setSaving(false);
    if (error) { setModalError(error); return; }
    const wasRevaEdit = modal?.exercise?.scope === "reva";
    setModal(null);
    refresh(membership.organizationId);
    showToast(wasRevaEdit ? "Eigen kopie aangemaakt — wijzigingen raken niet de REVA-bibliotheek" : "Oefening opgeslagen");
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader title="Oefeningen" subtitle={loading ? "Laden…" : `${filtered.length} van ${exercises.length} ${exercises.length === 1 ? "oefening" : "oefeningen"}`} />
        {canManage && (
          <Button size="sm" onClick={() => { setModalError(""); setPendingNewId(crypto.randomUUID()); setModal({}); }}>
            <Plus size={14} /> Nieuwe oefening
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
                  <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((ex) => {
                  const editable = canManage;
                  return (
                    <tr
                      key={ex.id}
                      onClick={() => {
                        if (!editable) return;
                        setModalError("");
                        if (ex.scope === "reva") setPendingNewId(crypto.randomUUID());
                        setModal({ exercise: ex });
                      }}
                      className={`transition-colors ${editable ? "cursor-pointer hover:bg-gray-50" : ""}`}
                      style={{ borderBottom: "1px solid #f8f7f4" }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <ExerciseThumb mediaPath={ex.mediaPath} size={36} />
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

      {modal && membership && (
        <ExerciseFormModal
          input={modal.exercise ? {
            title: modal.exercise.title, exerciseType: modal.exercise.exerciseType,
            description: modal.exercise.description ?? "", instructions: modal.exercise.instructions ?? "",
            defaultSets: modal.exercise.defaultSets, defaultReps: modal.exercise.defaultReps,
            defaultDurationSeconds: modal.exercise.defaultDurationSeconds, defaultLoadText: modal.exercise.defaultLoadText ?? "",
            tags: modal.exercise.tags, mediaPath: modal.exercise.mediaPath, mediaType: modal.exercise.mediaType,
          } : emptyExerciseInput}
          pendingId={modal.exercise?.scope === "organization" ? modal.exercise.id : pendingNewId}
          organizationId={membership.organizationId}
          isRevaSource={modal.exercise?.scope === "reva"}
          saving={saving}
          error={modalError}
          onClose={() => setModal(null)}
          onSave={handleSaveExercise}
        />
      )}
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

function ExerciseFormModal({
  input, pendingId, organizationId, isRevaSource, saving, error, onClose, onSave,
}: {
  input: PortalExerciseLibraryInput; pendingId: string; organizationId: string; isRevaSource?: boolean; saving: boolean; error: string;
  onClose: () => void; onSave: (input: PortalExerciseLibraryInput) => void;
}) {
  const [title, setTitle] = useState(input.title);
  const [exerciseType, setExerciseType] = useState(input.exerciseType);
  const [description, setDescription] = useState(input.description);
  const [instructions, setInstructions] = useState(input.instructions);
  const [defaultSets, setDefaultSets] = useState(input.defaultSets?.toString() ?? "");
  const [defaultReps, setDefaultReps] = useState(input.defaultReps?.toString() ?? "");
  const [defaultDurationSeconds, setDefaultDurationSeconds] = useState(input.defaultDurationSeconds?.toString() ?? "");
  const [defaultLoadText, setDefaultLoadText] = useState(input.defaultLoadText);
  const [tags, setTags] = useState<string[]>(input.tags);
  const [newTag, setNewTag] = useState("");
  const [mediaPath, setMediaPath] = useState(input.mediaPath);
  const [mediaType, setMediaType] = useState(input.mediaType);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function addTag() {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setNewTag("");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const { mediaPath: newPath, mediaType: newType, error: uploadErr } = await uploadExerciseMedia(organizationId, pendingId, file);
    setUploading(false);
    if (uploadErr) { setUploadError(uploadErr); return; }
    setMediaPath(newPath);
    setMediaType(newType);
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <div className="flex items-center gap-3 mb-4">
          <ExerciseThumb mediaPath={mediaPath} size={56} />
          <div>
            <h3 className="font-semibold text-gray-900">Oefening</h3>
            <label className="text-xs font-medium cursor-pointer" style={{ color: "var(--brand-accent, #e8632a)" }}>
              {uploading ? "Uploaden…" : mediaPath ? "Afbeelding wijzigen" : "Afbeelding uploaden"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileChange} />
            </label>
          </div>
        </div>
        {uploadError && <p className="text-xs mb-3" style={{ color: "#dc2626" }}>{uploadError}</p>}
        {isRevaSource && (
          <p className="text-xs rounded-lg p-2.5 mb-4" style={{ background: "#fff7ed", color: "#9a6b3a" }}>
            Dit is een REVA-standaardoefening. Opslaan maakt een eigen kopie aan met jouw wijzigingen — de gedeelde REVA-bibliotheek blijft ongewijzigd.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              title, exerciseType, description, instructions,
              defaultSets: defaultSets ? Number(defaultSets) : null,
              defaultReps: defaultReps ? Number(defaultReps) : null,
              defaultDurationSeconds: defaultDurationSeconds ? Number(defaultDurationSeconds) : null,
              defaultLoadText, tags, mediaPath, mediaType,
            });
          }}
          className="space-y-4"
        >
          <div>
            <FieldLabel>Titel</FieldLabel>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Categorie</FieldLabel>
            <select value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
              {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Omschrijving (optioneel)</FieldLabel>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Instructies (optioneel)</FieldLabel>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <FieldLabel>Sets</FieldLabel>
              <input type="number" min={0} value={defaultSets} onChange={(e) => setDefaultSets(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Herhalingen</FieldLabel>
              <input type="number" min={0} value={defaultReps} onChange={(e) => setDefaultReps(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Duur (sec)</FieldLabel>
              <input type="number" min={0} value={defaultDurationSeconds} onChange={(e) => setDefaultDurationSeconds(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <FieldLabel>Belasting (optioneel)</FieldLabel>
            <input type="text" value={defaultLoadText} onChange={(e) => setDefaultLoadText(e.target.value)} placeholder="Bijv. 20 kg of lichaamsgewicht" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Tags (voor filteren, bijv. lichaamsdeel of uitrusting)</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t, i) => (
                <Badge key={t} variant="muted" className="flex items-center gap-1">
                  {t}
                  <button type="button" onClick={() => setTags((prev) => prev.filter((_, idx) => idx !== i))}><X size={11} /></button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Bijv. knie" className="flex-1 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
              <Button type="button" size="sm" variant="secondary" onClick={addTag}>Toevoegen</Button>
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button type="submit" size="sm" disabled={saving || !title.trim()}>
              {saving ? "Opslaan…" : isRevaSource ? "Kopie opslaan" : "Opslaan"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
