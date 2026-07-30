"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronRight, Plus, X, Trash2, Layers, Dumbbell, ExternalLink,
  ListChecks, Flag, BookOpen, Circle,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadProtocolDetail, updateProtocol, updateProtocolArchived, deleteProtocol,
  createProtocolPhase, updateProtocolPhase, deleteProtocolPhase, reorderProtocolPhases,
  createProtocolPhaseCriterion, updateProtocolPhaseCriterion, deleteProtocolPhaseCriterion,
  createProtocolPhaseMilestone, updateProtocolPhaseMilestone, deleteProtocolPhaseMilestone,
  createProtocolPhaseEducationItem, updateProtocolPhaseEducationItem, deleteProtocolPhaseEducationItem,
  linkScheduleToPhase, updatePhaseScheduleLink, unlinkScheduleFromPhase,
  loadRevaSchedules, loadOrgSchedules, createScheduleLibraryItem,
  MANAGE_PROTOCOLS_ROLES, INJURY_CATEGORY_LABELS,
  type PortalProtocolDetail, type PortalProtocolPhase, type PortalProtocolEducationItem,
  type PortalProtocolSchedule, type PortalScheduleLibraryCard,
  type PortalProtocolPhaseInput,
} from "@/lib/services/protocolService";

const inputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

type TabKey = "fasen" | "instellingen";
const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: "fasen", label: "Fasen" },
  { value: "instellingen", label: "Instellingen" },
];

type ModalState =
  | { kind: "phase"; phase?: PortalProtocolPhase }
  | { kind: "education"; phaseId: string; item?: PortalProtocolEducationItem }
  | { kind: "linkSchedule"; phaseId: string; link?: PortalProtocolSchedule }
  | null;

const emptyPhaseInput: PortalProtocolPhaseInput = { name: "", description: "", therapistNotes: "", weekRangeLabel: "", forbiddenActivities: [] };

