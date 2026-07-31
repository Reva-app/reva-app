"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Camera, Pill, CalendarClock, Dumbbell, Award, Droplets, Pencil, Star, Flag, ClipboardList, Check, ChevronRight, RotateCcw, MessageSquare, Trash2, Loader2, X } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientEditForm } from "@/components/portal/PatientEditForm";
import { ExerciseMultiSelectModal } from "@/components/portal/ExerciseMultiSelectModal";
import { ExerciseThumb } from "@/components/portal/ExerciseThumb";
import { SortableExerciseList } from "@/components/portal/SortableExerciseList";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDate, formatDateShort } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalPatients,
  loadPortalPatientExtras,
  loadPortalLocations,
  loadPortalMembers,
  MANAGE_PATIENTS_ROLES,
  type PortalPatient,
  type PortalPatientExtras,
  type PortalCheckinTrendPoint,
  type PortalMainGoal,
  type PortalLocationOption,
  type PortalMember,
} from "@/lib/services/portalService";
import { resolveSignedUrl } from "@/lib/services/storageService";
import {
  loadRevaProtocols, loadOrgProtocols, assignProtocolToPatient,
  loadPatientProtocolAssignment, toggleCriterionMet, updateMilestoneCompletion, advanceToNextPhase, revertToPreviousPhase,
  loadPatientSessionNotes, loadExerciseLibrary,
  addExercisesToPatientSchedule, updatePatientScheduleExercise, removeExerciseFromPatientSchedule, reorderPatientScheduleExercises,
  loadPatientStaffNotes, addPatientStaffNote, updatePatientStaffNote, deletePatientStaffNote,
  MANAGE_PROTOCOLS_ROLES,
  type PortalProtocolCard, type PortalPatientProtocolAssignment, type PortalPatientProtocolPhase, type PortalPatientSessionNote,
  type PortalExerciseLibraryItem, type PortalPatientProtocolScheduleExercise, type PortalPatientScheduleExerciseInput,
  type PortalPatientStaffNote,
} from "@/lib/services/protocolService";

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "inactive") return <Badge variant="muted">Inactief</Badge>;
  if (status === "archived") return <Badge variant="muted">Gearchiveerd</Badge>;
  return <Badge variant="muted">{status}</Badge>;
}

function genderLabel(gender: string | null) {
  if (gender === "man") return "Man";
  if (gender === "vrouw") return "Vrouw";
  if (gender === "anders") return "Anders";
  return "—";
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  ziekenhuis: "Ziekenhuis consult",
  fysio: "Fysiotherapie",
  mri: "MRI / Scan",
  operatie: "Operatie",
  nacontrole: "Nacontrole",
  "second-opinion": "Second opinion",
  telefonisch: "Telefonisch consult",
};

function appointmentTypeLabel(type: string | null): string | null {
  if (!type) return null;
  return APPOINTMENT_TYPE_LABELS[type] ?? type;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86_400_000);
}

// ─── Check-in trend (compact lijngrafiek van de dagscore) ──────────────────

const TREND_RANGES = [
  { value: 7, label: "7 dagen" },
  { value: 14, label: "14 dagen" },
  { value: 30, label: "30 dagen" },
] as const;

