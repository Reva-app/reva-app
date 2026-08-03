"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, X, Trash2, Pencil, Dumbbell, ExternalLink, ListChecks, Flag, BookOpen, Circle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadProtocolDetail, updateProtocolPhaseName, updateProtocolPhase, deleteProtocolPhase, reorderProtocolPhases,
  createProtocolPhaseCriterion, updateProtocolPhaseCriterion, deleteProtocolPhaseCriterion,
  createProtocolPhaseMilestone, updateProtocolPhaseMilestone, deleteProtocolPhaseMilestone,
  createProtocolPhaseEducationItem, updateProtocolPhaseEducationItem, deleteProtocolPhaseEducationItem,
  linkScheduleToPhase, updatePhaseScheduleLink, unlinkScheduleFromPhase,
  loadRevaSchedules, loadOrgSchedules, createScheduleLibraryItem,
  MANAGE_PROTOCOLS_ROLES,
  type PortalProtocolDetail, type PortalProtocolPhase, type PortalProtocolEducationItem,
  type PortalProtocolSchedule, type PortalScheduleLibraryCard,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

// Naam waarmee "Fase toevoegen" een nieuw concept aanmaakt (herstelplannen/[id]/page.tsx)
// — moet exact hiermee overeenkomen zodat de leeg-conceptcheck hieronder klopt.
const DRAFT_TITLE = "Nieuwe fase";

type ModalState =
  | { kind: "education"; item?: PortalProtocolEducationItem }
  | { kind: "linkSchedule"; link?: PortalProtocolSchedule }
  | null;

