"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import {
  createOrgExercise, EXERCISE_TYPE_LABELS,
  type PortalExerciseLibraryItem, type PortalExerciseLibraryInput,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

type SourceFilter = "all" | "organization" | "reva";

/**
 * Doorzoekbare multi-select om in één keer meerdere oefeningen aan een
 * schema toe te voegen — de "Producten toevoegen"-achtige flow (vervangt de
 * oude enkele <select>-kiezer). Sets/reps/etc. per oefening worden hier
 * bewust niet gevraagd — dat blijft de bestaande losse "Bewerken"-actie op
 * een al-toegevoegde rij, net als bij Shopify's eigen collectie-toevoegflow.
 */
export function ExerciseMultiSelectModal({
  exercises, excludeExerciseIds, organizationId, onClose, onAdd, onExerciseCreated,
}: {
  exercises: PortalExerciseLibraryItem[];
  excludeExerciseIds: string[];
  organizationId: string;
  onClose: () => void;
  onAdd: (exerciseIds: string[]) => Promise<{ addedCount: number; errors: string[] }>;
  onExerciseCreated: (exercise: PortalExerciseLibraryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const [showNewExercise, setShowNewExercise] = useState(false);
  const [newExercise, setNewExercise] = useState<PortalExerciseLibraryInput>({
    title: "", exerciseType: "kracht", description: "", instructions: "",
    defaultSets: null, defaultReps: null, defaultDurationSeconds: null, defaultLoadText: "", tags: [],
    mediaPath: null, mediaType: null,
  });
  const [creatingExercise, setCreatingExercise] = useState(false);

  const pickable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (excludeExerciseIds.includes(ex.id)) return false;
      if (ex.archived) return false;
      if (q && !ex.title.toLowerCase().includes(q)) return false;
      if (sourceFilter !== "all" && ex.scope !== sourceFilter) return false;
      if (categoryFilter && ex.exerciseType !== categoryFilter) return false;
      return true;
    });
  }, [exercises, excludeExerciseIds, search, sourceFilter, categoryFilter]);

  const orgPickable = pickable.filter((e) => e.scope === "organization");
  const revaPickable = pickable.filter((e) => e.scope === "reva");

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selectedIds.size === 0) return;
    setAdding(true);
    setResultMessage("");
    const { addedCount, errors } = await onAdd([...selectedIds]);
    setAdding(false);
    if (errors.length === 0) {
      onClose();
      return;
    }
    if (addedCount > 0) {
      setResultMessage(`${addedCount} van ${addedCount + errors.length} oefeningen toegevoegd. ${errors.length} mislukt — probeer het opnieuw.`);
    } else {
      setResultMessage("Toevoegen is niet gelukt. Probeer het opnieuw.");
    }
  }

  async function handleCreateExercise() {
    if (!newExercise.title.trim()) return;
    setCreatingExercise(true);
    const { id, error } = await createOrgExercise(organizationId, newExercise);
    setCreatingExercise(false);
    if (error || !id) return;
    const created: PortalExerciseLibraryItem = {
      id, scope: "organization", title: newExercise.title.trim(), exerciseType: newExercise.exerciseType,
      description: newExercise.description.trim() || null, instructions: newExercise.instructions.trim() || null,
      defaultSets: newExercise.defaultSets, defaultReps: newExercise.defaultReps, defaultDurationSeconds: newExercise.defaultDurationSeconds,
      defaultLoadText: newExercise.defaultLoadText.trim() || null, tags: newExercise.tags, archived: false,
      mediaPath: null, mediaType: null, createdAt: new Date().toISOString(),
    };
    onExerciseCreated(created);
    setSelectedIds((prev) => new Set(prev).add(id));
    setShowNewExercise(false);
    setNewExercise({ title: "", exerciseType: "kracht", description: "", instructions: "", defaultSets: null, defaultReps: null, defaultDurationSeconds: null, defaultLoadText: "", tags: [], mediaPath: null, mediaType: null });
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-4">Oefeningen toevoegen</h3>

        {!showNewExercise ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoeken…" className="w-full text-sm rounded-xl border pl-9 pr-3 py-2 focus:outline-none" style={inputStyle}
                />
              </div>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as SourceFilter)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                <option value="all">Alles</option>
                <option value="organization">Eigen bibliotheek</option>
                <option value="reva">REVA-bibliotheek</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                <option value="">Alle categorieën</option>
                {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{pickable.length} beschikbaar</p>
              <button type="button" onClick={() => setShowNewExercise(true)} className="text-xs font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
                + Nieuwe oefening
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border" style={{ borderColor: "#e8e5df" }}>
              {pickable.length === 0 ? (
                <p className="text-sm text-gray-400 p-4">Geen oefeningen gevonden.</p>
              ) : (
                <>
                  {orgPickable.length > 0 && (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 px-3 pt-2.5 pb-1">Eigen bibliotheek</p>
                      {orgPickable.map((ex) => (
                        <label key={ex.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={selectedIds.has(ex.id)} onChange={() => toggle(ex.id)} />
                          <ExerciseThumb mediaPath={ex.mediaPath} size={28} />
                          <span className="flex-1 text-gray-700">{ex.title}</span>
                          <Badge variant="muted">{EXERCISE_TYPE_LABELS[ex.exerciseType] ?? ex.exerciseType}</Badge>
                        </label>
                      ))}
                    </>
                  )}
                  {revaPickable.length > 0 && (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 px-3 pt-2.5 pb-1">REVA-bibliotheek</p>
                      {revaPickable.map((ex) => (
                        <label key={ex.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={selectedIds.has(ex.id)} onChange={() => toggle(ex.id)} />
                          <ExerciseThumb mediaPath={ex.mediaPath} size={28} />
                          <span className="flex-1 text-gray-700">{ex.title}</span>
                          <Badge variant="muted">{EXERCISE_TYPE_LABELS[ex.exerciseType] ?? ex.exerciseType}</Badge>
                        </label>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {resultMessage && <p className="text-xs" style={{ color: "#dc2626" }}>{resultMessage}</p>}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{selectedIds.size} geselecteerd</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
                <Button type="button" size="sm" disabled={adding || selectedIds.size === 0} onClick={handleAdd}>
                  {adding ? "Toevoegen…" : `${selectedIds.size || ""} Toevoegen`.trim()}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <FieldLabel>Titel</FieldLabel>
              <input type="text" value={newExercise.title} onChange={(e) => setNewExercise((p) => ({ ...p, title: e.target.value }))}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Categorie</FieldLabel>
              <select value={newExercise.exerciseType} onChange={(e) => setNewExercise((p) => ({ ...p, exerciseType: e.target.value }))}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Instructies (optioneel)</FieldLabel>
              <textarea value={newExercise.instructions} onChange={(e) => setNewExercise((p) => ({ ...p, instructions: e.target.value }))} rows={2}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowNewExercise(false)}>Terug</Button>
              <Button type="button" size="sm" disabled={creatingExercise || !newExercise.title.trim()} onClick={handleCreateExercise}>
                {creatingExercise ? "Aanmaken…" : "Oefening aanmaken"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