function TrendRangeFilter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "#f3f0eb" }}>
      {TREND_RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
          style={
            value === r.value
              ? { background: "#ffffff", color: "#1a1a1a", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
              : { color: "#9ca3af" }
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function CheckinTrendChart({ points }: { points: PortalCheckinTrendPoint[] }) {
  if (points.length < 2) return null;
  const W = 480;
  const H = 90;
  const padX = 8;
  const padY = 6;
  const labelZoneH = 16;
  const chartH = H - labelZoneH;
  const max = 5;
  const xStep = (W - padX * 2) / (points.length - 1);
  const pts = points.map((p, i) => ({
    x: padX + i * xStep,
    y: padY + (1 - Math.min(p.dayScore, max) / max) * (chartH - padY * 2),
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${chartH} ` + pts.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${chartH} Z`;

  // Nooit meer dan ~7 datumlabels tonen, anders lopen ze bij 30 dagen in
  // elkaar over — bij minder punten (bv. 7-dagenfilter) wordt gewoon elk
  // punt gelabeld.
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="checkin-trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--brand-accent, #e8632a)" }} stopOpacity="0.15" />
            <stop offset="100%" style={{ stopColor: "var(--brand-accent, #e8632a)" }} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} y1={padY + f * (chartH - padY * 2)} x2={W - padX} y2={padY + f * (chartH - padY * 2)} stroke="#f0ede8" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#checkin-trend-grad)" />
        <polyline points={polyline} fill="none" style={{ stroke: "var(--brand-accent, #e8632a)" }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" style={{ fill: "var(--brand-accent, #e8632a)" }} />
        {pts.map((p, i) => {
          if (i % labelStep !== 0 && i !== pts.length - 1) return null;
          const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
          return (
            <text key={i} x={p.x} y={H - 3} fontSize="8" textAnchor={anchor} fill="#9ca3af">
              {formatDateShort(points[i].date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Hoofddoelstelling — zelfde donkere kaartstijl als in de patiënt-app ────

function MainGoalCard({ goal }: { goal: PortalMainGoal }) {
  const isDone = goal.completed;
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: isDone ? "#1a2e1f" : "#0f1115",
        border: `1px solid ${isDone ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: isDone ? "rgba(34,197,94,0.15)" : "rgba(232,99,42,0.15)" }}
        >
          {goal.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Star size={11} style={{ color: "var(--brand-accent, #e8632a)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand-accent, #e8632a)" }}>Hoofddoel</span>
          </div>
          <h2
            className="text-sm font-semibold leading-snug"
            style={{ color: isDone ? "rgba(134,239,172,0.9)" : "#f5f4f2", textDecoration: isDone ? "line-through" : "none" }}
          >
            {goal.title}
          </h2>
          {goal.description && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{goal.description}</p>
          )}
          {goal.targetDate && (
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Flag size={10} className="inline mr-1 mb-0.5" /> Streefdatum: {formatDate(goal.targetDate)}
            </p>
          )}
          {isDone && goal.completedAt && (
            <p className="text-xs mt-1" style={{ color: "rgba(134,239,172,0.75)" }}>✓ Behaald op {formatDate(goal.completedAt.slice(0, 10))}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function phaseStatusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Actief</Badge>;
  if (status === "completed") return <Badge variant="blue">Afgerond</Badge>;
  if (status === "paused") return <Badge variant="warning">Gepauzeerd</Badge>;
  return <Badge variant="muted">Nog niet gestart</Badge>;
}

function ProtocolTab({
  assignment, canAssign, canManageContent, onAssignClick, onToggleCriterion, onToggleMilestone, onAdvancePhase, onRevertPhase, sessionNotes,
  onAddExerciseClick, onEditExerciseClick, onRemoveExerciseClick, onReorderExercises,
}: {
  assignment: PortalPatientProtocolAssignment | null;
  canAssign: boolean;
  canManageContent: boolean;
  onAssignClick: () => void;
  onToggleCriterion: (criterionId: string, met: boolean) => void;
  onToggleMilestone: (milestoneId: string, completed: boolean) => void;
  onAdvancePhase: (phase: PortalPatientProtocolPhase) => void;
  onRevertPhase: (previousPhase: PortalPatientProtocolPhase) => void;
  sessionNotes: PortalPatientSessionNote[];
  onAddExerciseClick: (scheduleId: string) => void;
  onEditExerciseClick: (exercise: PortalPatientProtocolScheduleExercise) => void;
  onRemoveExerciseClick: (exercise: PortalPatientProtocolScheduleExercise) => void;
  onReorderExercises: (scheduleId: string, orderedIds: string[]) => void;
}) {
  if (!assignment) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title="Nog geen herstelplan toegewezen"
          description="Wijs een REVA- of eigen herstelplan toe om het hersteltraject van deze patiënt te structureren."
          action={canAssign ? <Button size="sm" onClick={onAssignClick}>Herstelplan toewijzen</Button> : undefined}
        />
      </Card>
    );
  }

  const scheduleTitleById = new Map(assignment.phases.flatMap((p) => p.schedules).map((s) => [s.id, s.title]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{assignment.name}</h3>
          <p className="text-xs text-gray-400">Toegewezen op {formatDate(assignment.assignedAt)}</p>
        </div>
        {canAssign && <Button size="sm" variant="secondary" onClick={onAssignClick}>Herstelplan wijzigen</Button>}
      </div>

      {sessionNotes.length > 0 && (
        <Card>
          <CardHeader title="Notities bij trainingssessies" subtitle="Door de patiënt toegevoegd bij het loggen van een sessie" />
          <div className="space-y-2.5">
            {sessionNotes.map((n) => (
              <div key={n.id} className="rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{scheduleTitleById.get(n.scheduleId) ?? "Sessie"}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{formatDate(n.date)}</span>
                </div>
                <p className="text-sm text-gray-600 pl-[18px]">{n.reflection}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(() => {
        const activeIndex = assignment.phases.findIndex((p) => p.status === "active");
        return assignment.phases.map((phase, index) => {
        const isActive = phase.status === "active";
        const allCriteriaMet = phase.criteria.length > 0 && phase.criteria.every((c) => c.met);
        const hasNextPhase = index < assignment.phases.length - 1;
        const canRevertToThis = canManageContent && phase.status === "completed" && activeIndex !== -1 && index === activeIndex - 1;

        return (
          <Card key={phase.id} padding={isActive ? "md" : "sm"}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900">{phase.name}</h4>
              <div className="flex items-center gap-2 shrink-0">
                {phaseStatusBadge(phase.status)}
                {canRevertToThis && (
                  <button
                    type="button"
                    onClick={() => onRevertPhase(phase)}
                    title="Terug naar deze fase (bijv. als de volgende fase per ongeluk is gestart)"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
            {phase.description && <p className="text-xs text-gray-500 mb-3">{phase.description}</p>}

            {isActive && (
              <div className="space-y-4 mt-3">
                {phase.forbiddenActivities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {phase.forbiddenActivities.map((a, i) => <Badge key={i} variant="danger">Verboden: {a}</Badge>)}
                  </div>
                )}

                {phase.therapistNotes && (
                  <p className="text-sm text-gray-600 rounded-xl p-3" style={{ background: "#f8f7f4" }}>{phase.therapistNotes}</p>
                )}

                {phase.criteria.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Criteria voor volgende fase</h5>
                    <div className="space-y-1.5">
                      {phase.criteria.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={c.met} disabled={!canManageContent} onChange={(e) => onToggleCriterion(c.id, e.target.checked)} className="rounded" />
                          <span className={c.met ? "line-through text-gray-400" : ""}>{c.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {phase.milestones.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mijlpalen</h5>
                    <div className="space-y-1.5">
                      {phase.milestones.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={m.completed} disabled={!canManageContent} onChange={(e) => onToggleMilestone(m.id, e.target.checked)} className="rounded" />
                          <span className={m.completed ? "line-through text-gray-400" : ""}>{m.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {phase.educationItems.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Educatie</h5>
                    <div className="space-y-2">
                      {phase.educationItems.map((e) => (
                        <div key={e.id} className="rounded-lg p-3 text-sm" style={{ background: "#f8f7f4" }}>
                          <p className="font-medium text-gray-800">{e.title}</p>
                          {e.body && <p className="text-xs text-gray-500 mt-1">{e.body}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {phase.schedules.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trainingsschema&apos;s</h5>
                    <div className="space-y-2">
                      {phase.schedules.map((s) => (
                        <div key={s.id} className="rounded-xl border p-3" style={{ borderColor: "#e8e5df" }}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800">{s.title} <span className="text-xs text-gray-400 font-normal">— {s.frequencyPerWeek}× per week</span></p>
                            <Badge variant={s.completedThisWeek >= s.frequencyPerWeek ? "success" : "muted"}>
                              {s.completedThisWeek}/{s.frequencyPerWeek} deze week
                            </Badge>
                          </div>
                          <div className="space-y-1.5 mt-2">
                            <SortableExerciseList
                              items={s.exercises}
                              getId={(ex) => ex.id}
                              onReorder={(orderedIds) => onReorderExercises(s.id, orderedIds)}
                              disabled={!canManageContent}
                              renderItem={(ex, index, dragHandle) => (
                                <div
                                  className="flex items-start gap-2.5 rounded-xl border px-2.5 py-2"
                                  style={{ borderColor: "#e8e5df", background: "#ffffff" }}
                                >
                                  {dragHandle}
                                  <div className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0 mt-0.5" style={{ background: "#f3f0eb", color: "#8a847d" }}>
                                    {index + 1}
                                  </div>
                                  <ExerciseThumb mediaPath={ex.mediaPath} size={28} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 truncate">{ex.title}</p>
                                    {(ex.prescribedSets || ex.prescribedReps || ex.prescribedDurationSeconds || ex.prescribedLoadText) && (
                                      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                                        {(ex.prescribedSets || ex.prescribedReps) && <span>{ex.prescribedSets ?? "?"}×{ex.prescribedReps ?? "?"}</span>}
                                        {ex.prescribedDurationSeconds != null && <span>{ex.prescribedDurationSeconds} sec</span>}
                                        {ex.prescribedLoadText && <span>{ex.prescribedLoadText}</span>}
                                      </div>
                                    )}
                                    {ex.prescriptionNote && (
                                      <p className="text-[11px] text-gray-400 italic mt-0.5 truncate">{ex.prescriptionNote}</p>
                                    )}
                                  </div>
                                  {canManageContent && (
                                    <span className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => onEditExerciseClick(ex)}
                                        title="Oefening bewerken"
                                        className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onRemoveExerciseClick(ex)}
                                        title="Oefening verwijderen"
                                        className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-gray-50 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </span>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                          {canManageContent && (
                            <button
                              type="button"
                              onClick={() => onAddExerciseClick(s.id)}
                              className="text-xs font-medium mt-2.5"
                              style={{ color: "var(--brand-accent, #e8632a)" }}
                            >
                              + Oefening toevoegen
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canManageContent && hasNextPhase && (
                  <Button size="sm" disabled={!allCriteriaMet} onClick={() => onAdvancePhase(phase)}>
                    <Check size={13} /> Markeer fase voltooid en start volgende
                  </Button>
                )}
                {canManageContent && hasNextPhase && !allCriteriaMet && phase.criteria.length > 0 && (
                  <p className="text-xs text-gray-400">Alle criteria moeten afgevinkt zijn voordat de volgende fase kan starten.</p>
                )}
              </div>
            )}
          </Card>
        );
        });
      })()}
    </div>
  );
}

function noteTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} om ${date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
}

function LogboekTab({
  notes, currentUserId, saving, onAdd, editingNoteId, editDraft, onEditDraftChange, editSaving,
  onStartEdit, onCancelEdit, onSaveEdit, onDeleteClick,
}: {
  notes: PortalPatientStaffNote[];
  currentUserId: string | null;
  saving: boolean;
  onAdd: (note: string) => void;
  editingNoteId: string | null;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  editSaving: boolean;
  onStartEdit: (note: PortalPatientStaffNote) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteClick: (note: PortalPatientStaffNote) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Nieuwe notitie" subtitle="Alleen zichtbaar voor collega's binnen deze praktijk" />
        <div className="space-y-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Bijv. bijzonderheden over de behandeling, afspraken met de patiënt, aandachtspunten voor collega's..."
            rows={3}
            className="w-full text-sm rounded-xl border px-3 py-2.5 resize-none focus:outline-none"
            style={{ borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" }}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={saving || !draft.trim()}
              onClick={() => { onAdd(draft.trim()); setDraft(""); }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : "Notitie toevoegen"}
            </Button>
          </div>
        </div>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="Nog geen notities"
            description="Fysiotherapeuten binnen deze praktijk kunnen hier onderling notities bijhouden over deze patiënt."
          />
        </Card>
      ) : (
        <Card>
          <div className="space-y-2.5">
            {notes.map((n) => {
              const isOwn = !!currentUserId && n.authorId === currentUserId;
              const isEditing = editingNoteId === n.id;
              return (
                <div key={n.id} className="rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Avatar fullName={n.authorName} avatarUrl={n.authorAvatarUrl} size={20} />
                    <span className="text-xs font-medium text-gray-700">{n.authorName ?? "Onbekend teamlid"}</span>
                    <span className="text-xs text-gray-400">{noteTimestamp(n.createdAt)}</span>
                    {n.updatedAt !== n.createdAt && <span className="text-xs text-gray-400 italic">(bewerkt)</span>}
                    {isOwn && !isEditing && (
                      <div className="ml-auto flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onStartEdit(n)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          aria-label="Notitie bewerken"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteClick(n)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          aria-label="Notitie verwijderen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2 pl-[2px]">
                      <textarea
                        value={editDraft}
                        onChange={(e) => onEditDraftChange(e.target.value)}
                        rows={3}
                        className="w-full text-sm rounded-lg border px-2.5 py-2 resize-none focus:outline-none"
                        style={{ borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={onCancelEdit}>Annuleren</Button>
                        <Button size="sm" disabled={editSaving || !editDraft.trim()} onClick={onSaveEdit}>
                          {editSaving ? <Loader2 size={13} className="animate-spin" /> : "Opslaan"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.note}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

type TabKey = "overzicht" | "herstelplan" | "logboek";
const TAB_OPTIONS: { value: TabKey; label: string }[] = [
  { value: "overzicht", label: "Overzicht" },
  { value: "herstelplan", label: "Herstelplan" },
  { value: "logboek", label: "Logboek" },
];

export default function PortalPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { user } = useAuth();
  const { checked, membership } = usePortalMembership();
  const [patient, setPatient] = useState<PortalPatient | null>(null);
  const [extras, setExtras] = useState<PortalPatientExtras | null>(null);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [trendRange, setTrendRange] = useState(14);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabKey>("overzicht");

  const [assignment, setAssignment] = useState<PortalPatientProtocolAssignment | null>(null);
  const [sessionNotes, setSessionNotes] = useState<PortalPatientSessionNote[]>([]);
  const [staffNotes, setStaffNotes] = useState<PortalPatientStaffNote[]>([]);
  const [revaProtocols, setRevaProtocols] = useState<PortalProtocolCard[]>([]);
  const [orgProtocols, setOrgProtocols] = useState<PortalProtocolCard[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [confirmAdvance, setConfirmAdvance] = useState<PortalPatientProtocolPhase | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<PortalPatientProtocolPhase | null>(null);
  const [phaseChanging, setPhaseChanging] = useState(false);
  const [exercises, setExercises] = useState<PortalExerciseLibraryItem[]>([]);
  const [addExerciseModal, setAddExerciseModal] = useState<{ scheduleId: string } | null>(null);
  const [editingScheduleExercise, setEditingScheduleExercise] = useState<PortalPatientProtocolScheduleExercise | null>(null);
  const [scheduleExerciseSaving, setScheduleExerciseSaving] = useState(false);
  const [scheduleExerciseError, setScheduleExerciseError] = useState("");
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<PortalPatientProtocolScheduleExercise | null>(null);
  const [removingExercise, setRemovingExercise] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [editNoteSaving, setEditNoteSaving] = useState(false);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<PortalPatientStaffNote | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);
  const { showToast, toastNode } = useToast();

  const canManagePatients = !!membership && MANAGE_PATIENTS_ROLES.includes(membership.roleKey);
  const canAssignProtocol = canManagePatients; // toewijzen mag de bredere groep, zie D6
  const canManageProtocolContent = !!membership && MANAGE_PROTOCOLS_ROLES.includes(membership.roleKey);

  function refreshProtocol() {
    loadPatientProtocolAssignment(patientId).then(setAssignment);
  }

  function refreshStaffNotes() {
    loadPatientStaffNotes(patientId).then(setStaffNotes);
  }

  async function handleAddStaffNote(note: string) {
    if (!membership || !user || !note) return;
    setAddingNote(true);
    const { error } = await addPatientStaffNote(patientId, membership.organizationId, user.id, note);
    setAddingNote(false);
    if (error) {
      showToast(error);
      return;
    }
    refreshStaffNotes();
    showToast("Notitie toegevoegd");
  }

  function handleStartEditNote(note: PortalPatientStaffNote) {
    setEditingNoteId(note.id);
    setEditNoteDraft(note.note);
  }

  async function handleSaveEditNote() {
    if (!editingNoteId || !editNoteDraft.trim()) return;
    setEditNoteSaving(true);
    const { error } = await updatePatientStaffNote(editingNoteId, editNoteDraft.trim());
    setEditNoteSaving(false);
    if (error) {
      showToast(error);
      return;
    }
    setEditingNoteId(null);
    setEditNoteDraft("");
    refreshStaffNotes();
    showToast("Notitie bijgewerkt");
  }

  async function handleConfirmDeleteNote() {
    if (!confirmDeleteNote) return;
    setDeletingNote(true);
    const { error } = await deletePatientStaffNote(confirmDeleteNote.id);
    setDeletingNote(false);
    setConfirmDeleteNote(null);
    if (error) {
      showToast(error);
      return;
    }
    refreshStaffNotes();
    showToast("Notitie verwijderd");
  }

  function refresh(organizationId: string) {
    Promise.all([
      loadPortalPatients(organizationId),
      loadPortalPatientExtras(patientId),
    ]).then(([patients, extrasData]) => {
      const found = patients.find((p) => p.id === patientId) ?? null;
      setPatient(found);
      setNotFound(!found);
      setExtras(extrasData);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    const organizationId = membership.organizationId;
    Promise.all([
      loadPortalPatients(organizationId),
      loadPortalPatientExtras(patientId),
      loadPortalLocations(organizationId),
      loadPortalMembers(organizationId),
      loadPatientProtocolAssignment(patientId),
      loadRevaProtocols(),
      loadOrgProtocols(organizationId),
      loadPatientSessionNotes(patientId),
      loadExerciseLibrary(organizationId),
      loadPatientStaffNotes(patientId),
    ]).then(([patients, extrasData, locationsData, membersData, assignmentData, revaData, orgData, sessionNotesData, exerciseData, staffNotesData]) => {
      if (cancelled) return;
      const found = patients.find((p) => p.id === patientId) ?? null;
      setPatient(found);
      setNotFound(!found);
      setExtras(extrasData);
      setLocations(locationsData);
      setMembers(membersData);
      setAssignment(assignmentData);
      setRevaProtocols(revaData);
      setOrgProtocols(orgData);
      setSessionNotes(sessionNotesData);
      setExercises(exerciseData);
      setStaffNotes(staffNotesData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership, patientId]);

  async function handleAssign(protocolId: string) {
    setAssigning(true);
    setAssignError("");
    const { error } = await assignProtocolToPatient(patientId, protocolId);
    setAssigning(false);
    if (error) { setAssignError(error); return; }
    setShowAssignModal(false);
    refreshProtocol();
    showToast("Herstelplan toegewezen");
  }

  async function handleToggleCriterion(criterionId: string, met: boolean) {
    const { error } = await toggleCriterionMet(criterionId, met);
    if (error) { showToast(error, "error"); return; }
    refreshProtocol();
  }

  async function handleToggleMilestone(milestoneId: string, completed: boolean) {
    const { error } = await updateMilestoneCompletion(milestoneId, completed);
    if (error) { showToast(error, "error"); return; }
    refreshProtocol();
  }

  /** Bibliotheekoefeningen die al in dit schema staan, om dubbel toevoegen te voorkomen. */
  function currentScheduleExerciseIds(scheduleId: string): string[] {
    if (!assignment) return [];
    const schedule = assignment.phases.flatMap((p) => p.schedules).find((s) => s.id === scheduleId);
    return (schedule?.exercises ?? []).map((e) => e.sourceExerciseId).filter((id): id is string => !!id);
  }

  async function handleAddPatientScheduleExercises(exerciseIds: string[]) {
    if (!addExerciseModal || !assignment) return { addedCount: 0, errors: ["Geen schema geselecteerd."] };
    const schedule = assignment.phases.flatMap((p) => p.schedules).find((s) => s.id === addExerciseModal.scheduleId);
    const result = await addExercisesToPatientSchedule(addExerciseModal.scheduleId, exerciseIds, schedule?.exercises.length ?? 0);
    refreshProtocol();
    if (result.addedCount > 0) showToast(`${result.addedCount} oefening${result.addedCount === 1 ? "" : "en"} toegevoegd`);
    return result;
  }

  async function handleSaveScheduleExercise(input: PortalPatientScheduleExerciseInput) {
    if (!editingScheduleExercise) return;
    setScheduleExerciseSaving(true);
    setScheduleExerciseError("");
    const { error } = await updatePatientScheduleExercise(editingScheduleExercise.id, input);
    setScheduleExerciseSaving(false);
    if (error) { setScheduleExerciseError(error); return; }
    setEditingScheduleExercise(null);
    showToast("Oefening bijgewerkt");
    refreshProtocol();
  }

  async function handleReorderScheduleExercises(scheduleId: string, orderedIds: string[]) {
    if (!assignment) return;
    setAssignment({
      ...assignment,
      phases: assignment.phases.map((phase) => ({
        ...phase,
        schedules: phase.schedules.map((s) => {
          if (s.id !== scheduleId) return s;
          const exerciseById = new Map(s.exercises.map((ex) => [ex.id, ex]));
          const reordered = orderedIds.map((id) => exerciseById.get(id)).filter((ex): ex is PortalPatientProtocolScheduleExercise => !!ex);
          return { ...s, exercises: reordered };
        }),
      })),
    });
    const { error } = await reorderPatientScheduleExercises(orderedIds);
    if (error) { showToast(error, "error"); refreshProtocol(); }
  }

  async function handleRemoveScheduleExercise() {
    if (!confirmRemoveExercise) return;
    setRemovingExercise(true);
    const { error } = await removeExerciseFromPatientSchedule(confirmRemoveExercise.id);
    setRemovingExercise(false);
    setConfirmRemoveExercise(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Oefening verwijderd uit schema");
    refreshProtocol();
  }

  async function confirmAdvancePhase() {
    if (!assignment || !confirmAdvance) return;
    const sorted = assignment.phases;
    const index = sorted.findIndex((p) => p.id === confirmAdvance.id);
    const next = sorted[index + 1];
    if (!next) { setConfirmAdvance(null); return; }
    setPhaseChanging(true);
    const { error } = await advanceToNextPhase(confirmAdvance.id, next.id);
    setPhaseChanging(false);
    setConfirmAdvance(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Volgende fase gestart");
    refreshProtocol();
  }

  async function confirmRevertPhase() {
    if (!assignment || !confirmRevert) return;
    const active = assignment.phases.find((p) => p.status === "active");
    if (!active) { setConfirmRevert(null); return; }
    setPhaseChanging(true);
    const { error } = await revertToPreviousPhase(active.id, confirmRevert.id);
    setPhaseChanging(false);
    setConfirmRevert(null);
    if (error) { showToast(error, "error"); return; }
    showToast("Fase teruggezet");
    refreshProtocol();
  }

  useEffect(() => {
    const path = extras?.latestPhoto?.imagePath;
    let cancelled = false;
    (path ? resolveSignedUrl("dossier-photos", path) : Promise.resolve(null)).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [extras?.latestPhoto?.imagePath]);

  const lastCheckin = extras?.checkinTrend[extras.checkinTrend.length - 1] ?? null;
  const showMilestone = extras?.recentMilestone && daysSince(extras.recentMilestone.completedAt) <= 30;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push("/portal/patienten")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Terug naar patiënten
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : notFound || !patient ? (
        <p className="text-sm text-gray-400">Dit patiëntdossier is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <SectionHeader title={patient.fullName || "Naam nog niet ingevuld"} subtitle={patient.email ?? undefined} />
            {statusBadge(patient.status)}
            {showMilestone && (
              <Badge variant="accent" className="flex items-center gap-1">
                <Award size={12} /> Mijlpaal: {extras!.recentMilestone!.title}
              </Badge>
            )}
          </div>

          <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

          {tab === "overzicht" && (
          <>
          {extras?.mainGoal && <MainGoalCard goal={extras.mainGoal} />}

          {/* Check-in status — hoe voelt de patiënt zich */}
          <Card>
            <CardHeader
              title="Check-in status"
              subtitle={lastCheckin ? `Laatste check-in op ${formatDate(lastCheckin.date)}` : undefined}
              action={
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {lastCheckin?.swelling && <Badge variant="warning" className="flex items-center gap-1"><Droplets size={12} /> Zwelling gemeld</Badge>}
                  {lastCheckin && <TrendRangeFilter value={trendRange} onChange={setTrendRange} />}
                </div>
              }
            />
            {!lastCheckin ? (
              <p className="text-sm text-gray-400">Nog geen check-ins ingevuld.</p>
            ) : (
              <div className="space-y-5">
                <CheckinTrendChart points={extras!.checkinTrend.slice(-trendRange)} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  <ScoreBar label="Dagscore" value={lastCheckin.dayScore} max={5} />
                  {lastCheckin.painScore !== null && <ScoreBar label="Pijn" value={lastCheckin.painScore} max={10} />}
                  {lastCheckin.mobilityScore !== null && <ScoreBar label="Mobiliteit" value={lastCheckin.mobilityScore} max={5} />}
                  {lastCheckin.energyScore !== null && <ScoreBar label="Energie" value={lastCheckin.energyScore} max={5} />}
                  {lastCheckin.moodScore !== null && <ScoreBar label="Stemming" value={lastCheckin.moodScore} max={5} />}
                  {lastCheckin.sleepScore !== null && <ScoreBar label="Slaap" value={lastCheckin.sleepScore} max={5} />}
                </div>
                {lastCheckin.note && <p className="text-sm text-gray-600 italic">&ldquo;{lastCheckin.note}&rdquo;</p>}
              </div>
            )}
          </Card>

          {/* Vier kaarten: foto, medicatie, afspraak, training */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader title="Laatste foto-update" />
              {!extras?.latestPhoto ? (
                <p className="text-sm text-gray-400">Nog geen foto-update.</p>
              ) : (
                <div className="space-y-2">
                  {photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setShowPhotoLightbox(true)}
                      className="block w-full h-32 rounded-xl overflow-hidden cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt="Laatste voortgangsfoto" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="w-full h-32 rounded-xl flex items-center justify-center" style={{ background: "#f3f0eb" }}>
                      <Camera size={20} style={{ color: "#c4bfb9" }} />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">{formatDate(extras.latestPhoto.date)}</p>
                  {extras.latestPhoto.note && (
                    <p className="text-xs text-gray-500 italic line-clamp-2">&ldquo;{extras.latestPhoto.note}&rdquo;</p>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Laatste medicatie" />
              {!extras?.latestMedication ? (
                <p className="text-sm text-gray-400">Nog geen medicatie gelogd.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><Pill size={14} style={{ color: "var(--brand-accent, #e8632a)" }} /> {extras.latestMedication.medicationName}</p>
                  {extras.latestMedication.dosage && <p className="text-xs text-gray-500">{extras.latestMedication.dosage}{extras.latestMedication.quantity ? ` · ${extras.latestMedication.quantity}` : ""}</p>}
                  <p className="text-xs text-gray-400">{formatDate(extras.latestMedication.date)}{extras.latestMedication.time ? ` om ${extras.latestMedication.time}` : ""}</p>
                  {extras.latestMedication.reason && <p className="text-xs text-gray-500">Reden: {extras.latestMedication.reason}</p>}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Eerstvolgende afspraak" />
              {!extras?.upcomingAppointment ? (
                <p className="text-sm text-gray-400">Geen geplande afspraak.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><CalendarClock size={14} style={{ color: "var(--brand-accent, #e8632a)" }} /> {extras.upcomingAppointment.title}</p>
                  {appointmentTypeLabel(extras.upcomingAppointment.appointmentType) && (
                    <p className="text-xs text-gray-500">{appointmentTypeLabel(extras.upcomingAppointment.appointmentType)}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(extras.upcomingAppointment.date)}{extras.upcomingAppointment.time ? ` om ${extras.upcomingAppointment.time}` : ""}</p>
                  {extras.upcomingAppointment.location && <p className="text-xs text-gray-500">{extras.upcomingAppointment.location}</p>}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Training deze week" />
              {!extras || extras.trainingWeek.total === 0 ? (
                <p className="text-sm text-gray-400">Nog geen trainingen gelogd.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Dumbbell size={14} style={{ color: "var(--brand-accent, #e8632a)" }} />
                    {extras.trainingWeek.completed} van {extras.trainingWeek.total} voltooid
                  </div>
                  <ScoreBar label="Voortgang" value={extras.trainingWeek.completed} max={extras.trainingWeek.total} />
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Behandelgegevens"
              subtitle="Basisgegevens en behandeltraject"
              action={canManagePatients ? (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil size={13} /> Wijzigen
                </Button>
              ) : undefined}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-gray-500">Telefoonnummer:</span> <span className="text-gray-800">{patient.phone || "—"}</span></div>
              <div><span className="text-gray-500">Geboortedatum:</span> <span className="text-gray-800">{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</span></div>
              <div><span className="text-gray-500">Geslacht:</span> <span className="text-gray-800">{genderLabel(patient.gender)}</span></div>
              <div><span className="text-gray-500">Locatie:</span> <span className="text-gray-800">{patient.locationName || "—"}</span></div>
              <div><span className="text-gray-500">Behandelend therapeut:</span> <span className="text-gray-800">{patient.therapistName || "—"}</span></div>
              <div><span className="text-gray-500">Herstelplan:</span> <span className="text-gray-800">{patient.protocolName || "—"}</span></div>
              <div><span className="text-gray-500">Startdatum behandeling:</span> <span className="text-gray-800">{patient.treatmentStartDate ? formatDate(patient.treatmentStartDate) : "—"}</span></div>
              <div><span className="text-gray-500">Operatiedatum:</span> <span className="text-gray-800">{patient.surgeryDate ? formatDate(patient.surgeryDate) : "—"}</span></div>
            </div>
          </Card>
          </>
          )}

          {tab === "herstelplan" && (
            <ProtocolTab
              assignment={assignment}
              canAssign={canAssignProtocol}
              canManageContent={canManageProtocolContent}
              onAssignClick={() => { setAssignError(""); setShowAssignModal(true); }}
              onToggleCriterion={handleToggleCriterion}
              onToggleMilestone={handleToggleMilestone}
              onAdvancePhase={setConfirmAdvance}
              onRevertPhase={setConfirmRevert}
              sessionNotes={sessionNotes}
              onAddExerciseClick={(scheduleId) => setAddExerciseModal({ scheduleId })}
              onEditExerciseClick={(ex) => { setScheduleExerciseError(""); setEditingScheduleExercise(ex); }}
              onRemoveExerciseClick={setConfirmRemoveExercise}
              onReorderExercises={handleReorderScheduleExercises}
            />
          )}

          {tab === "logboek" && (
            <LogboekTab
              notes={staffNotes}
              currentUserId={user?.id ?? null}
              saving={addingNote}
              onAdd={handleAddStaffNote}
              editingNoteId={editingNoteId}
              editDraft={editNoteDraft}
              onEditDraftChange={setEditNoteDraft}
              editSaving={editNoteSaving}
              onStartEdit={handleStartEditNote}
              onCancelEdit={() => { setEditingNoteId(null); setEditNoteDraft(""); }}
              onSaveEdit={handleSaveEditNote}
              onDeleteClick={setConfirmDeleteNote}
            />
          )}

          {confirmDeleteNote && (
            <ConfirmDialog
              title="Notitie verwijderen?"
              message="Deze notitie wordt permanent verwijderd uit het logboek."
              confirmLabel="Notitie verwijderen"
              loading={deletingNote}
              onCancel={() => setConfirmDeleteNote(null)}
              onConfirm={handleConfirmDeleteNote}
            />
          )}

          {confirmAdvance && (
            <ConfirmDialog
              title="Volgende fase starten?"
              message={`De fase "${confirmAdvance.name}" wordt gemarkeerd als voltooid en de volgende fase gaat direct van start.`}
              confirmLabel="Volgende fase starten"
              danger={false}
              loading={phaseChanging}
              onCancel={() => setConfirmAdvance(null)}
              onConfirm={confirmAdvancePhase}
            />
          )}

          {confirmRevert && (
            <ConfirmDialog
              title="Terug naar vorige fase?"
              message={`De huidige fase wordt teruggezet en "${confirmRevert.name}" wordt weer actief. Gebruik dit alleen als de volgende fase per ongeluk is gestart.`}
              confirmLabel="Fase terugzetten"
              loading={phaseChanging}
              onCancel={() => setConfirmRevert(null)}
              onConfirm={confirmRevertPhase}
            />
          )}

          {showAssignModal && (
            <Modal onClose={() => setShowAssignModal(false)} maxWidth="max-w-md" dismissOnBackdropClick={false}>
              <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {assignment ? "Ander herstelplan toewijzen" : "Herstelplan toewijzen"}
                </h3>
                {assignment && (
                  <p className="text-xs text-gray-500 mb-4">
                    Het huidige herstelplan (&quot;{assignment.name}&quot;) wordt vervangen — de voortgang blijft bewaard in de geschiedenis.
                  </p>
                )}
                <div className="space-y-4 mt-4">
                  {orgProtocols.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Eigen herstelplannen</p>
                      <div className="space-y-1.5">
                        {orgProtocols.filter((p) => !p.archived).map((p) => (
                          <button
                            key={p.id} type="button" disabled={assigning} onClick={() => handleAssign(p.id)}
                            className="w-full flex items-center justify-between text-left text-sm rounded-xl border px-3 py-2.5 hover:bg-gray-50 disabled:opacity-60"
                            style={{ borderColor: "#e8e5df" }}
                          >
                            <span>{p.name}</span>
                            <ChevronRight size={14} className="text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {revaProtocols.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">REVA-herstelplannen</p>
                      <div className="space-y-1.5">
                        {revaProtocols.map((p) => (
                          <button
                            key={p.id} type="button" disabled={assigning} onClick={() => handleAssign(p.id)}
                            className="w-full flex items-center justify-between text-left text-sm rounded-xl border px-3 py-2.5 hover:bg-gray-50 disabled:opacity-60"
                            style={{ borderColor: "#e8e5df" }}
                          >
                            <span className="flex items-center gap-2">
                              {p.name}
                              {!p.clinicallyReviewed && <Badge variant="warning">Nog niet gereviewd</Badge>}
                            </span>
                            <ChevronRight size={14} className="text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {orgProtocols.length === 0 && revaProtocols.length === 0 && (
                    <p className="text-sm text-gray-400">Nog geen herstelplannen beschikbaar. Maak er eerst een aan via Herstelplannen.</p>
                  )}
                </div>
                {assignError && <p className="text-xs mt-3" style={{ color: "#dc2626" }}>{assignError}</p>}
                <div className="flex justify-end mt-4">
                  <Button size="sm" variant="secondary" onClick={() => setShowAssignModal(false)}>Annuleren</Button>
                </div>
              </div>
            </Modal>
          )}

          {editing && membership && (
            <Modal onClose={() => setEditing(false)} maxWidth="max-w-2xl" dismissOnBackdropClick={false}>
              <PatientEditForm
                patient={patient}
                locations={locations}
                members={members}
                onSaved={() => { setEditing(false); refresh(membership.organizationId); showToast("Patiënt opgeslagen"); }}
                onClose={() => setEditing(false)}
              />
            </Modal>
          )}

          {addExerciseModal && membership && (
            <ExerciseMultiSelectModal
              exercises={exercises}
              excludeExerciseIds={currentScheduleExerciseIds(addExerciseModal.scheduleId)}
              organizationId={membership.organizationId}
              onClose={() => setAddExerciseModal(null)}
              onAdd={handleAddPatientScheduleExercises}
              onExerciseCreated={(ex) => setExercises((prev) => [...prev, ex].sort((a, b) => a.title.localeCompare(b.title)))}
            />
          )}

          {editingScheduleExercise && (
            <PatientScheduleExerciseEditModal
              exercise={editingScheduleExercise}
              saving={scheduleExerciseSaving}
              error={scheduleExerciseError}
              onClose={() => setEditingScheduleExercise(null)}
              onSave={handleSaveScheduleExercise}
            />
          )}

          {confirmRemoveExercise && (
            <ConfirmDialog
              title="Oefening verwijderen?"
              message={`"${confirmRemoveExercise.title}" wordt uit dit schema van deze patiënt verwijderd.`}
              confirmLabel="Verwijderen"
              loading={removingExercise}
              onCancel={() => setConfirmRemoveExercise(null)}
              onConfirm={handleRemoveScheduleExercise}
            />
          )}

          {showPhotoLightbox && photoUrl && extras?.latestPhoto && (
            <Modal onClose={() => setShowPhotoLightbox(false)} maxWidth="max-w-2xl">
              <div className="relative rounded-2xl overflow-hidden" style={{ background: "#ffffff" }}>
                <button
                  type="button"
                  onClick={() => setShowPhotoLightbox(false)}
                  aria-label="Sluiten"
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/60"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  <X size={18} color="#ffffff" />
                </button>
                <div className="flex items-center justify-center" style={{ background: "#18181a" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="Voortgangsfoto" className="max-w-full max-h-[70vh] object-contain" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-800">{formatDate(extras.latestPhoto.date)}</p>
                  {extras.latestPhoto.note ? (
                    <p className="text-sm text-gray-600 mt-1.5">&ldquo;{extras.latestPhoto.note}&rdquo;</p>
                  ) : (
                    <p className="text-sm italic text-gray-400 mt-1.5">Geen opmerking</p>
                  )}
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
      {toastNode}
    </div>
  );
}

const scheduleExerciseInputStyle = { borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" };

function ScheduleExerciseFieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}

/**
 * Bewerkt alleen de prescriptievelden (sets/reps/duur/belasting/opmerking)
 * van één oefening in het schema van deze ene patiënt — mirror van
 * ScheduleExerciseEditModal in schemas/[id]/page.tsx, maar gericht op
 * patient_protocol_schedule_exercises i.p.v. schedule_library_exercises.
 */
function PatientScheduleExerciseEditModal({
  exercise, saving, error, onClose, onSave,
}: {
  exercise: PortalPatientProtocolScheduleExercise;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (input: PortalPatientScheduleExerciseInput) => void;
}) {
  const [sets, setSets] = useState(exercise.prescribedSets?.toString() ?? "");
  const [reps, setReps] = useState(exercise.prescribedReps?.toString() ?? "");
  const [duration, setDuration] = useState(exercise.prescribedDurationSeconds?.toString() ?? "");
  const [loadText, setLoadText] = useState(exercise.prescribedLoadText ?? "");
  const [note, setNote] = useState(exercise.prescriptionNote ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
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
        <h3 className="font-semibold text-gray-900 mb-4">{exercise.title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <ScheduleExerciseFieldLabel>Sets</ScheduleExerciseFieldLabel>
              <input type="number" min={0} value={sets} onChange={(e) => setSets(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={scheduleExerciseInputStyle} />
            </div>
            <div>
              <ScheduleExerciseFieldLabel>Herhalingen</ScheduleExerciseFieldLabel>
              <input type="number" min={0} value={reps} onChange={(e) => setReps(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={scheduleExerciseInputStyle} />
            </div>
            <div>
              <ScheduleExerciseFieldLabel>Duur (sec)</ScheduleExerciseFieldLabel>
              <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={scheduleExerciseInputStyle} />
            </div>
          </div>
          <div>
            <ScheduleExerciseFieldLabel>Belasting (bijv. &quot;20 kg&quot; of &quot;lichaamsgewicht&quot;)</ScheduleExerciseFieldLabel>
            <input type="text" value={loadText} onChange={(e) => setLoadText(e.target.value)} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none" style={scheduleExerciseInputStyle} />
          </div>
          <div>
            <ScheduleExerciseFieldLabel>Opmerking voor deze patiënt (optioneel)</ScheduleExerciseFieldLabel>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={scheduleExerciseInputStyle} />
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
