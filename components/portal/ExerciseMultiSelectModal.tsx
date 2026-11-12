"use client";

import { useMemo, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { formatPrescription } from "@/lib/prescription";
import { Modal, ModalFooter } from "@/components/ui/Modal";
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className="rounded-full border px-3 py-1.5 text-sm transition-colors"
      style={{ borderColor: active ? "#1c1c1e" : "#e8e5df", background: active ? "#1c1c1e" : "#ffffff", color: active ? "#ffffff" : "#4b5563" }}>
      {children}
    </button>
  );
}

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
      createdBy: null, createdByName: null,
    };
    onExerciseCreated(created);
    setSelectedIds((prev) => new Set(prev).add(id));
    setShowNewExercise(false);
    setNewExercise({ title: "", exerciseType: "kracht", description: "", instructions: "", defaultSets: null, defaultReps: null, defaultDurationSeconds: null, defaultLoadText: "", tags: [], mediaPath: null, mediaType: null });
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Oefeningen toevoegen</h3>

        {!showNewExercise ? (
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                placeholder="Zoek een oefening, bijv. squat, kuit, schouder…"
                className="w-full text-base rounded-2xl border pl-10 pr-3 py-3 focus:outline-none focus:border-[#e8632a]" style={inputStyle}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[{ key: "", label: "Alle typen" }, ...Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => ({ key, label }))].map((c) => (
                <FilterChip key={c.key || "all"} active={categoryFilter === c.key} onClick={() => setCategoryFilter(c.key)}>{c.label}</FilterChip>
              ))}
              <span className="w-px bg-gray-200 mx-1" aria-hidden />
              {([["all", "Alles"], ["organization", "Eigen"], ["reva", "REVA"]] as const).map(([key, label]) => (
                <FilterChip key={key} active={sourceFilter === key} onClick={() => setSourceFilter(key)}>{label}</FilterChip>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-subtle">{pickable.length} {pickable.length === 1 ? "oefening" : "oefeningen"}</p>
              <button type="button" onClick={() => setShowNewExercise(true)} className="text-sm font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
                + Nieuwe oefening
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto -mx-1 px-1">
              {pickable.length === 0 ? (
                <p className="text-sm text-subtle p-4 text-center">Geen oefeningen gevonden. Pas je zoekterm of filters aan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...orgPickable, ...revaPickable].map((ex) => {
                    const selected = selectedIds.has(ex.id);
                    const dose = formatPrescription({ prescribedSets: ex.defaultSets, prescribedReps: ex.defaultReps, prescribedDurationSeconds: ex.defaultDurationSeconds }, { withLoad: false });
                    return (
                      <button
                        key={ex.id} type="button" onClick={() => toggle(ex.id)} aria-pressed={selected}
                        className="flex items-center gap-3 text-left rounded-2xl border p-2.5 transition-colors"
                        style={{ borderColor: selected ? "var(--brand-accent, #e8632a)" : "#e8e5df", background: selected ? "#fff6f1" : "#ffffff" }}
                      >
                        <ExerciseThumb mediaPath={ex.mediaPath} mediaType={ex.mediaType} size={48} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-900 leading-snug line-clamp-2">{ex.title}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {EXERCISE_TYPE_LABELS[ex.exerciseType] ?? ex.exerciseType}{dose ? ` · ${dose}` : ""}{ex.scope === "organization" ? " · eigen" : ""}
                          </span>
                        </span>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: selected ? "var(--brand-accent, #e8632a)" : "#ffffff", border: selected ? "none" : "2px solid #d9d4cc" }}>
                          {selected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {[...selectedIds].map((id) => {
                  const ex = exercises.find((e) => e.id === id);
                  return ex ? (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full pl-3 pr-1 py-1 text-xs font-medium" style={{ background: "#fff3ee", color: "#9a3f17" }}>
                      {ex.title}
                      <button type="button" onClick={() => toggle(id)} aria-label={`${ex.title} weghalen`} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/60"><X size={12} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {resultMessage && <p className="text-xs" style={{ color: "#dc2626" }}>{resultMessage}</p>}

            <ModalFooter className="justify-between">
              <span className="text-sm text-gray-500">{selectedIds.size} geselecteerd</span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>Annuleren</Button>
                <Button type="button" disabled={adding || selectedIds.size === 0} onClick={handleAdd}>
                  {adding ? "Toevoegen…" : selectedIds.size > 0 ? `${selectedIds.size} toevoegen` : "Toevoegen"}
                </Button>
              </div>
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <FieldLabel>Titel</FieldLabel>
              <input type="text" value={newExercise.title} onChange={(e) => setNewExercise((p) => ({ ...p, title: e.target.value }))}
                className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Categorie</FieldLabel>
              <select value={newExercise.exerciseType} onChange={(e) => setNewExercise((p) => ({ ...p, exerciseType: e.target.value }))}
                className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={inputStyle}>
                {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Instructies (optioneel)</FieldLabel>
              <textarea value={newExercise.instructions} onChange={(e) => setNewExercise((p) => ({ ...p, instructions: e.target.value }))} rows={2}
                className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
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
