"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Dumbbell, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ExerciseMultiSelectModal } from "@/components/portal/ExerciseMultiSelectModal";
import { SortableExerciseList } from "@/components/portal/SortableExerciseList";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadScheduleLibraryDetail, updateScheduleLibraryItem, updateScheduleLibraryArchived,
  loadExerciseLibrary, updateScheduleLibraryExercise, removeExerciseFromScheduleLibrary, addExercisesToScheduleLibrary,
  reorderScheduleLibraryExercises,
  MANAGE_PROTOCOLS_ROLES,
  type PortalScheduleLibraryDetail, type PortalScheduleLibraryExercise, type PortalExerciseLibraryItem,
  type PortalScheduleExerciseInput,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

export default function PortalScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  const { checked, membership } = usePortalMembership();

  const [schedule, setSchedule] = useState<PortalScheduleLibraryDetail | null>(null);
  const [exercises, setExercises] = useState<PortalExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<PortalScheduleLibraryExercise | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<PortalScheduleLibraryExercise | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast, toastNode } = useToast();

  const canEdit = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey) && schedule?.scope === "organization";

  function refresh() {
    loadScheduleLibraryDetail(scheduleId).then((data) => {
      setSchedule(data);
      setNotFound(!data);
      if (data) { setTitle(data.title); setDescription(data.description ?? ""); }
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([loadScheduleLibraryDetail(scheduleId), loadExerciseLibrary(membership.organizationId)]).then(([data, exerciseData]) => {
      if (cancelled) return;
      setSchedule(data);
      setNotFound(!data);
      setExercises(exerciseData);
      if (data) { setTitle(data.title); setDescription(data.description ?? ""); }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, scheduleId]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateScheduleLibraryItem(scheduleId, { title, description });
    setSaving(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Instellingen opgeslagen");
    refresh();
  }

  async function handleToggleArchived() {
    if (!schedule) return;
    const nextArchived = !schedule.archived;
    const { error } = await updateScheduleLibraryArchived(scheduleId, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Schema gearchiveerd" : "Schema gedearchiveerd");
    refresh();
  }

  async function handleAddExercises(exerciseIds: string[]) {
    const inputs: PortalScheduleExerciseInput[] = exerciseIds.map((exerciseId) => ({
      exerciseId, prescribedSets: null, prescribedReps: null, prescribedDurationSeconds: null, prescribedLoadText: "", prescriptionNote: "",
    }));
    const result = await addExercisesToScheduleLibrary(scheduleId, inputs, schedule?.exercises.length ?? 0);
    refresh();
    if (result.addedCount > 0) showToast(`${result.addedCount} oefening${result.addedCount === 1 ? "" : "en"} toegevoegd`);
    return result;
  }

  async function handleRemoveExercise() {
    if (!confirmRemove) return;
    setRemoving(true);
    const { error } = await removeExerciseFromScheduleLibrary(confirmRemove.id);
    setRemoving(false);
    setConfirmRemove(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Oefening verwijderd uit schema");
    refresh();
  }

  async function handleReorderExercises(orderedIds: string[]) {
    if (!schedule) return;
    const exerciseById = new Map(schedule.exercises.map((ex) => [ex.id.toString(), ex]));
    const reordered = orderedIds.map((id) => exerciseById.get(id)).filter((ex): ex is PortalScheduleLibraryExercise => !!ex);
    setSchedule({ ...schedule, exercises: reordered });
    const { error } = await reorderScheduleLibraryExercises(orderedIds.map(Number));
    if (error) { showToast(error, "error"); refresh(); }
  }

  async function handleSaveEdit(input: PortalScheduleExerciseInput) {
    if (!editingExercise) return;
    setEditSaving(true);
    setEditError("");
    const { error } = await updateScheduleLibraryExercise(editingExercise.id, input);
    setEditSaving(false);
    if (error) { setEditError(error); return; }
    setEditingExercise(null);
    showToast("Oefening bijgewerkt");
    refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => router.push("/portal/schemas")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Terug naar schema&apos;s
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !schedule ? (
        <p className="text-sm text-gray-400">Dit schema is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <SectionHeader title={schedule.title} />
            {schedule.scope === "reva" ? (
              <Badge variant="blue">REVA — alleen-lezen</Badge>
            ) : schedule.archived ? (
              <Badge variant="muted">Gearchiveerd</Badge>
            ) : (
              <Badge variant="success">Actief</Badge>
            )}
          </div>

          <Card>
            <CardHeader title="Oefeningen in dit schema" action={canEdit ? <Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Oefeningen toevoegen</Button> : undefined} />
            {schedule.exercises.length === 0 ? (
              <p className="text-sm text-gray-400">Nog geen oefeningen toegevoegd.</p>
            ) : (
              <div className="space-y-1.5">
                <SortableExerciseList
                  items={schedule.exercises}
                  getId={(ex) => ex.id.toString()}
                  onReorder={handleReorderExercises}
                  disabled={!canEdit}
                  renderItem={(ex, _index, dragHandle) => (
                    <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5" style={{ background: "#f8f7f4" }}>
                      {dragHandle}
                      <span className="flex items-center gap-2 text-gray-700 flex-1 min-w-0">
                        <Dumbbell size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{ex.exerciseTitle}</span>
                        {(ex.prescribedSets || ex.prescribedReps) && (
                          <span className="text-xs text-gray-400 shrink-0">— {ex.prescribedSets ?? "?"}×{ex.prescribedReps ?? "?"}{ex.prescribedLoadText ? ` · ${ex.prescribedLoadText}` : ""}</span>
                        )}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={() => { setEditError(""); setEditingExercise(ex); }} className="text-xs text-gray-400 hover:text-gray-600">Bewerken</button>
                          <button type="button" onClick={() => setConfirmRemove(ex)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Instellingen" subtitle={canEdit ? undefined : "Dit schema kan hier niet bewerkt worden."} />
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <FieldLabel>Naam</FieldLabel>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Omschrijving</FieldLabel>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2}
                  className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={handleToggleArchived}>{schedule.archived ? "Dearchiveren" : "Archiveren"}</Button>
                </div>
              )}
            </form>
          </Card>
        </>
      )}

      {showAddModal && membership && schedule && (
        <ExerciseMultiSelectModal
          exercises={exercises}
          excludeExerciseIds={schedule.exercises.map((e) => e.exerciseId)}
          organizationId={membership.organizationId}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExercises}
          onExerciseCreated={(ex) => setExercises((prev) => [...prev, ex].sort((a, b) => a.title.localeCompare(b.title)))}
        />
      )}

      {editingExercise && (
        <ScheduleExerciseEditModal
          exercise={editingExercise}
          saving={editSaving}
          error={editError}
          onClose={() => setEditingExercise(null)}
          onSave={handleSaveEdit}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Oefening verwijderen?"
          message={`"${confirmRemove.exerciseTitle}" wordt uit dit schema verwijderd.`}
          confirmLabel="Verwijderen"
          loading={removing}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={handleRemoveExercise}
        />
      )}
      {toastNode}
    </div>
  );
}

function ScheduleExerciseEditModal({
  exercise, saving, error, onClose, onSave,
}: {
  exercise: PortalScheduleLibraryExercise;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (input: PortalScheduleExerciseInput) => void;
}) {
  const [sets, setSets] = useState(exercise.prescribedSets?.toString() ?? "");
  const [reps, setReps] = useState(exercise.prescribedReps?.toString() ?? "");
  const [duration, setDuration] = useState(exercise.prescribedDurationSeconds?.toString() ?? "");
  const [loadText, setLoadText] = useState(exercise.prescribedLoadText ?? "");
  const [note, setNote] = useState(exercise.prescriptionNote ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      exerciseId: exercise.exerciseId,
      prescribedSets: sets ? Number(sets) : null,
      prescribedReps: reps ? Number(reps) : null,
      prescribedDurationSeconds: duration ? Number(duration) : null,
      prescribedLoadText: loadText,
      prescriptionNote: note,
    });
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-4">{exercise.exerciseTitle}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <FieldLabel>Sets</FieldLabel>
              <input type="number" min={0} value={sets} onChange={(e) => setSets(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Herhalingen</FieldLabel>
              <input type="number" min={0} value={reps} onChange={(e) => setReps(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Duur (sec)</FieldLabel>
              <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <FieldLabel>Belasting (bijv. &quot;20 kg&quot; of &quot;lichaamsgewicht&quot;)</FieldLabel>
            <input type="text" value={loadText} onChange={(e) => setLoadText(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Opmerking (optioneel)</FieldLabel>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