export default function PortalProtocolPhaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const protocolId = params.id as string;
  const phaseId = params.phaseId as string;
  const { checked, membership } = usePortalMembership();

  const [protocol, setProtocol] = useState<PortalProtocolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [revaSchedules, setRevaSchedules] = useState<PortalScheduleLibraryCard[]>([]);
  const [orgSchedules, setOrgSchedules] = useState<PortalScheduleLibraryCard[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [weekRangeLabel, setWeekRangeLabel] = useState("");
  const [description, setDescription] = useState("");
  const [therapistNotes, setTherapistNotes] = useState("");
  const [forbidden, setForbidden] = useState<string[]>([]);
  const [newForbidden, setNewForbidden] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmDeletePhase, setConfirmDeletePhase] = useState(false);
  const [deletingPhase, setDeletingPhase] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);
  const canEdit = canManage && protocol?.scope === "organization";

  const phase = protocol?.phases.find((p) => p.id === phaseId) ?? null;
  const phaseIndex = protocol && phase ? protocol.phases.findIndex((p) => p.id === phase.id) : -1;

  // Ruimt een net aangemaakte, nog lege conceptfase automatisch op zodra de
  // gebruiker wegnavigeert zonder iets in te vullen — zelfde aanpak als de
  // andere detailpagina's (zie schemas/[id]/page.tsx voor de toelichting).
  const isDraftRef = useRef(searchParams.get("draft") === "1");
  const draftSnapshotRef = useRef({
    name, description, therapistNotes, weekRangeLabel, forbiddenCount: 0,
    criteriaCount: 0, milestonesCount: 0, educationCount: 0, schedulesCount: 0,
  });
  const cleanupTokenRef = useRef(0);
  useEffect(() => {
    draftSnapshotRef.current = {
      name, description, therapistNotes, weekRangeLabel, forbiddenCount: forbidden.length,
      criteriaCount: phase?.criteria.length ?? 0, milestonesCount: phase?.milestones.length ?? 0,
      educationCount: phase?.educationItems.length ?? 0, schedulesCount: phase?.schedules.length ?? 0,
    };
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
        const untouched = snap.name.trim() === DRAFT_TITLE && !snap.description.trim() && !snap.therapistNotes.trim()
          && !snap.weekRangeLabel.trim() && snap.forbiddenCount === 0
          && snap.criteriaCount === 0 && snap.milestonesCount === 0 && snap.educationCount === 0 && snap.schedulesCount === 0;
        if (untouched) deleteProtocolPhase(phaseId);
      }, 0);
    };
  }, [phaseId]);

  function refresh() {
    loadProtocolDetail(protocolId).then((data) => {
      setProtocol(data);
      setNotFound(!data);
      const p = data?.phases.find((ph) => ph.id === phaseId);
      if (p) {
        setName(p.name);
        setWeekRangeLabel(p.weekRangeLabel ?? "");
        setDescription(p.description ?? "");
        setTherapistNotes(p.therapistNotes ?? "");
        setForbidden(p.forbiddenActivities);
      } else if (data) {
        setNotFound(true);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([loadProtocolDetail(protocolId), loadRevaSchedules(), loadOrgSchedules(membership.organizationId)]).then(([data, revaData, orgData]) => {
      if (cancelled) return;
      setProtocol(data);
      setRevaSchedules(revaData);
      setOrgSchedules(orgData);
      const p = data?.phases.find((ph) => ph.id === phaseId);
      if (p) {
        setName(p.name);
        setWeekRangeLabel(p.weekRangeLabel ?? "");
        setDescription(p.description ?? "");
        setTherapistNotes(p.therapistNotes ?? "");
        setForbidden(p.forbiddenActivities);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, protocolId, phaseId]);

  function handleTitleBlur() {
    const next = name.trim();
    if (!next || !phase || next === phase.name) return;
    updateProtocolPhaseName(phaseId, next).then(({ error }) => {
      if (error) { showToast(error, "error"); return; }
      showToast("Titel opgeslagen");
      refresh();
    });
  }

  async function handleSaveDetails() {
    setSavingDetails(true);
    const { error } = await updateProtocolPhase(phaseId, { name, description, therapistNotes, weekRangeLabel, forbiddenActivities: forbidden });
    setSavingDetails(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Opgeslagen");
    refresh();
  }

  function addForbidden() {
    const t = newForbidden.trim();
    if (t && !forbidden.includes(t)) setForbidden((prev) => [...prev, t]);
    setNewForbidden("");
  }

  async function handleMovePhase(direction: -1 | 1) {
    if (!protocol || !phase) return;
    const ids = protocol.phases.map((p) => p.id);
    const index = ids.indexOf(phase.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await reorderProtocolPhases(ids);
    refresh();
  }

  async function handleConfirmDeletePhase() {
    setDeletingPhase(true);
    const { error } = await deleteProtocolPhase(phaseId);
    setDeletingPhase(false);
    setConfirmDeletePhase(false);
    if (error) { showToast(error, "error"); return; }
    router.push(`/portal/herstelplannen/${protocolId}`);
  }

  async function handleLinkSchedule(scheduleLibraryId: string, frequencyPerWeek: number) {
    if (!phase) return;
    setSaving(true);
    setModalError("");
    const existing = modal?.kind === "linkSchedule" ? modal.link : undefined;
    const { error } = existing
      ? await updatePhaseScheduleLink(existing.id, frequencyPerWeek)
      : await linkScheduleToPhase(phaseId, scheduleLibraryId, frequencyPerWeek, phase.schedules.length);
    setSaving(false);
    if (error) { setModalError(error); return; }
    setModal(null);
    refresh();
    showToast("Schema gekoppeld");
  }

  async function handleUnlinkSchedule() {
    if (!confirmUnlinkId) return;
    setConfirmBusy(true);
    const { error } = await unlinkScheduleFromPhase(confirmUnlinkId);
    setConfirmBusy(false);
    setConfirmUnlinkId(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Schema losgekoppeld");
    refresh();
  }

  async function handleSaveEducation(title: string, body: string) {
    if (!phase) return;
    setSaving(true);
    setModalError("");
    const existing = modal?.kind === "education" ? modal.item : undefined;
    const { error } = existing
      ? await updateProtocolPhaseEducationItem(existing.id, title, body)
      : await createProtocolPhaseEducationItem(phaseId, title, body, phase.educationItems.length);
    setSaving(false);
    if (error) { setModalError(error); return; }
    setModal(null);
    refresh();
    showToast("Educatie opgeslagen");
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button type="button" onClick={() => router.push(`/portal/herstelplannen/${protocolId}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Terug naar herstelplan
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !protocol || !phase ? (
        <p className="text-sm text-gray-400">Deze fase is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-start gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">{name || phase.name}</h2>
            <div className="flex items-center gap-2 pt-0.5">
              {weekRangeLabel && <Badge variant="muted">{weekRangeLabel}</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <Card>
                <CardHeader title="Titel" />
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <div>
                    <FieldLabel>Naam</FieldLabel>
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleTitleBlur}
                      disabled={!canEdit} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}
                    />
                  </div>
                  <div>
                    <FieldLabel>Week</FieldLabel>
                    <input
                      type="text" value={weekRangeLabel} onChange={(e) => setWeekRangeLabel(e.target.value)} placeholder="Bijv. Week 0-2"
                      disabled={!canEdit} className="w-full sm:w-32 text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Omschrijving" />
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Doel van de fase</FieldLabel>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Notities fysiotherapeut</FieldLabel>
                    <textarea value={therapistNotes} onChange={(e) => setTherapistNotes(e.target.value)} disabled={!canEdit} rows={2}
                      className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
                  </div>
                  <div>
                    <FieldLabel>Verboden activiteiten</FieldLabel>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {forbidden.map((a, i) => (
                        <Badge key={i} variant="danger" className="flex items-center gap-1">
                          {a}
                          {canEdit && <button type="button" onClick={() => setForbidden((prev) => prev.filter((_, idx) => idx !== i))}><X size={11} /></button>}
                        </Badge>
                      ))}
                      {forbidden.length === 0 && <p className="text-sm text-gray-400">Geen verboden activiteiten.</p>}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text" value={newForbidden} onChange={(e) => setNewForbidden(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addForbidden(); } }}
                          placeholder="Bijv. hardlopen" className="flex-1 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={addForbidden}>Toevoegen</Button>
                      </div>
                    )}
                  </div>
                  {canEdit && <Button size="sm" disabled={savingDetails} onClick={handleSaveDetails}>{savingDetails ? "Opslaan…" : "Opslaan"}</Button>}
                </div>
              </Card>

              <Card>
                <CriteriaList phase={phase} canEdit={canEdit} onChanged={refresh} onError={(m) => showToast(m, "error")} />
              </Card>

              <Card>
                <MilestoneList phase={phase} canEdit={canEdit} onChanged={refresh} onError={(m) => showToast(m, "error")} />
              </Card>

              <Card>
                <CardHeader
                  title="Educatie"
                  action={canEdit ? <Button size="sm" onClick={() => { setModalError(""); setModal({ kind: "education" }); }}><Plus size={14} /> Toevoegen</Button> : undefined}
                />
                {phase.educationItems.length === 0 ? (
                  <p className="text-sm text-gray-400">Nog geen educatie toegevoegd.</p>
                ) : (
                  <div className="space-y-2">
                    {phase.educationItems.map((item) => (
                      <div key={item.id} className="rounded-lg p-3 text-sm" style={{ background: "#f8f7f4" }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-800 flex items-center gap-1.5">
                            <BookOpen size={12} className="text-gray-400 shrink-0" />
                            {item.title}
                          </p>
                          {canEdit && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" onClick={() => { setModalError(""); setModal({ kind: "education", item }); }} className="text-xs text-gray-400 hover:text-gray-600">
                                Bewerken
                              </button>
                              <button type="button" onClick={() => { deleteProtocolPhaseEducationItem(item.id).then(({ error }) => { if (error) { showToast(error, "error"); return; } showToast("Educatie verwijderd"); refresh(); }); }} className="text-gray-300 hover:text-red-500">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                        {item.body && <p className="text-xs text-gray-500 mt-1 pl-[18px]">{item.body}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Schema's in deze fase"
                  action={canEdit ? <Button size="sm" onClick={() => { setModalError(""); setModal({ kind: "linkSchedule" }); }}><Plus size={14} /> Schema koppelen</Button> : undefined}
                />
                {phase.schedules.length === 0 ? (
                  <p className="text-sm text-gray-400">Nog geen trainingsschema&apos;s gekoppeld.</p>
                ) : (
                  <div className="space-y-3">
                    {phase.schedules.map((schedule) => (
                      <div key={schedule.id} className="rounded-xl border p-3" style={{ borderColor: "#e8e5df" }}>
                        <div className="flex items-start justify-between gap-2 mb-2.5 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <Dumbbell size={13} className="text-gray-400 shrink-0" />
                            <p className="text-sm font-medium text-gray-800 truncate">{schedule.title}</p>
                            <Badge variant="blue">{schedule.frequencyPerWeek}× per week</Badge>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              href={`/portal/schemas/${schedule.scheduleLibraryId}`}
                              className="inline-flex items-center gap-1 text-xs font-medium mr-1"
                              style={{ color: "var(--brand-accent, #e8632a)" }}
                            >
                              Bewerk schema <ExternalLink size={11} />
                            </Link>
                            {canEdit && (
                              <>
                                <button type="button" onClick={() => { setModalError(""); setModal({ kind: "linkSchedule", link: schedule }); }} title="Frequentie wijzigen" className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                                  <Pencil size={12} />
                                </button>
                                <button type="button" onClick={() => setConfirmUnlinkId(schedule.id)} title="Loskoppelen" className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-gray-50 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {schedule.exercises.length === 0 ? (
                          <p className="text-xs text-gray-400">Nog geen oefeningen in dit schema.</p>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-1.5">
                            {schedule.exercises.map((ex) => (
                              <div key={ex.id} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: "#f8f7f4" }}>
                                <Dumbbell size={12} className="text-gray-400 shrink-0" />
                                <span className="text-gray-700 truncate">{ex.exerciseTitle}</span>
                                {(ex.prescribedSets || ex.prescribedReps) && (
                                  <Badge variant="muted" className="ml-auto shrink-0">
                                    {ex.prescribedSets ?? "?"}×{ex.prescribedReps ?? "?"}{ex.prescribedLoadText ? ` · ${ex.prescribedLoadText}` : ""}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6 min-w-0">
              <Card>
                <CardHeader title="Herstelplan" />
                <div className="space-y-3">
                  <Link href={`/portal/herstelplannen/${protocolId}`} className="text-sm font-medium truncate block" style={{ color: "var(--brand-accent, #e8632a)" }}>
                    {protocol.name}
                  </Link>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="secondary" disabled={phaseIndex === 0} onClick={() => handleMovePhase(-1)}><ChevronUp size={14} /> Eerder</Button>
                      <Button size="sm" variant="secondary" disabled={phaseIndex === protocol.phases.length - 1} onClick={() => handleMovePhase(1)}><ChevronDown size={14} /> Later</Button>
                    </div>
                  )}
                </div>
              </Card>

              {canEdit && (
                <Card>
                  <CardHeader title="Verwijderen" />
                  <p className="text-xs text-gray-500 mb-3">Deze fase inclusief alle criteria, mijlpalen, educatie en schema-koppelingen wordt permanent verwijderd.</p>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDeletePhase(true)}>Fase verwijderen</Button>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {modal?.kind === "education" && (
        <EducationModal title={modal.item?.title ?? ""} body={modal.item?.body ?? ""} saving={saving} error={modalError}
          onClose={() => setModal(null)} onSave={handleSaveEducation} />
      )}
      {modal?.kind === "linkSchedule" && membership && (
        <LinkScheduleModal
          initialScheduleId={modal.link?.scheduleLibraryId ?? ""}
          initialFrequency={modal.link?.frequencyPerWeek ?? 3}
          isEditingFrequencyOnly={!!modal.link}
          revaSchedules={revaSchedules}
          orgSchedules={orgSchedules}
          organizationId={membership.organizationId}
          saving={saving}
          error={modalError}
          onClose={() => setModal(null)}
          onSave={handleLinkSchedule}
          onScheduleCreated={(s) => setOrgSchedules((prev) => [...prev, s].sort((a, b) => a.title.localeCompare(b.title)))}
        />
      )}

      {confirmUnlinkId && (
        <ConfirmDialog
          title="Schema loskoppelen?"
          message="Dit schema wordt losgekoppeld van deze fase. Het schema zelf blijft bestaan in de bibliotheek."
          confirmLabel="Loskoppelen"
          loading={confirmBusy}
          onCancel={() => setConfirmUnlinkId(null)}
          onConfirm={handleUnlinkSchedule}
        />
      )}

      {confirmDeletePhase && (
        <ConfirmDialog
          title="Fase verwijderen?"
          message="Deze fase inclusief alle criteria, mijlpalen, educatie en schema's wordt permanent verwijderd."
          confirmLabel="Verwijderen"
          loading={deletingPhase}
          onCancel={() => setConfirmDeletePhase(false)}
          onConfirm={handleConfirmDeletePhase}
        />
      )}
      {toastNode}
    </div>
  );
}

// ─── Criteria (inline lijst, direct bewerkbaar) ────────────────────────────

function CriteriaList({ phase, canEdit, onChanged, onError }: { phase: PortalProtocolPhase; canEdit: boolean; onChanged: () => void; onError: (message: string) => void }) {
  const [newText, setNewText] = useState("");

  async function handleAdd() {
    if (!newText.trim()) return;
    const { error } = await createProtocolPhaseCriterion(phase.id, newText, phase.criteria.length);
    if (error) { onError(error); return; }
    setNewText("");
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <ListChecks size={13} style={{ color: "var(--brand-accent, #e8632a)" }} />
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Criteria</h4>
      </div>
      {phase.criteria.length === 0 && !canEdit && <p className="text-xs text-gray-400">Geen criteria.</p>}
      <div className="space-y-1.5">
        {phase.criteria.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg pl-2.5 pr-1.5" style={!canEdit ? { background: "#f8f7f4" } : undefined}>
            {!canEdit && <Circle size={7} className="text-gray-400 shrink-0 fill-current" />}
            <input
              type="text" defaultValue={c.description} disabled={!canEdit}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.description) updateProtocolPhaseCriterion(c.id, e.target.value).then(({ error }) => { if (error) { onError(error); return; } onChanged(); }); }}
              className="flex-1 text-sm rounded-lg border px-2.5 py-1.5 focus:outline-none disabled:opacity-70 disabled:border-transparent disabled:bg-transparent" style={canEdit ? inputStyle : { background: "transparent", borderColor: "transparent" }}
            />
            {canEdit && (
              <button type="button" onClick={() => deleteProtocolPhaseCriterion(c.id).then(({ error }) => { if (error) { onError(error); return; } onChanged(); })} className="text-gray-300 hover:text-red-500 shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex items-center gap-2">
            <input
              type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder="Nieuw criterium, bijv. volledige extensie"
              className="flex-1 text-sm rounded-lg border px-2.5 py-1.5 focus:outline-none" style={inputStyle}
            />
            <button type="button" onClick={handleAdd} className="text-gray-400 hover:text-gray-600 shrink-0"><Plus size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneList({ phase, canEdit, onChanged, onError }: { phase: PortalProtocolPhase; canEdit: boolean; onChanged: () => void; onError: (message: string) => void }) {
  const [newText, setNewText] = useState("");

  async function handleAdd() {
    if (!newText.trim()) return;
    const { error } = await createProtocolPhaseMilestone(phase.id, newText, phase.milestones.length);
    if (error) { onError(error); return; }
    setNewText("");
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Flag size={13} style={{ color: "var(--brand-accent, #e8632a)" }} />
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mijlpalen</h4>
      </div>
      {phase.milestones.length === 0 && !canEdit && <p className="text-xs text-gray-400">Geen mijlpalen.</p>}
      <div className="space-y-1.5">
        {phase.milestones.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-lg pl-2.5 pr-1.5" style={!canEdit ? { background: "#f8f7f4" } : undefined}>
            {!canEdit && <Flag size={11} className="text-gray-400 shrink-0" />}
            <input
              type="text" defaultValue={m.title} disabled={!canEdit}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== m.title) updateProtocolPhaseMilestone(m.id, e.target.value).then(({ error }) => { if (error) { onError(error); return; } onChanged(); }); }}
              className="flex-1 text-sm rounded-lg border px-2.5 py-1.5 focus:outline-none disabled:opacity-70 disabled:border-transparent disabled:bg-transparent" style={canEdit ? inputStyle : { background: "transparent", borderColor: "transparent" }}
            />
            {canEdit && (
              <button type="button" onClick={() => deleteProtocolPhaseMilestone(m.id).then(({ error }) => { if (error) { onError(error); return; } onChanged(); })} className="text-gray-300 hover:text-red-500 shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex items-center gap-2">
            <input
              type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder="Nieuwe mijlpaal, bijv. brace verwijderen"
              className="flex-1 text-sm rounded-lg border px-2.5 py-1.5 focus:outline-none" style={inputStyle}
            />
            <button type="button" onClick={handleAdd} className="text-gray-400 hover:text-gray-600 shrink-0"><Plus size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modals ─────────────────────────────────────────────────────────────────

function EducationModal({
  title, body, saving, error, onClose, onSave,
}: {
  title: string; body: string; saving: boolean; error: string;
  onClose: () => void; onSave: (title: string, body: string) => void;
}) {
  const [t, setT] = useState(title);
  const [b, setB] = useState(body);
  return (
    <Modal onClose={onClose} maxWidth="max-w-md" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-4">Educatie</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(t, b); }} className="space-y-4">
          <div>
            <FieldLabel>Titel</FieldLabel>
            <input type="text" value={t} onChange={(e) => setT(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Toelichting</FieldLabel>
            <textarea value={b} onChange={(e) => setB(e.target.value)} rows={4} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button type="submit" size="sm" disabled={saving || !t.trim()}>{saving ? "Opslaan…" : "Opslaan"}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function LinkScheduleModal({
  initialScheduleId, initialFrequency, isEditingFrequencyOnly, revaSchedules, orgSchedules, organizationId,
  saving, error, onClose, onSave, onScheduleCreated,
}: {
  initialScheduleId: string;
  initialFrequency: number;
  isEditingFrequencyOnly: boolean;
  revaSchedules: PortalScheduleLibraryCard[];
  orgSchedules: PortalScheduleLibraryCard[];
  organizationId: string;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (scheduleLibraryId: string, frequencyPerWeek: number) => void;
  onScheduleCreated: (schedule: PortalScheduleLibraryCard) => void;
}) {
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [scheduleId, setScheduleId] = useState(initialScheduleId);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateSchedule() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { id, error: createErr } = await createScheduleLibraryItem(organizationId, { title: newTitle, description: "" });
    setCreating(false);
    if (createErr || !id) return;
    onScheduleCreated({ id, scope: "organization", title: newTitle.trim(), description: null, archived: false, exerciseCount: 0, createdAt: new Date().toISOString(), createdBy: null, createdByName: null });
    setScheduleId(id);
    setShowNewSchedule(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(scheduleId, frequency);
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-4">Trainingsschema koppelen</h3>

        {!showNewSchedule ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEditingFrequencyOnly && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>Schema</FieldLabel>
                  <button type="button" onClick={() => setShowNewSchedule(true)} className="text-xs font-medium" style={{ color: "var(--brand-accent, #e8632a)" }}>
                    + Nieuw schema
                  </button>
                </div>
                <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}>
                  <option value="">Kies een schema…</option>
                  {orgSchedules.filter((s) => !s.archived).length > 0 && (
                    <optgroup label="Eigen bibliotheek">
                      {orgSchedules.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </optgroup>
                  )}
                  {revaSchedules.length > 0 && (
                    <optgroup label="REVA-bibliotheek">
                      {revaSchedules.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
            <div>
              <FieldLabel>Frequentie in deze fase (keer per week)</FieldLabel>
              <input type="number" min={1} max={21} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
              <Button type="submit" size="sm" disabled={saving || !scheduleId}>{saving ? "Opslaan…" : "Opslaan"}</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <FieldLabel>Naam van het nieuwe schema</FieldLabel>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Bijv. Krachtopbouw week 6-12"
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <p className="text-xs text-gray-400">Voeg de oefeningen toe zodra het schema is aangemaakt, via de Schema&apos;s-pagina.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowNewSchedule(false)}>Terug</Button>
              <Button type="button" size="sm" disabled={creating || !newTitle.trim()} onClick={handleCreateSchedule}>
                {creating ? "Aanmaken…" : "Schema aanmaken"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