export default function PortalProtocolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const protocolId = params.id as string;
  const { checked, membership } = usePortalMembership();

  const [protocol, setProtocol] = useState<PortalProtocolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("fasen");
  const [revaSchedules, setRevaSchedules] = useState<PortalScheduleLibraryCard[]>([]);
  const [orgSchedules, setOrgSchedules] = useState<PortalScheduleLibraryCard[]>([]);
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  // Instellingen-tab
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsInjuryCategory, setSettingsInjuryCategory] = useState("custom");
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmDeletePhaseId, setConfirmDeletePhaseId] = useState<string | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmDeleteProtocol, setConfirmDeleteProtocol] = useState(false);
  const [deletingProtocol, setDeletingProtocol] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManage = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);
  const canEdit = canManage && protocol?.scope === "organization";

  function refresh() {
    loadProtocolDetail(protocolId).then((data) => {
      setProtocol(data);
      setNotFound(!data);
      if (data) {
        setSettingsName(data.name);
        setSettingsDescription(data.description ?? "");
        setSettingsInjuryCategory(data.injuryCategory);
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
      setNotFound(!data);
      setRevaSchedules(revaData);
      setOrgSchedules(orgData);
      if (data) {
        setSettingsName(data.name);
        setSettingsDescription(data.description ?? "");
        setSettingsInjuryCategory(data.injuryCategory);
        setExpandedPhaseIds(new Set(data.phases.length > 0 ? [data.phases[0].id] : []));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [checked, membership, protocolId]);

  function togglePhase(phaseId: string) {
    setExpandedPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId); else next.add(phaseId);
      return next;
    });
  }

  async function handleMovePhase(phaseId: string, direction: -1 | 1) {
    if (!protocol) return;
    const ids = protocol.phases.map((p) => p.id);
    const index = ids.indexOf(phaseId);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await reorderProtocolPhases(ids);
    refresh();
  }

  async function handleSavePhase(input: PortalProtocolPhaseInput) {
    if (!protocol) return;
    setSaving(true);
    setModalError("");
    const existing = modal?.kind === "phase" ? modal.phase : undefined;
    const { id, error } = existing
      ? { id: existing.id, error: (await updateProtocolPhase(existing.id, input)).error }
      : await createProtocolPhase(protocol.id, input, protocol.phases.length);
    setSaving(false);
    if (error) { setModalError(error); return; }
    // Nieuw toegevoegde fase direct openklappen zodat de therapeut meteen door
    // kan met criteria/mijlpalen/schema's, zonder een extra klik.
    if (!existing && id) setExpandedPhaseIds((prev) => new Set(prev).add(id));
    setModal(null);
    refresh();
    showToast("Fase opgeslagen");
  }

  async function handleDeletePhase() {
    if (!confirmDeletePhaseId) return;
    setConfirmBusy(true);
    const { error } = await deleteProtocolPhase(confirmDeletePhaseId);
    setConfirmBusy(false);
    setConfirmDeletePhaseId(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Fase verwijderd");
    refresh();
  }

  async function handleLinkSchedule(phaseId: string, scheduleLibraryId: string, frequencyPerWeek: number) {
    setSaving(true);
    setModalError("");
    const existing = modal?.kind === "linkSchedule" ? modal.link : undefined;
    const phase = protocol?.phases.find((p) => p.id === phaseId);
    const { error } = existing
      ? await updatePhaseScheduleLink(existing.id, frequencyPerWeek)
      : await linkScheduleToPhase(phaseId, scheduleLibraryId, frequencyPerWeek, phase?.schedules.length ?? 0);
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

  async function handleSaveEducation(phaseId: string, title: string, body: string) {
    setSaving(true);
    setModalError("");
    const existing = modal?.kind === "education" ? modal.item : undefined;
    const phase = protocol?.phases.find((p) => p.id === phaseId);
    const { error } = existing
      ? await updateProtocolPhaseEducationItem(existing.id, title, body)
      : await createProtocolPhaseEducationItem(phaseId, title, body, phase?.educationItems.length ?? 0);
    setSaving(false);
    if (error) { setModalError(error); return; }
    setModal(null);
    refresh();
    showToast("Educatie opgeslagen");
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!protocol) return;
    setSavingSettings(true);
    const { error } = await updateProtocol(protocol.id, { name: settingsName, description: settingsDescription, injuryCategory: settingsInjuryCategory });
    setSavingSettings(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Instellingen opgeslagen");
    refresh();
  }

  async function handleToggleArchived() {
    if (!protocol) return;
    const nextArchived = !protocol.archived;
    const { error } = await updateProtocolArchived(protocol.id, nextArchived);
    if (error) { showToast(error, "error"); return; }
    showToast(nextArchived ? "Herstelplan gearchiveerd" : "Herstelplan gedearchiveerd");
    refresh();
  }

  async function handleConfirmDeleteProtocol() {
    if (!protocol) return;
    setDeletingProtocol(true);
    const { error } = await deleteProtocol(protocol.id);
    setDeletingProtocol(false);
    setConfirmDeleteProtocol(false);
    if (error) { showToast(error, "error"); return; }
    router.push("/portal/herstelplannen");
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push("/portal/herstelplannen")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Terug naar herstelplannen
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !protocol ? (
        <p className="text-sm text-gray-400">Dit herstelplan is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <SectionHeader
              title={protocol.name}
              subtitle={
                protocol.scope === "organization"
                  ? `${INJURY_CATEGORY_LABELS[protocol.injuryCategory] ?? protocol.injuryCategory} · Gemaakt door ${protocol.createdByName ?? "onbekend"}`
                  : INJURY_CATEGORY_LABELS[protocol.injuryCategory] ?? protocol.injuryCategory
              }
            />
            {protocol.scope === "reva" && !protocol.clinicallyReviewed && <Badge variant="warning">Nog niet klinisch gereviewd</Badge>}
            {protocol.scope === "reva" ? (
              <Badge variant="blue">REVA — alleen-lezen</Badge>
            ) : protocol.archived ? (
              <Badge variant="muted">Gearchiveerd</Badge>
            ) : (
              <Badge variant="success">Actief</Badge>
            )}
          </div>
          {protocol.scope === "reva" && !protocol.clinicallyReviewed && (
            <p className="text-sm rounded-xl p-3" style={{ background: "#fffbeb", color: "#b45309" }}>
              Dit REVA-herstelplan is nog niet door een fysiotherapeut klinisch gereviewd. Wijs dit herstelplan nog niet toe aan patiënten — dupliceer het naar je eigen bibliotheek zodra je de inhoud hebt gecontroleerd.
            </p>
          )}

          <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

          {tab === "fasen" && (
            <div className="space-y-4">
              {canEdit && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => { setModalError(""); setModal({ kind: "phase" }); }}>
                    <Plus size={14} /> Fase toevoegen
                  </Button>
                </div>
              )}

              {protocol.phases.length === 0 ? (
                <EmptyState icon={Layers} title="Nog geen fases" description={canEdit ? "Voeg de eerste fase toe om te beginnen." : undefined} />
              ) : (
                protocol.phases.map((phase, index) => {
                  const expanded = expandedPhaseIds.has(phase.id);
                  return (
                    <Card
                      key={phase.id}
                      padding="none"
                      style={{
                        borderLeftWidth: expanded ? "3px" : "1px",
                        borderLeftStyle: "solid",
                        borderLeftColor: expanded ? "var(--brand-accent, #e8632a)" : "#e8e5df",
                      }}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => togglePhase(phase.id)} className="flex items-center gap-2 text-left min-w-0">
                            <ChevronRight size={16} className="text-gray-400 shrink-0 transition-transform" style={{ transform: expanded ? "rotate(90deg)" : "none" }} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">{phase.name}</h3>
                                {phase.weekRangeLabel && <Badge variant="muted">{phase.weekRangeLabel}</Badge>}
                              </div>
                              {phase.description && <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>}
                            </div>
                          </button>
                          {canEdit && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => handleMovePhase(phase.id, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400">
                                <ChevronUp size={14} />
                              </button>
                              <button type="button" onClick={() => handleMovePhase(phase.id, 1)} disabled={index === protocol.phases.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-400">
                                <ChevronDown size={14} />
                              </button>
                              <ActionMenu
                                items={[
                                  { label: "Bewerken", onClick: () => { setModalError(""); setModal({ kind: "phase", phase }); } },
                                  { label: "Verwijderen", onClick: () => setConfirmDeletePhaseId(phase.id), danger: true },
                                ]}
                              />
                            </div>
                          )}
                        </div>

                        {expanded && (
                          <div className="mt-4 space-y-5 pl-6">
                            {phase.forbiddenActivities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {phase.forbiddenActivities.map((a, i) => (
                                  <Badge key={i} variant="danger">Verboden: {a}</Badge>
                                ))}
                              </div>
                            )}

                            <CriteriaList phase={phase} canEdit={canEdit} onChanged={refresh} onError={(m) => showToast(m, "error")} />
                            <MilestoneList phase={phase} canEdit={canEdit} onChanged={refresh} onError={(m) => showToast(m, "error")} />

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <BookOpen size={13} style={{ color: "var(--brand-accent, #e8632a)" }} />
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Educatie</h4>
                                </div>
                                {canEdit && (
                                  <Button size="sm" variant="secondary" onClick={() => { setModalError(""); setModal({ kind: "education", phaseId: phase.id }); }}>
                                    <Plus size={12} /> Toevoegen
                                  </Button>
                                )}
                              </div>
                              {phase.educationItems.length === 0 ? (
                                <p className="text-xs text-gray-400">Nog geen educatie toegevoegd.</p>
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
                                            <button type="button" onClick={() => { setModalError(""); setModal({ kind: "education", phaseId: phase.id, item }); }} className="text-xs text-gray-400 hover:text-gray-600">
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
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Dumbbell size={13} style={{ color: "var(--brand-accent, #e8632a)" }} />
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trainingsschema&apos;s</h4>
                                </div>
                                {canEdit && (
                                  <Button size="sm" variant="secondary" onClick={() => { setModalError(""); setModal({ kind: "linkSchedule", phaseId: phase.id }); }}>
                                    <Plus size={12} /> Schema koppelen
                                  </Button>
                                )}
                              </div>
                              {phase.schedules.length === 0 ? (
                                <p className="text-xs text-gray-400">Nog geen trainingsschema&apos;s gekoppeld.</p>
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
                                        <div className="flex items-center gap-3 shrink-0">
                                          <Link
                                            href={`/portal/schemas/${schedule.scheduleLibraryId}`}
                                            className="inline-flex items-center gap-1 text-xs font-medium"
                                            style={{ color: "var(--brand-accent, #e8632a)" }}
                                          >
                                            Bewerk oefeningen in bibliotheek <ExternalLink size={11} />
                                          </Link>
                                          {canEdit && (
                                            <ActionMenu
                                              items={[
                                                { label: "Frequentie wijzigen", onClick: () => { setModalError(""); setModal({ kind: "linkSchedule", phaseId: phase.id, link: schedule }); } },
                                                { label: "Loskoppelen", onClick: () => setConfirmUnlinkId(schedule.id), danger: true },
                                              ]}
                                            />
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
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {tab === "instellingen" && (
            <Card>
              <CardHeader title="Instellingen" subtitle={canEdit ? undefined : "Dit herstelplan kan hier niet bewerkt worden."} />
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <FieldLabel>Naam</FieldLabel>
                  <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} disabled={!canEdit}
                    className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Blessure / ingreep</FieldLabel>
                  <select value={settingsInjuryCategory} onChange={(e) => setSettingsInjuryCategory(e.target.value)} disabled={!canEdit}
                    className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60" style={inputStyle}>
                    {Object.entries(INJURY_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Omschrijving</FieldLabel>
                  <textarea value={settingsDescription} onChange={(e) => setSettingsDescription(e.target.value)} disabled={!canEdit} rows={3}
                    className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none disabled:opacity-60 resize-none" style={inputStyle} />
                </div>
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={savingSettings}>{savingSettings ? "Opslaan…" : "Opslaan"}</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={handleToggleArchived}>
                      {protocol.archived ? "Dearchiveren" : "Archiveren"}
                    </Button>
                    {protocol.archived && (
                      <Button type="button" size="sm" variant="danger" onClick={() => setConfirmDeleteProtocol(true)}>
                        Verwijderen
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </Card>
          )}
        </>
      )}

      {modal?.kind === "phase" && (
        <PhaseModal input={modal.phase ? { name: modal.phase.name, description: modal.phase.description ?? "", therapistNotes: modal.phase.therapistNotes ?? "", weekRangeLabel: modal.phase.weekRangeLabel ?? "", forbiddenActivities: modal.phase.forbiddenActivities } : emptyPhaseInput}
          saving={saving} error={modalError} onClose={() => setModal(null)} onSave={handleSavePhase} />
      )}
      {modal?.kind === "education" && (
        <EducationModal title={modal.item?.title ?? ""} body={modal.item?.body ?? ""} saving={saving} error={modalError}
          onClose={() => setModal(null)} onSave={(title, body) => handleSaveEducation(modal.phaseId, title, body)} />
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
          onSave={(scheduleLibraryId, frequency) => handleLinkSchedule(modal.phaseId, scheduleLibraryId, frequency)}
          onScheduleCreated={(s) => setOrgSchedules((prev) => [...prev, s].sort((a, b) => a.title.localeCompare(b.title)))}
        />
      )}

      {confirmDeletePhaseId && (
        <ConfirmDialog
          title="Fase verwijderen?"
          message="Deze fase inclusief alle criteria, mijlpalen, educatie en schema's wordt permanent verwijderd."
          confirmLabel="Verwijderen"
          loading={confirmBusy}
          onCancel={() => setConfirmDeletePhaseId(null)}
          onConfirm={handleDeletePhase}
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

      {confirmDeleteProtocol && (
        <ConfirmDialog
          title="Herstelplan verwijderen?"
          message="Dit herstelplan wordt permanent verwijderd, inclusief alle fases, criteria, mijlpalen en educatie. Patiënten die dit herstelplan al toegewezen hadden gekregen behouden hun eigen kopie."
          confirmLabel="Herstelplan verwijderen"
          loading={deletingProtocol}
          onCancel={() => setConfirmDeleteProtocol(false)}
          onConfirm={handleConfirmDeleteProtocol}
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

function PhaseModal({
  input, saving, error, onClose, onSave,
}: {
  input: PortalProtocolPhaseInput; saving: boolean; error: string;
  onClose: () => void; onSave: (input: PortalProtocolPhaseInput) => void;
}) {
  const [name, setName] = useState(input.name);
  const [description, setDescription] = useState(input.description);
  const [therapistNotes, setTherapistNotes] = useState(input.therapistNotes);
  const [weekRangeLabel, setWeekRangeLabel] = useState(input.weekRangeLabel);
  const [forbidden, setForbidden] = useState<string[]>(input.forbiddenActivities);
  const [newForbidden, setNewForbidden] = useState("");

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg" dismissOnBackdropClick={false}>
      <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
        <h3 className="font-semibold text-gray-900 mb-4">Fase</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ name, description, therapistNotes, weekRangeLabel, forbiddenActivities: forbidden }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <FieldLabel>Naam</FieldLabel>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Vroege mobilisatie"
                className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Week</FieldLabel>
              <input type="text" value={weekRangeLabel} onChange={(e) => setWeekRangeLabel(e.target.value)} placeholder="Bijv. Week 0-2"
                className="w-full sm:w-32 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <FieldLabel>Doel van de fase</FieldLabel>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Notities fysiotherapeut</FieldLabel>
            <textarea value={therapistNotes} onChange={(e) => setTherapistNotes(e.target.value)} rows={2}
              className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Verboden activiteiten</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {forbidden.map((a, i) => (
                <Badge key={i} variant="danger" className="flex items-center gap-1">
                  {a}
                  <button type="button" onClick={() => setForbidden((prev) => prev.filter((_, idx) => idx !== i))}><X size={11} /></button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text" value={newForbidden} onChange={(e) => setNewForbidden(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newForbidden.trim()) { setForbidden((prev) => [...prev, newForbidden.trim()]); setNewForbidden(""); } } }}
                placeholder="Bijv. hardlopen" className="flex-1 text-sm rounded-xl border px-3 py-2 focus:outline-none" style={inputStyle}
              />
              <Button type="button" size="sm" variant="secondary" onClick={() => { if (newForbidden.trim()) { setForbidden((prev) => [...prev, newForbidden.trim()]); setNewForbidden(""); } }}>Toevoegen</Button>
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>{saving ? "Opslaan…" : "Opslaan"}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

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
    onScheduleCreated({ id, scope: "organization", title: newTitle.trim(), description: null, archived: false, exerciseCount: 0, createdAt: new Date().toISOString() });
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
