"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ExerciseMediaEditor } from "@/components/portal/ExerciseMediaEditor";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadExerciseLibraryDetail, loadExerciseUsage, updateExerciseTitle, updateExerciseMedia,
  updateOrgExercise, updateExerciseArchived, deleteOrgExercise, duplicateExerciseLibraryItem,
  MANAGE_PROTOCOLS_ROLES, EXERCISE_TYPE_LABELS,
  type PortalExerciseLibraryItem, type PortalExerciseUsage,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

// Titel waarmee "Nieuwe oefening" een nieuw concept aanmaakt (oefeningen/page.tsx)
// — moet exact hiermee overeenkomen zodat de leeg-conceptcheck hieronder klopt.
const DRAFT_TITLE = "Nieuwe oefening";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function PortalOefeningDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const exerciseId = params.id as string;
  const { checked, membership } = usePortalMembership();

  const [exercise, setExercise] = useState<PortalExerciseLibraryItem | null>(null);
  const [usage, setUsage] = useState<PortalExerciseUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [exerciseType, setExerciseType] = useState("kracht");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [defaultSets, setDefaultSets] = useState("");
  const [defaultReps, setDefaultReps] = useState("");
  const [defaultDurationSeconds, setDefaultDurationSeconds] = useState("");
  const [defaultLoadText, setDefaultLoadText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);

  // Ruimt een net aangemaakt, nog leeg conceptoefening automatisch op zodra de
  // gebruiker wegnavigeert zonder iets in te vullen — zelfde aanpak en reden
  // als bij schemas/[id]/page.tsx (zie de uitgebreide toelichting daar).
  const isDraftRef = useRef(searchParams.get("draft") === "1");
  const draftSnapshotRef = useRef({ title, description, instructions, defaultSets, defaultReps, defaultDurationSeconds, defaultLoadText, tags, mediaPath });
  const cleanupTokenRef = useRef(0);
  useEffect(() => {
    draftSnapshotRef.current = { title, description, instructions, defaultSets, defaultReps, defaultDurationSeconds, defaultLoadText, tags, mediaPath };
  });
  useEffect(() => {
    const myToken = ++cleanupTokenRef.current;
    return () => {
      setTimeout(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bewust: we willen de actuele ref-waarde op het moment van de timeout, niet een momentopname
        if (cleanupTokenRef.current !== myToken) return; // Strict Mode dubbele aanroep, geen echte unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (!isDraftRef.current) return;
        const snap = draftSnapshotRef.current;
        const untouched = snap.title.trim() === DRAFT_TITLE && !snap.description.trim() && !snap.instructions.trim()
          && !snap.defaultSets && !snap.defaultReps && !snap.defaultDurationSeconds && !snap.defaultLoadText.trim()
          && snap.tags.length === 0 && !snap.mediaPath;
        if (untouched) deleteOrgExercise(exerciseId);
      }, 0);
    };
  }, [exerciseId]);

  const [savingDetails, setSavingDetails] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast, toastNode } = useToast();

  const canEdit = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey) && exercise?.scope === "organization";

  function seedFields(ex: PortalExerciseLibraryItem) {
    setTitle(ex.title);
    setExerciseType(ex.exerciseType);
    setDescription(ex.description ?? "");
    setInstructions(ex.instructions ?? "");
    setDefaultSets(ex.defaultSets?.toString() ?? "");
    setDefaultReps(ex.defaultReps?.toString() ?? "");
    setDefaultDurationSeconds(ex.defaultDurationSeconds?.toString() ?? "");
    setDefaultLoadText(ex.defaultLoadText ?? "");
    setTags(ex.tags);
    setMediaPath(ex.mediaPath);
    setMediaType(ex.mediaType);
  }

  function refresh() {
    Promise.all([loadExerciseLibraryDetail(exerciseId), loadExerciseUsage(exerciseId)]).then(([ex, usageData]) => {
      setExercise(ex);
      setNotFound(!ex);
      setUsage(usageData);
      if (ex) seedFields(ex);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, membership, exerciseId]);

  function handleTitleBlur() {
    const next = title.trim();
    if (!next || !exercise || next === exercise.title) return;
    updateExerciseTitle(exerciseId, next).then(({ error }) => {
      if (error) { showToast(error, "error"); return; }
      setExercise((prev) => (prev ? { ...prev, title: next } : prev));
      showToast("Titel opgeslagen");
    });
  }

  function handleMediaChange(newPath: string | null, newType: string | null) {
    setMediaPath(newPath);
    setMediaType(newType);
    updateExerciseMedia(exerciseId, newPath, newType).then(({ error }) => {
      if (error) { showToast(error, "error"); return; }
      setExercise((prev) => (prev ? { ...prev, mediaPath: newPath, mediaType: newType } : prev));
      showToast(newPath ? "Media opgeslagen" : "Media verwijderd");
    });
  }

  async function handleSaveDetails() {
    setSavingDetails(true);
    const { error } = await updateOrgExercise(exerciseId, {
      title, exerciseType, description, instructions,
      defaultSets: defaultSets ? Number(defaultSets) : null,
      defaultReps: defaultReps ? Number(defaultReps) : null,
      defaultDurationSeconds: defaultDurationSeconds ? Number(defaultDurationSeconds) : null,
      defaultLoadText, tags, mediaPath, mediaType,
    });
    setSavingDetails(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Opgeslagen");
    refresh();
  }

  function addTag() {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setNewTag("");
  }

  async function handleToggleArchived() {
    if (!exercise) return;
    const nextArchived = !exercise.archived;
    const { error } = await updateExerciseArchived(exerciseId, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Oefening gearchiveerd" : "Oefening gedearchiveerd");
    refresh();
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    const { error } = await deleteOrgExercise(exerciseId);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Oefening verwijderd");
    router.push("/portal/oefeningen");
  }

  async function handleDuplicate() {
    if (!membership) return;
    setDuplicating(true);
    const { id, error } = await duplicateExerciseLibraryItem(exerciseId, membership.organizationId);
    setDuplicating(false);
    if (error || !id) { showToast(error ?? "Dupliceren is niet gelukt.", "error"); return; }
    showToast("Eigen kopie aangemaakt");
    router.push(`/portal/oefeningen/${id}`);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button type="button" onClick={() => router.push("/portal/oefeningen")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Terug naar oefeningen
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !exercise ? (
        <p className="text-sm text-gray-400">Deze oefening is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-start gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">{title || exercise.title}</h2>
            <div className="flex items-center gap-2 pt-0.5">
              {exercise.scope === "reva" ? <Badge variant="blue">REVA</Badge> : <Badge variant="default">Eigen</Badge>}
              {exercise.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <Card>
              <CardHeader title="Titel" />
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur}
                disabled={!canEdit}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60"
                style={inputStyle}
              />
            </Card>

            <Card>
              <CardHeader title="Omschrijving" />
              <div className="space-y-4">
                <div>
                  <FieldLabel>Categorie</FieldLabel>
                  <select value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} disabled={!canEdit} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}>
                    {Object.entries(EXERCISE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Omschrijving (optioneel)</FieldLabel>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={3} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Instructies (optioneel)</FieldLabel>
                  <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} disabled={!canEdit} rows={3} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
                </div>
                {canEdit && <Button size="sm" disabled={savingDetails} onClick={handleSaveDetails}>{savingDetails ? "Opslaan…" : "Opslaan"}</Button>}
              </div>
            </Card>

            <Card>
              <CardHeader title="Sets, herhalingen en tijd" />
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Sets</FieldLabel>
                    <input type="number" min={0} value={defaultSets} onChange={(e) => setDefaultSets(e.target.value)} disabled={!canEdit} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Herhalingen</FieldLabel>
                    <input type="number" min={0} value={defaultReps} onChange={(e) => setDefaultReps(e.target.value)} disabled={!canEdit} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Duur (sec)</FieldLabel>
                    <input type="number" min={0} value={defaultDurationSeconds} onChange={(e) => setDefaultDurationSeconds(e.target.value)} disabled={!canEdit} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Belasting (optioneel)</FieldLabel>
                  <input type="text" value={defaultLoadText} onChange={(e) => setDefaultLoadText(e.target.value)} disabled={!canEdit} placeholder="Bijv. 20 kg of lichaamsgewicht" className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                </div>
                {canEdit && <Button size="sm" disabled={savingDetails} onClick={handleSaveDetails}>{savingDetails ? "Opslaan…" : "Opslaan"}</Button>}
              </div>
            </Card>

            <Card>
              <CardHeader title="Media" />
              <ExerciseMediaEditor
                mediaPath={mediaPath}
                mediaType={mediaType}
                organizationId={membership?.organizationId ?? ""}
                exerciseId={exerciseId}
                canEdit={!!canEdit}
                onChange={handleMediaChange}
              />
            </Card>
          </div>

          <div className="space-y-6 min-w-0">
            <Card>
              <CardHeader title="Status" />
              <div className="space-y-3">
                {exercise.archived ? <Badge variant="muted">Gearchiveerd</Badge> : <Badge variant="success">Actief</Badge>}
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={handleToggleArchived}>{exercise.archived ? "Dearchiveren" : "Archiveren"}</Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)}>Verwijderen</Button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Bron" />
              <div className="space-y-3">
                {exercise.scope === "reva" ? <Badge variant="blue">REVA-bibliotheek</Badge> : <Badge variant="default">Eigen bibliotheek</Badge>}
                {exercise.scope === "reva" && (
                  <>
                    <p className="text-xs text-gray-500">
                      Dit is een REVA-standaardoefening en kan hier niet bewerkt worden. Dupliceer de oefening om een eigen, bewerkbare kopie aan te maken.
                    </p>
                    <Button size="sm" disabled={duplicating} onClick={handleDuplicate}>{duplicating ? "Dupliceren…" : "Dupliceren"}</Button>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Gegevens" />
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Aangemaakt op</p>
                  <p className="text-gray-700">{fmtDate(exercise.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Aangemaakt door</p>
                  <p className="text-gray-700">{exercise.createdByName ?? "Onbekend"}</p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Gebruikt in schema's" />
              {usage.length === 0 ? (
                <p className="text-sm text-gray-400">Nog niet gebruikt in een schema.</p>
              ) : (
                <div className="space-y-1.5">
                  {usage.map((u) => (
                    <button
                      key={u.scheduleId}
                      type="button"
                      onClick={() => router.push(`/portal/schemas/${u.scheduleId}`)}
                      className="w-full flex items-center justify-between gap-2 text-left text-sm rounded-xl border px-3 py-2 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: "#e8e5df" }}
                    >
                      <span className="text-gray-700 truncate">{u.scheduleTitle}</span>
                      {u.scheduleScope === "reva" && <Badge variant="blue">REVA</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Tags" />
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {tags.length === 0 && <p className="text-sm text-gray-400">Geen tags.</p>}
                  {tags.map((t, i) => (
                    <Badge key={t} variant="muted" className="flex items-center gap-1">
                      {t}
                      {canEdit && <button type="button" onClick={() => setTags((prev) => prev.filter((_, idx) => idx !== i))}><X size={11} /></button>}
                    </Badge>
                  ))}
                </div>
                {canEdit && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        placeholder="Bijv. knie" className="flex-1 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                      />
                      <Button type="button" size="sm" variant="secondary" onClick={addTag} aria-label="Tag toevoegen" title="Tag toevoegen" className="px-2.5 shrink-0">
                        <Plus size={14} />
                      </Button>
                    </div>
                    <Button size="sm" disabled={savingDetails} onClick={handleSaveDetails}>{savingDetails ? "Opslaan…" : "Opslaan"}</Button>
                  </>
                )}
              </div>
            </Card>
          </div>
          </div>
        </>
      )}

      {confirmDelete && exercise && (
        <ConfirmDialog
          title="Oefening verwijderen?"
          message={`"${exercise.title}" wordt permanent verwijderd uit de bibliotheek. Wordt de oefening nog gebruikt in een schema, dan mislukt het verwijderen — archiveer de oefening in dat geval in plaats daarvan.`}
          confirmLabel="Oefening verwijderen"
          loading={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {toastNode}
    </div>
  );
}
