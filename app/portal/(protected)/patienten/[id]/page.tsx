"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, ShieldOff, Archive, ArchiveRestore, Camera, Pill, CalendarClock, Dumbbell, Award, Droplets, Pencil, Star, Flag, ClipboardList, Check, ChevronRight, ChevronLeft, RotateCcw, MessageSquare, Trash2, Loader2, X, History, Images } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea, Input, Select } from "@/components/ui/Field";
import { CompleteIntakeModal } from "@/components/portal/CompleteIntakeModal";
import { PatientScheduleBoard } from "@/components/portal/PatientScheduleBoard";
import {
  ONSET_MECHANISM_LABELS, SYMPTOM_COURSE_LABELS, REFERRAL_SOURCE_LABELS, SLEEP_IMPACT_LABELS, WORK_LOAD_LABELS,
  SPORT_FREQUENCY_LABELS, SPORT_LEVEL_LABELS, IMAGING_LABELS, RED_FLAG_LABELS,
} from "@/lib/intakeAnalysis";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhaseTransitionModal } from "@/components/portal/PhaseTransitionModal";
import { useToast } from "@/components/ui/Toast";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Tabs } from "@/components/ui/Tabs";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { InsightCard } from "@/components/insights/InsightCard";
import { buildPatientInsights } from "@/lib/insights/patientInsights";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientEditForm } from "@/components/portal/PatientEditForm";
import { DatePicker } from "@/components/ui/DatePicker";
import { ExerciseMultiSelectModal } from "@/components/portal/ExerciseMultiSelectModal";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDate, formatDateShort, BLESSURE_TYPEN } from "@/lib/data";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import {
  loadPortalPatients,
  loadPortalPatientExtras,
  loadPortalLocations,
  loadPortalMembers,
  loadPatientPhotoHistory,
  loadPatientCheckinHistory,
  invitePortalPatient,
  updatePortalPatientStatus,
  updatePatientDischarge,
  deletePortalPatient,
  MANAGE_PATIENTS_ROLES,
  DISCHARGE_OUTCOME_LABELS,
  type PortalPatient,
  type PortalPatientExtras,
  type PortalCheckinTrendPoint,
  type PortalMainGoal,
  type PortalLocationOption,
  type PortalMember,
  type PortalPhotoHistoryItem,
  type DischargeOutcome,
  resetPatientMfa,
} from "@/lib/services/portalService";
import { resolveSignedUrl, resolveSignedUrls } from "@/lib/services/storageService";
import { loadPatientIntake, markIntakeCompleted, type PortalPatientIntake } from "@/lib/services/intakeService";
import {
  loadRevaProtocols, loadOrgProtocols, assignProtocolToPatient,
  loadPatientProtocolAssignment, toggleCriterionMet, updateMilestoneCompletion, advanceToNextPhase, revertToPreviousPhase,
  loadPatientSessionNotes, loadExerciseLibrary, addPatientProtocolPhase,
  addExercisesToPatientSchedule, updatePatientScheduleExercise, removeExerciseFromPatientSchedule, reorderPatientScheduleExercises,
  loadPatientStaffNotes, addPatientStaffNote, updatePatientStaffNote, deletePatientStaffNote,
  MANAGE_PROTOCOLS_ROLES,
  type PortalProtocolCard, type PortalPatientProtocolAssignment, type PortalPatientProtocolPhase, type PortalPatientSessionNote,
  type PortalExerciseLibraryItem, type PortalPatientProtocolScheduleExercise, type PortalPatientScheduleExerciseInput,
  type PortalPatientStaffNote, type PhaseTransitionCheckin, type TransitionProgressVsExpected,
} from "@/lib/services/protocolService";

const PROGRESS_VS_EXPECTED_LABELS: Record<TransitionProgressVsExpected, string> = {
  better: "Beter dan verwacht",
  as_expected: "Zoals verwacht",
  harder: "Lastiger dan verwacht",
};

function hasTransitionCheckin(phase: PortalPatientProtocolPhase): boolean {
  return phase.transitionPainScore !== null || phase.transitionMobilityScore !== null
    || phase.transitionSwelling !== null || phase.transitionSatisfactionScore !== null
    || !!phase.transitionProgressVsExpected || !!phase.transitionNote;
}

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

function injuryTypeLabel(injuryType: string | null) {
  if (!injuryType) return "—";
  return BLESSURE_TYPEN.find((b) => b.value === injuryType)?.label ?? injuryType;
}

function accountBadge(p: PortalPatient) {
  if (p.hasAccount) return <Badge variant="success">Actief</Badge>;
  if (p.invitedAt) return <Badge variant="warning">Uitgenodigd op {formatDate(p.invitedAt)}</Badge>;
  return <Badge variant="muted">Nog geen account</Badge>;
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
    <div role="group" aria-label="Periode" className="flex items-center gap-1 rounded-lg p-0.5 ml-auto" style={{ background: "#f3f0eb" }}>
      {TREND_RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
          className="text-sm sm:text-xs font-medium px-3 sm:px-2.5 min-h-10 sm:min-h-0 sm:py-1 rounded-md transition-colors"
          style={
            value === r.value
              ? { background: "#ffffff", color: "#1a1a1a", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
              : { color: "#6b7280" }
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
  const chartH = H - labelZoneH; // de datums staan als HTML onder de grafiek
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
  // Een tussenlabel vlak vóór het laatste punt valt erover; dan overslaan.
  const labelIdx = pts
    .map((_, i) => i)
    .filter((i) => i === pts.length - 1 || (i % labelStep === 0 && pts.length - 1 - i >= labelStep));

  const last = pts[pts.length - 1];

  // De lijn rekt mee met de breedte (preserveAspectRatio="none"); datums en
  // eindpunt staan als HTML eroverheen, zodat ze op elk scherm 11px blijven
  // in plaats van mee te krimpen tot ±6px op een telefoon.
  return (
    <div>
      <div className="relative" style={{ height: chartH }}>
        <svg viewBox={`0 0 ${W} ${chartH}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <linearGradient id="checkin-trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--brand-accent, #e8632a)" }} stopOpacity="0.15" />
              <stop offset="100%" style={{ stopColor: "var(--brand-accent, #e8632a)" }} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={padX} y1={padY + f * (chartH - padY * 2)} x2={W - padX} y2={padY + f * (chartH - padY * 2)} stroke="#f0ede8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#checkin-trend-grad)" />
          <polyline points={polyline} fill="none" style={{ stroke: "var(--brand-accent, #e8632a)" }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(last.x / W) * 100}%`, top: last.y, background: "var(--brand-accent, #e8632a)" }}
          aria-hidden
        />
      </div>
      <div className="relative h-4 mt-0.5" aria-hidden>
        {labelIdx.map((i, j) => {
          const p = pts[i];
          const isLast = i === pts.length - 1;
          const shift = i === 0 ? "" : isLast ? "-translate-x-full" : "-translate-x-1/2";
          // Op telefoon om de andere datum (eerste en laatste altijd).
          const mobile = j % 2 === 0 || isLast ? "" : "hidden sm:inline";
          return (
            <span key={i} className={`absolute top-0 text-[11px] text-subtle whitespace-nowrap ${shift} ${mobile}`} style={{ left: `${(p.x / W) * 100}%` }}>
              {formatDateShort(points[i].date)}
            </span>
          );
        })}
      </div>
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
          style={{ background: isDone ? "rgba(34,197,94,0.15)" : "rgba(var(--brand-accent-rgb, 232, 99, 42),0.15)" }}
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
  onAddExerciseClick, onRemoveExerciseClick, onReorderExercises, onAddPhaseClick,
  patientId, patientName, onScheduleChanged, notify,
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
  onRemoveExerciseClick: (exercise: PortalPatientProtocolScheduleExercise) => void;
  onReorderExercises: (scheduleId: string, orderedIds: string[]) => void;
  onAddPhaseClick: () => void;
  patientId: string;
  patientName: string;
  onScheduleChanged: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<Set<string>>(new Set());
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
          <p className="text-xs text-subtle">Toegewezen op {formatDate(assignment.assignedAt)}</p>
        </div>
        {canAssign && <Button size="sm" variant="secondary" onClick={onAssignClick}>Herstelplan wijzigen</Button>}
      </div>

      {/* Alle fases als stappen; klik om naar een fase te springen */}
      <div className="rounded-2xl bg-white border p-3 overflow-x-auto" style={{ borderColor: "#e8e5df" }}>
        <ol className="flex items-stretch gap-2 min-w-max">
          {assignment.phases.map((ph, i) => {
            const active = ph.status === "active";
            const done = ph.status === "completed";
            return (
              <li key={ph.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setExpandedPhaseIds((cur) => new Set(cur).add(ph.id)); document.getElementById(`fase-${ph.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#faf9f7]"
                  style={{ background: active ? "var(--brand-accent-soft, #fff3ee)" : undefined }}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: done ? "#16a34a" : active ? "var(--brand-accent, #e8632a)" : "#efece6", color: done || active ? "#fff" : "#8a847b" }}>
                    {done ? <Check size={12} /> : i + 1}
                  </span>
                  <span className="max-w-[160px]">
                    <span className={`block text-xs font-semibold truncate ${active ? "text-gray-900" : done ? "text-gray-600" : "text-gray-400"}`}>{ph.name}</span>
                    <span className="block text-[11px] text-gray-400">{active ? "Huidige fase" : done ? "Afgerond" : "Nog niet gestart"}</span>
                  </span>
                </button>
                {i < assignment.phases.length - 1 && <span className="w-4 h-px shrink-0" style={{ background: "#e2ddd5" }} />}
              </li>
            );
          })}
        </ol>
      </div>

      {(() => {
        const activeIndex = assignment.phases.findIndex((p) => p.status === "active");
        return assignment.phases.map((phase, index) => {
        const isActive = phase.status === "active";
        // Zonder criteria (bv. een eigen fase) mag de fysio altijd door.
        const allCriteriaMet = phase.criteria.every((c) => c.met);
        const hasNextPhase = index < assignment.phases.length - 1;
        const canRevertToThis = canManageContent && phase.status === "completed" && activeIndex !== -1 && index === activeIndex - 1;

        const expanded = isActive || expandedPhaseIds.has(phase.id);
        return (
          <div key={phase.id} id={`fase-${phase.id}`} className="scroll-mt-4 rounded-2xl" style={isActive ? { boxShadow: "0 0 0 2px var(--brand-accent, #e8632a)" } : undefined}>
          <Card padding={isActive ? "md" : "sm"}>
            {isActive && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: "var(--brand-accent, #e8632a)" }}>Huidige fase · {index + 1} van {assignment.phases.length}</p>}
            <div className="flex items-start justify-between gap-2 mb-1">
              {isActive ? (
                <h4 className="text-lg font-semibold text-gray-900">{phase.name}</h4>
              ) : (
                <button type="button" onClick={() => setExpandedPhaseIds((cur) => { const n = new Set(cur); if (n.has(phase.id)) n.delete(phase.id); else n.add(phase.id); return n; })}
                  className="flex items-center gap-2 text-left">
                  <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
                  <span className="text-sm font-semibold text-gray-900">{index + 1}. {phase.name}</span>
                </button>
              )}
              <div className="flex items-center gap-2 shrink-0">
                {phaseStatusBadge(phase.status)}
                {canRevertToThis && (
                  <button
                    type="button"
                    onClick={() => onRevertPhase(phase)}
                    title="Terug naar deze fase (bijv. als de volgende fase per ongeluk is gestart)"
                    className="text-subtle hover:text-gray-600"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
            {expanded && phase.description && <p className={`${isActive ? "text-sm" : "text-xs"} text-gray-500 mb-3`}>{phase.description}</p>}

            {expanded && phase.status === "completed" && hasTransitionCheckin(phase) && (
              <div className="rounded-xl p-3 text-xs space-y-1 mb-3" style={{ background: "#f8f7f4" }}>
                <p className="font-medium text-gray-500 uppercase tracking-wide" style={{ fontSize: "10px" }}>Check-in bij afronden fase</p>
                {phase.transitionPainScore !== null && <p className="text-gray-700">Pijnscore: {phase.transitionPainScore}/10</p>}
                {phase.transitionMobilityScore !== null && <p className="text-gray-700">Mobiliteit/functioneren: {phase.transitionMobilityScore}/5</p>}
                {phase.transitionSwelling !== null && <p className="text-gray-700">Zwelling: {phase.transitionSwelling ? "Ja" : "Nee"}</p>}
                {phase.transitionSatisfactionScore !== null && <p className="text-gray-700">Tevredenheid patiënt: {phase.transitionSatisfactionScore}/5</p>}
                {phase.transitionProgressVsExpected && <p className="text-gray-700">Verloop: {PROGRESS_VS_EXPECTED_LABELS[phase.transitionProgressVsExpected]}</p>}
                {phase.transitionNote && <p className="text-gray-700">{phase.transitionNote}</p>}
              </div>
            )}

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
                          <span className={c.met ? "line-through text-subtle" : ""}>{c.description}</span>
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
                          <span className={m.completed ? "line-through text-subtle" : ""}>{m.title}</span>
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

                <PatientScheduleBoard
                  schedules={phase.schedules}
                  phaseId={phase.id}
                  phaseName={phase.name}
                  patientId={patientId}
                  patientName={patientName}
                  canManage={canManageContent}
                  onChanged={onScheduleChanged}
                  onAddExercises={onAddExerciseClick}
                  onRemoveExercise={onRemoveExerciseClick}
                  onReorderExercises={onReorderExercises}
                  notify={notify}
                />

                {canManageContent && hasNextPhase && (
                  <Button size="sm" disabled={!allCriteriaMet} onClick={() => onAdvancePhase(phase)}>
                    <Check size={13} /> Markeer fase voltooid en start volgende
                  </Button>
                )}
                {canManageContent && hasNextPhase && !allCriteriaMet && phase.criteria.length > 0 && (
                  <p className="text-xs text-subtle">Alle criteria moeten afgevinkt zijn voordat de volgende fase kan starten.</p>
                )}
              </div>
            )}
          </Card>
          </div>
        );
        });
      })()}

      {sessionNotes.length > 0 && (
        <Card>
          <CardHeader title="Notities bij trainingssessies" subtitle="Door de patiënt toegevoegd bij het loggen van een sessie" />
          <div className="space-y-2.5">
            {sessionNotes.map((n) => (
              <div key={n.id} className="rounded-xl p-3" style={{ background: "#f8f7f4" }}>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{scheduleTitleById.get(n.scheduleId) ?? "Sessie"}</span>
                  <span className="text-xs text-subtle ml-auto shrink-0">{formatDate(n.date)}</span>
                </div>
                <p className="text-sm text-gray-600 pl-[18px]">{n.reflection}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {canManageContent && (
        <button
          type="button"
          onClick={onAddPhaseClick}
          className="w-full rounded-2xl border border-dashed py-3.5 text-sm font-medium transition-colors hover:bg-white"
          style={{ borderColor: "#d9d4cc", color: "var(--brand-accent, #e8632a)" }}
        >
          + Fase toevoegen
        </button>
      )}
    </div>
  );
}

function noteTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} om ${date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
}

const SWELLING_LABELS: Record<string, string> = { none: "Geen", mild: "Licht", significant: "Aanzienlijk" };
const MOBILITY_AID_LABELS: Record<string, string> = {
  none: "Geen", one_crutch: "1 kruk", two_crutches: "2 krukken", walker: "Rollator",
  wheelchair: "Rolstoel", tape_bandage: "Tape/verband", brace: "Brace", other: "Anders",
};
const WEIGHT_BEARING_LABELS: Record<string, string> = { full: "Volledig belasten", partial: "Deels belasten", non_weight_bearing: "Niet belasten" };
const BODY_SIDE_LABELS: Record<string, string> = { left: "Links", right: "Rechts", both: "Beide zijden" };
const SYMPTOM_ONSET_LABELS: Record<string, string> = {
  lt_2_weeks: "Minder dan 2 weken", "2_6_weeks": "2 tot 6 weken", "6_12_weeks": "6 tot 12 weken", gt_3_months: "Meer dan 3 maanden",
};
const DAILY_IMPACT_LABELS: Record<string, string> = { none: "Geen impact", mild: "Lichte impact", moderate: "Matige impact", severe: "Grote impact" };

function IntakeField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

function IntakeSubTab({ intake, loading }: { intake: PortalPatientIntake | null; loading: boolean }) {
  if (loading) return <Card><p className="text-sm text-subtle">Laden…</p></Card>;
  if (intake?.status === "requested") {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title="Wacht op de patiënt"
          description={`De patiënt vult de intake zelf in na het inloggen${intake.requestedAt ? ` (klaargezet op ${formatDate(intake.requestedAt)})` : ""}.`}
        />
      </Card>
    );
  }
  if (!intake) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title="Geen intake gevonden"
          description="Deze patiënt is aangemaakt zonder de intake-wizard te doorlopen, of de intake is nog niet afgerond."
        />
      </Card>
    );
  }

  const i = intake.input;
  const filledByPatient = intake.filledBy === "patient";
  return (
    <div className="space-y-4">
      {filledByPatient && (
        <p className="text-xs text-subtle">Ingevuld door de patiënt{intake.submittedAt ? ` op ${formatDate(intake.submittedAt)}` : ""}.</p>
      )}
      {i.redFlags.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>Rode vlag gemeld</p>
          <p className="text-sm mt-1" style={{ color: "#7f1d1d" }}>{i.redFlags.map((f) => RED_FLAG_LABELS[f]).join(" · ")}</p>
          <p className="text-xs mt-1.5" style={{ color: "#991b1b" }}>Overweeg overleg met de huisarts.</p>
        </div>
      )}
      {intake.aiSummary && (
        <Card>
          <CardHeader title="REVA Analyse" subtitle={intake.completedAt ? `Intake afgerond op ${formatDate(intake.completedAt)}${intake.createdByName ? ` door ${intake.createdByName}` : ""}` : undefined} />
          <p className="text-sm text-gray-700 leading-relaxed">{intake.aiSummary}</p>
          {intake.aiAttentionPoints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {intake.aiAttentionPoints.map((a, i) => (
                <Badge key={i} variant={a.severity === "warning" ? "warning" : "default"}>{a.label}</Badge>
              ))}
            </div>
          )}
          {intake.aiRecommendedProtocolName && (
            <p className="text-xs text-gray-500 mt-3">
              Aanbevolen herstelplan: <span className="font-medium text-gray-700">{intake.aiRecommendedProtocolName}</span>
              {intake.aiRecommendationReasoning && ` — ${intake.aiRecommendationReasoning}`}
            </p>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Ontstaan en beloop" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IntakeField label="Ontstaan" value={i.onsetMechanism ? ONSET_MECHANISM_LABELS[i.onsetMechanism] : null} />
          <IntakeField label="Beloop" value={i.symptomCourse ? SYMPTOM_COURSE_LABELS[i.symptomCourse] : null} />
          <IntakeField label="Verwezen door" value={i.referralSource ? REFERRAL_SOURCE_LABELS[i.referralSource] : null} />
        </div>
        {i.injuryDescription && <p className="text-sm text-gray-700 mt-3">{i.injuryDescription}</p>}
      </Card>

      <Card>
        <CardHeader title="Klachten & pijn" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IntakeField label="Reden bezoek" value={intake.visitReason} />
          <IntakeField label="Zijde" value={intake.bodySide ? BODY_SIDE_LABELS[intake.bodySide] ?? intake.bodySide : null} />
          <IntakeField label="Pijnscore bij intake" value={intake.painScoreNow !== null ? `${intake.painScoreNow}/10` : null} />
          <IntakeField label="Ergste pijn" value={i.painWorst !== null ? `${i.painWorst}/10` : null} />
          <IntakeField label="Nachtpijn" value={i.nightPain === null ? null : i.nightPain ? "Ja" : "Nee"} />
          <IntakeField label="Erger bij" value={i.painTriggers} />
          <IntakeField label="Zwelling" value={intake.swelling ? SWELLING_LABELS[intake.swelling] ?? intake.swelling : null} />
          <IntakeField label="Pijnlocatie" value={intake.painLocation} />
          <IntakeField label="Sinds wanneer" value={intake.symptomOnset ? SYMPTOM_ONSET_LABELS[intake.symptomOnset] ?? intake.symptomOnset : null} />
          <IntakeField label="Impact op dagelijks leven" value={intake.dailyImpact ? DAILY_IMPACT_LABELS[intake.dailyImpact] ?? intake.dailyImpact : null} />
          <IntakeField label="Uitstraling" value={intake.radiatingPain ? "Ja" : null} />
          <IntakeField label="Gerelateerd aan zwangerschap" value={intake.pregnancyRelated ? "Ja" : null} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Mobiliteit & functioneren" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IntakeField label="Hulpmiddel" value={intake.mobilityAid ? MOBILITY_AID_LABELS[intake.mobilityAid] ?? intake.mobilityAid : null} />
          <IntakeField label="Belasting" value={intake.weightBearingStatus ? WEIGHT_BEARING_LABELS[intake.weightBearingStatus] ?? intake.weightBearingStatus : null} />
          <IntakeField label="ROM bij intake" value={intake.romDegrees !== null ? `${intake.romDegrees}°` : null} />
          <IntakeField label="Slaap" value={i.sleepImpact ? SLEEP_IMPACT_LABELS[i.sleepImpact] : null} />
          <IntakeField label="Angst om te bewegen" value={i.fearOfMovement === null ? null : i.fearOfMovement ? "Ja" : "Nee"} />
          <IntakeField label="Aanvullende ingreep" value={intake.additionalProcedures} />
          <IntakeField label="Eerdere behandeling" value={intake.previousTreatmentText} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Werk, sport en gezondheid" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IntakeField label="Beroep" value={i.occupation} />
          <IntakeField label="Werkbelasting" value={i.workLoad ? WORK_LOAD_LABELS[i.workLoad] : null} />
          <IntakeField label="Sport" value={i.sportFrequency ? SPORT_FREQUENCY_LABELS[i.sportFrequency] : null} />
          <IntakeField label="Sportniveau" value={i.sportLevel ? SPORT_LEVEL_LABELS[i.sportLevel] : null} />
          <IntakeField label="Voorgeschiedenis" value={i.medicalHistory} />
          <IntakeField label="Medicatie" value={i.medicationText} />
          <IntakeField label="Scans/foto's" value={i.imaging.length > 0 ? i.imaging.map((x) => IMAGING_LABELS[x]).join(", ") : null} />
          <IntakeField label="Lengte" value={intake.heightCm !== null ? `${intake.heightCm} cm` : null} />
          <IntakeField label="Gewicht" value={intake.weightKg !== null ? `${intake.weightKg} kg` : null} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Herstel & doelen" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IntakeField label="Terug naar sport" value={intake.returnToSportGoal ? (intake.sportType || "Ja") : null} />
          <IntakeField label="Terug naar werk" value={intake.returnToWorkGoal ? "Ja" : null} />
          <IntakeField label="Doel binnen" value={intake.goalTimeframeMonths !== null ? `${intake.goalTimeframeMonths} ${intake.goalTimeframeMonths === 1 ? "maand" : "maanden"}` : null} />
        </div>
        {intake.patientGoalText && (
          <p className="text-sm text-gray-600 italic mt-3">&ldquo;{intake.patientGoalText}&rdquo;</p>
        )}
        {i.patientExpectation && (
          <p className="text-sm text-gray-600 mt-2"><span className="text-gray-500">Verwachting:</span> {i.patientExpectation}</p>
        )}
        {intake.therapistObservations && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f0ede8" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle mb-1">Observaties therapeut</p>
            <p className="text-sm text-gray-700">{intake.therapistObservations}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function FaseovergangenSubTab({ phases }: { phases: PortalPatientProtocolPhase[] }) {
  const withCheckin = phases
    .filter(hasTransitionCheckin)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  if (withCheckin.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Flag}
          title="Nog geen faseovergangen"
          description="Zodra een fase van het herstelplan wordt afgerond met een check-in, verschijnt die hier."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {withCheckin.map((phase) => (
        <Card key={phase.id}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">{phase.name}</h3>
            {phase.completedAt && <span className="text-xs text-subtle">{formatDate(phase.completedAt)}</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
            <IntakeField label="Pijnscore" value={phase.transitionPainScore !== null ? `${phase.transitionPainScore}/10` : null} />
            <IntakeField label="Mobiliteit/functioneren" value={phase.transitionMobilityScore !== null ? `${phase.transitionMobilityScore}/5` : null} />
            <IntakeField label="Zwelling" value={phase.transitionSwelling !== null ? (phase.transitionSwelling ? "Ja" : "Nee") : null} />
            <IntakeField label="Tevredenheid patiënt" value={phase.transitionSatisfactionScore !== null ? `${phase.transitionSatisfactionScore}/5` : null} />
            <IntakeField label="Verloop" value={phase.transitionProgressVsExpected ? PROGRESS_VS_EXPECTED_LABELS[phase.transitionProgressVsExpected] : null} />
          </div>
          {phase.transitionNote && <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{phase.transitionNote}</p>}
        </Card>
      ))}
    </div>
  );
}

type LogboekSubTab = "notities" | "intake" | "faseovergangen";
const LOGBOEK_SUB_TAB_OPTIONS: { value: LogboekSubTab; label: string }[] = [
  { value: "notities", label: "Notities" },
  { value: "intake", label: "Intake" },
  { value: "faseovergangen", label: "Faseovergangen" },
];

function LogboekTab({
  notes, currentUserId, saving, onAdd, editingNoteId, editDraft, onEditDraftChange, editSaving,
  onStartEdit, onCancelEdit, onSaveEdit, onDeleteClick, intake, intakeLoading, phases,
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
  intake: PortalPatientIntake | null;
  intakeLoading: boolean;
  phases: PortalPatientProtocolPhase[];
}) {
  const [draft, setDraft] = useState("");
  const [subTab, setSubTab] = useState<LogboekSubTab>("notities");

  return (
    <div className="space-y-4">
      <Tabs options={LOGBOEK_SUB_TAB_OPTIONS} value={subTab} onChange={setSubTab} />

      {subTab === "notities" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Nieuwe notitie" subtitle="Alleen zichtbaar voor collega's binnen deze praktijk" />
            <div className="space-y-2.5">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Bijv. bijzonderheden over de behandeling, afspraken met de patiënt, aandachtspunten voor collega's..."
                aria-label="Nieuwe notitie"
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
                        <span className="text-xs text-subtle">{noteTimestamp(n.createdAt)}</span>
                        {n.updatedAt !== n.createdAt && <span className="text-xs text-subtle italic">(bewerkt)</span>}
                        {isOwn && !isEditing && (
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onStartEdit(n)}
                              className="text-subtle hover:text-gray-600 p-1"
                              aria-label="Notitie bewerken"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteClick(n)}
                              className="text-subtle hover:text-red-500 p-1"
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
                            className="w-full text-base sm:text-sm rounded-lg border px-2.5 py-2 resize-none focus:outline-none"
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
      )}

      {subTab === "intake" && <IntakeSubTab intake={intake} loading={intakeLoading} />}
      {subTab === "faseovergangen" && <FaseovergangenSubTab phases={phases} />}
    </div>
  );
}

/** Lokale datum als YYYY-MM-DD (niet UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type TabKey = "overzicht" | "herstelplan" | "logboek" | "gegevens";
const TAB_OPTIONS: { value: TabKey; label: string; className?: string }[] = [
  { value: "overzicht", label: "Overzicht" },
  { value: "herstelplan", label: "Herstelplan" },
  { value: "logboek", label: "Logboek" },
  // Op desktop staan Status, Afsluiting en Behandelgegevens in de zijkolom
  // naast elke tab; op telefoon/tablet krijgen ze een eigen tab i.p.v. onder
  // elke tab herhaald te worden.
  { value: "gegevens", label: "Gegevens", className: "lg:hidden" },
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
  const [trendRange, setTrendRange] = useState(14);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabKey>("overzicht");

  // Fotogalerij: laadt de volledige fotogeschiedenis pas zodra de gebruiker
  // hem daadwerkelijk opent (niet vooraf bij elk paginabezoek).
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [photoHistory, setPhotoHistory] = useState<PortalPhotoHistoryItem[]>([]);
  const [photoHistoryUrls, setPhotoHistoryUrls] = useState<Map<string, string>>(new Map());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Check-in-geschiedenis: idem, pas geladen bij openen.
  const [checkinHistoryOpen, setCheckinHistoryOpen] = useState(false);
  const [checkinHistoryLoading, setCheckinHistoryLoading] = useState(false);
  const [checkinHistory, setCheckinHistory] = useState<PortalCheckinTrendPoint[]>([]);

  // Snelle acties in de zijbalk (uitnodigen/archiveren/verwijderen) — zelfde
  // handlers als op de lijstpagina, hier hergebruikt.
  const [invitingPatient, setInvitingPatient] = useState(false);
  const [archivingPatient, setArchivingPatient] = useState(false);
  const [confirmDeletePatient, setConfirmDeletePatient] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);

  // Afsluiting behandeling (Herstel datum) — inline formuliertje, geen modal,
  // want maar 2 velden (datum + uitkomst).
  const [editingDischarge, setEditingDischarge] = useState(false);
  const [dischargeDateInput, setDischargeDateInput] = useState("");
  const [dischargeOutcomeInput, setDischargeOutcomeInput] = useState<DischargeOutcome | "">("");
  const [savingDischarge, setSavingDischarge] = useState(false);

  const [assignment, setAssignment] = useState<PortalPatientProtocolAssignment | null>(null);
  const [sessionNotes, setSessionNotes] = useState<PortalPatientSessionNote[]>([]);
  const [staffNotes, setStaffNotes] = useState<PortalPatientStaffNote[]>([]);
  const [intake, setIntake] = useState<PortalPatientIntake | null>(null);
  const [intakeLoading, setIntakeLoading] = useState(true);
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
  const [confirmMfaReset, setConfirmMfaReset] = useState(false);
  const [showCompleteIntake, setShowCompleteIntake] = useState(false);
  const [addPhase, setAddPhase] = useState<{ phaseName: string; phaseDescription: string; frequencyPerWeek: number } | null>(null);
  const [addPhaseSaving, setAddPhaseSaving] = useState(false);
  const [addPhaseError, setAddPhaseError] = useState("");
  const [resettingMfa, setResettingMfa] = useState(false);

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

  async function openCheckinHistory() {
    setCheckinHistoryOpen(true);
    setCheckinHistoryLoading(true);
    const data = await loadPatientCheckinHistory(patientId);
    setCheckinHistory(data);
    setCheckinHistoryLoading(false);
  }

  async function openGallery(startAtIndex: number | null) {
    setGalleryOpen(true);
    setLightboxIndex(startAtIndex);
    setGalleryLoading(true);
    const history = await loadPatientPhotoHistory(patientId);
    setPhotoHistory(history);
    const paths = history.map((h) => h.imagePath).filter((p): p is string => !!p);
    const urls = await resolveSignedUrls("dossier-photos", paths);
    setPhotoHistoryUrls(urls);
    setGalleryLoading(false);
  }

  function closeGallery() {
    setGalleryOpen(false);
    setLightboxIndex(null);
    setPhotoHistory([]);
    setPhotoHistoryUrls(new Map());
  }

  async function handleAddPhase() {
    if (!addPhase || !assignment) return;
    if (!addPhase.phaseName.trim()) { setAddPhaseError("Geef de fase een naam"); return; }
    setAddPhaseSaving(true);
    const { error } = await addPatientProtocolPhase(assignment.id, addPhase);
    setAddPhaseSaving(false);
    if (error) { setAddPhaseError(error); return; }
    setAddPhase(null);
    refreshProtocol();
    showToast("Fase toegevoegd");
  }

  async function handleMfaReset() {
    if (!patient) return;
    setResettingMfa(true);
    const { error } = await resetPatientMfa(patient.id);
    setResettingMfa(false);
    setConfirmMfaReset(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Tweestapsverificatie gereset. De patiënt stelt deze opnieuw in bij de volgende keer inloggen.");
  }

  async function handleInvitePatient() {
    if (!patient?.email || !membership) { showToast("Dit dossier heeft geen e-mailadres.", "error"); return; }
    setInvitingPatient(true);
    const result = await invitePortalPatient(patient.id, membership.organizationId, patient.email, true);
    setInvitingPatient(false);
    if (result.outcome === "failed") {
      showToast(result.error, "error");
    } else {
      showToast(result.outcome === "linked" ? "Gekoppeld aan bestaand account, e-mail verstuurd." : "Uitnodiging verstuurd.");
      refresh(membership.organizationId);
    }
  }

  async function handleArchivePatient() {
    if (!patient) return;
    const nextStatus = patient.status === "archived" ? "active" : "archived";
    setArchivingPatient(true);
    const { error } = await updatePortalPatientStatus(patient.id, nextStatus);
    setArchivingPatient(false);
    if (error) { showToast("Opslaan mislukt: " + error, "error"); return; }
    showToast(nextStatus === "archived" ? "Patiënt gearchiveerd" : "Patiënt gedearchiveerd");
    if (membership) refresh(membership.organizationId);
  }

  function openDischargeForm() {
    setDischargeDateInput(patient?.dischargedAt ? patient.dischargedAt.slice(0, 10) : "");
    setDischargeOutcomeInput(patient?.dischargeOutcome ?? "");
    setEditingDischarge(true);
  }

  async function handleSaveDischarge() {
    if (!patient || !dischargeDateInput) return;
    setSavingDischarge(true);
    const { error } = await updatePatientDischarge(patient.id, dischargeDateInput, dischargeOutcomeInput || null);
    setSavingDischarge(false);
    if (error) { showToast(error, "error"); return; }
    setEditingDischarge(false);
    showToast("Afsluitdatum opgeslagen");
    if (membership) refresh(membership.organizationId);
  }

  async function handleReopenDischarge() {
    if (!patient) return;
    setSavingDischarge(true);
    const { error } = await updatePatientDischarge(patient.id, null, null);
    setSavingDischarge(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Behandeling heropend");
    if (membership) refresh(membership.organizationId);
  }

  async function handleDeletePatient() {
    if (!patient) return;
    setDeletingPatient(true);
    const { error } = await deletePortalPatient(patient.id);
    setDeletingPatient(false);
    setConfirmDeletePatient(false);
    if (error) { showToast("Verwijderen mislukt: " + error, "error"); return; }
    showToast("Patiënt verwijderd");
    router.push("/portal/patienten");
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
      loadPatientIntake(patientId),
    ]).then(([patients, extrasData, locationsData, membersData, assignmentData, revaData, orgData, sessionNotesData, exerciseData, staffNotesData, intakeData]) => {
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
      setIntake(intakeData);
      setIntakeLoading(false);
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
    if (intake?.status === "submitted") {
      await markIntakeCompleted(intake.id);
      loadPatientIntake(patientId).then(setIntake);
    }
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

  async function confirmAdvancePhase(checkin: PhaseTransitionCheckin) {
    if (!assignment || !confirmAdvance) return;
    const sorted = assignment.phases;
    const index = sorted.findIndex((p) => p.id === confirmAdvance.id);
    const next = sorted[index + 1];
    if (!next) { setConfirmAdvance(null); return; }
    setPhaseChanging(true);
    const { error } = await advanceToNextPhase(confirmAdvance.id, next.id, checkin);
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push("/portal/patienten")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Terug naar patiënten
      </button>

      {loading ? (
        <p className="text-sm text-subtle">Laden…</p>
      ) : notFound || !patient ? (
        <p className="text-sm text-subtle">Dit patiëntdossier is niet gevonden.</p>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <Avatar fullName={patient.fullName} email={patient.email} avatarUrl={null} size={48} />
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap flex-1 min-w-0">
              <div className="min-w-0 [&_p]:[overflow-wrap:anywhere]">
                <SectionHeader title={patient.fullName || "Naam nog niet ingevuld"} subtitle={patient.email ?? undefined} />
              </div>
              {statusBadge(patient.status)}
              {showMilestone && (
                <Badge variant="accent" className="flex items-center gap-1">
                  <Award size={12} /> Mijlpaal: {extras!.recentMilestone!.title}
                </Badge>
              )}
            </div>
            {canManagePatients && (
              <div className="shrink-0 pt-2">
                <ActionMenu
                  label="Acties"
                  items={[
                    { label: "Gegevens wijzigen", icon: Pencil, onClick: () => setEditing(true) },
                    ...(!patient.hasAccount && patient.email
                      ? [{ label: "Uitnodiging versturen", icon: Send, onClick: handleInvitePatient }]
                      : []),
                    ...(patient.hasAccount
                      ? [{ label: "Tweestapsverificatie resetten", icon: ShieldOff, onClick: () => setConfirmMfaReset(true) }]
                      : []),
                    {
                      label: patient.status === "archived" ? "Dearchiveren" : "Archiveren",
                      icon: patient.status === "archived" ? ArchiveRestore : Archive,
                      onClick: () => { if (!archivingPatient) handleArchivePatient(); },
                    },
                    { label: "Verwijderen", icon: Trash2, onClick: () => setConfirmDeletePatient(true), danger: true },
                  ]}
                />
              </div>
            )}
          </div>

          <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className={`space-y-6 min-w-0 ${tab === "gegevens" ? "hidden lg:block" : ""}`}>
              {/* "Gegevens" bestaat alleen onder lg; wordt het scherm breder, dan valt de hoofdkolom terug op het overzicht. */}
              {(tab === "overzicht" || tab === "gegevens") && (
              <>
              {intake?.status === "submitted" && canAssignProtocol && (
                <div className="rounded-2xl p-5 flex items-start gap-4 flex-wrap" style={{ background: "var(--brand-accent-soft, #fff3ee)", border: "1px solid var(--brand-accent-border, #f6d3c2)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--brand-accent, #e8632a)" }}>
                    <ClipboardList size={18} color="#ffffff" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold text-gray-900">Intake ingevuld door de patiënt</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {intake.submittedAt ? `Ingevuld op ${formatDate(intake.submittedAt)}. ` : ""}Bekijk de analyse en kies het herstelplan om te starten.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowCompleteIntake(true)}>Herstelplan kiezen</Button>
                </div>
              )}
              {intake?.status === "requested" && (
                <div className="rounded-2xl px-5 py-4 text-sm text-gray-600" style={{ background: "#ffffff", border: "1px solid #e8e5df" }}>
                  <span className="font-medium text-gray-800">Wacht op de intake van de patiënt.</span>{" "}
                  {patient.hasAccount
                    ? "De patiënt ziet de intake bij de volgende keer inloggen."
                    : "De patiënt vult de intake in na het accepteren van de uitnodiging."}
                </div>
              )}
              {extras && patient.status === "active" && (
                <InsightCard
                  scope={patientId}
                  insights={buildPatientInsights({
                    firstName: (patient.fullName ?? "").split(" ")[0],
                    checkins: extras.checkinTrend,
                    assignment,
                    sessionNotes,
                    today: localToday(),
                  })}
                  contact={{ phone: patient.phone, email: patient.email }}
                  onAction={(target) => {
                    if (target === "herstelplan" || target === "logboek") {
                      setTab(target);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                />
              )}
              {extras?.mainGoal && <MainGoalCard goal={extras.mainGoal} />}

              {/* Check-in status — hoe voelt de patiënt zich */}
              <Card>
                <CardHeader
                  title="Check-in status"
                  subtitle={lastCheckin ? `Laatste check-in op ${formatDate(lastCheckin.date)}` : undefined}
                  action={
                    <Button size="sm" variant="secondary" onClick={openCheckinHistory}>
                      <History size={13} /> Geschiedenis
                    </Button>
                  }
                />
                {lastCheckin && (
                  // Eigen regel onder de titel: in de kop paste dit op telefoon
                  // en tablet niet, waardoor de pagina horizontaal ging scrollen.
                  <div className="flex items-center justify-between gap-2 flex-wrap -mt-1 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {lastCheckin.swelling && <Badge variant="warning" className="flex items-center gap-1"><Droplets size={12} /> Zwelling gemeld</Badge>}
                    </div>
                    <TrendRangeFilter value={trendRange} onChange={setTrendRange} />
                  </div>
                )}
                {!lastCheckin ? (
                  <p className="text-sm text-subtle">Nog geen check-ins ingevuld.</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader
                    title="Laatste foto-update"
                    action={extras?.latestPhoto ? (
                      <Button size="sm" variant="secondary" onClick={() => openGallery(null)}>
                        <Images size={13} /> Alle foto&apos;s
                      </Button>
                    ) : undefined}
                  />
                  {!extras?.latestPhoto ? (
                    <p className="text-sm text-subtle">Nog geen foto-update.</p>
                  ) : (
                    <div className="space-y-2">
                      {photoUrl ? (
                        <button
                          type="button"
                          onClick={() => openGallery(0)}
                          className="block w-full h-32 rounded-xl overflow-hidden cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoUrl} alt="Laatste voortgangsfoto" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                    <p className="text-sm text-subtle">Nog geen medicatie gelogd.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><Pill size={14} style={{ color: "var(--brand-accent, #e8632a)" }} /> {extras.latestMedication.medicationName}</p>
                      {extras.latestMedication.dosage && <p className="text-xs text-gray-500">{extras.latestMedication.dosage}{extras.latestMedication.quantity ? ` · ${extras.latestMedication.quantity}` : ""}</p>}
                      <p className="text-xs text-subtle">{formatDate(extras.latestMedication.date)}{extras.latestMedication.time ? ` om ${extras.latestMedication.time}` : ""}</p>
                      {extras.latestMedication.reason && <p className="text-xs text-gray-500">Reden: {extras.latestMedication.reason}</p>}
                    </div>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Eerstvolgende afspraak" />
                  {!extras?.upcomingAppointment ? (
                    <p className="text-sm text-subtle">Geen geplande afspraak.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><CalendarClock size={14} style={{ color: "var(--brand-accent, #e8632a)" }} /> {extras.upcomingAppointment.title}</p>
                      {appointmentTypeLabel(extras.upcomingAppointment.appointmentType) && (
                        <p className="text-xs text-gray-500">{appointmentTypeLabel(extras.upcomingAppointment.appointmentType)}</p>
                      )}
                      <p className="text-xs text-subtle">{formatDate(extras.upcomingAppointment.date)}{extras.upcomingAppointment.time ? ` om ${extras.upcomingAppointment.time}` : ""}</p>
                      {extras.upcomingAppointment.location && <p className="text-xs text-gray-500">{extras.upcomingAppointment.location}</p>}
                    </div>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Training deze week" />
                  {!extras || extras.trainingWeek.total === 0 ? (
                    <p className="text-sm text-subtle">Nog geen trainingen gelogd.</p>
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
                  patientId={patientId}
                  patientName={patient.fullName || "Patiënt"}
                  onScheduleChanged={refreshProtocol}
                  notify={(m, t) => showToast(m, t)}
                  onRemoveExerciseClick={setConfirmRemoveExercise}
                  onReorderExercises={handleReorderScheduleExercises}
                  onAddPhaseClick={() => { setAddPhaseError(""); setAddPhase({ phaseName: `Fase ${(assignment?.phases.length ?? 0) + 1}`, phaseDescription: "", frequencyPerWeek: 3 }); }}
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
                  intake={intake}
                  intakeLoading={intakeLoading}
                  phases={assignment?.phases ?? []}
                />
              )}
            </div>

            <div className={`space-y-6 min-w-0 ${tab === "gegevens" ? "" : "hidden lg:block"}`}>
              <Card>
                <CardHeader title="Status" />
                <div className="space-y-3">
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Dossier</dt>
                      <dd>{statusBadge(patient.status)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Patiënt-app</dt>
                      <dd>{accountBadge(patient)}</dd>
                    </div>
                  </dl>
                  {canManagePatients && !patient.hasAccount && patient.email && (
                    <Button size="sm" variant="secondary" disabled={invitingPatient} onClick={handleInvitePatient}>
                      {invitingPatient ? "Versturen…" : "Uitnodiging versturen"}
                    </Button>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Afsluiting behandeling"
                  subtitle="Wanneer is deze patiënt daadwerkelijk uitbehandeld"
                />
                {editingDischarge ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-subtle mb-1">Afsluitdatum</p>
                      <DatePicker value={dischargeDateInput} onChange={setDischargeDateInput} placeholder="Kies een datum" />
                    </div>
                    <div>
                      <p className="text-xs text-subtle mb-1">Uitkomst</p>
                      <select
                        value={dischargeOutcomeInput}
                        onChange={(e) => setDischargeOutcomeInput(e.target.value as DischargeOutcome | "")}
                        className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none appearance-none min-h-11 sm:min-h-0"
                        style={{ borderColor: "#e8e5df", background: "#ffffff", color: "#1a1a1a" }}
                      >
                        <option value="">Niet aangegeven</option>
                        {(Object.entries(DISCHARGE_OUTCOME_LABELS) as [DischargeOutcome, string][]).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" disabled={!dischargeDateInput || savingDischarge} onClick={handleSaveDischarge}>
                        {savingDischarge ? "Opslaan…" : "Behandeling afsluiten"}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={savingDischarge} onClick={() => setEditingDischarge(false)}>
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : patient.dischargedAt ? (
                  <div className="space-y-3 text-sm">
                    <div><p className="text-xs text-subtle">Afgesloten op</p><p className="text-gray-800">{formatDate(patient.dischargedAt)}</p></div>
                    <div>
                      <p className="text-xs text-subtle">Uitkomst</p>
                      <p className="text-gray-800">{patient.dischargeOutcome ? DISCHARGE_OUTCOME_LABELS[patient.dischargeOutcome] : "Niet aangegeven"}</p>
                    </div>
                    {canManagePatients && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="secondary" onClick={openDischargeForm}>Wijzigen</Button>
                        <Button size="sm" variant="secondary" disabled={savingDischarge} onClick={handleReopenDischarge}>
                          {savingDischarge ? "Bezig…" : "Heropenen"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-subtle">Nog niet afgesloten.</p>
                    {canManagePatients && (
                      <Button size="sm" variant="secondary" onClick={openDischargeForm}>Behandeling afsluiten</Button>
                    )}
                  </div>
                )}
              </Card>

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
                <div className="space-y-3 text-sm">
                  <div><p className="text-xs text-subtle">Telefoonnummer</p><p className="text-gray-800">{patient.phone || "—"}</p></div>
                  <div><p className="text-xs text-subtle">Geboortedatum</p><p className="text-gray-800">{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</p></div>
                  <div><p className="text-xs text-subtle">Geslacht</p><p className="text-gray-800">{genderLabel(patient.gender)}</p></div>
                  <div><p className="text-xs text-subtle">Locatie</p><p className="text-gray-800">{patient.locationName || "—"}</p></div>
                  <div><p className="text-xs text-subtle">Behandelend therapeut</p><p className="text-gray-800">{patient.therapistName || "—"}</p></div>
                  <div><p className="text-xs text-subtle">Herstelplan</p><p className="text-gray-800">{patient.protocolName || "—"}</p></div>
                  <div><p className="text-xs text-subtle">Operatiedatum</p><p className="text-gray-800">{patient.surgeryDate ? formatDate(patient.surgeryDate) : "—"}</p></div>
                  <div><p className="text-xs text-subtle">Blessuredatum</p><p className="text-gray-800">{patient.injuryDate ? formatDate(patient.injuryDate) : "—"}</p></div>
                  <div><p className="text-xs text-subtle">Blessuretype</p><p className="text-gray-800">{injuryTypeLabel(patient.injuryType)}</p></div>
                </div>
              </Card>
            </div>
          </div>

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

          {showCompleteIntake && intake && (
            <CompleteIntakeModal
              patientId={patient.id}
              patientName={patient.fullName || "De patiënt"}
              intake={intake}
              injuryType={patient.injuryType ?? ""}
              injuryDate={patient.injuryDate ?? ""}
              surgeryDate={patient.surgeryDate ?? ""}
              protocols={[...orgProtocols, ...revaProtocols]}
              onClose={() => setShowCompleteIntake(false)}
              onDone={() => {
                setShowCompleteIntake(false);
                refreshProtocol();
                loadPatientIntake(patientId).then(setIntake);
                showToast("Herstelplan gestart");
                setTab("herstelplan");
              }}
            />
          )}

          {addPhase && (
            <Modal onClose={() => setAddPhase(null)} maxWidth="max-w-md" dismissOnBackdropClick={false}>
              <Card>
                <CardHeader title="Fase toevoegen" subtitle="Komt achteraan in het herstelplan van deze patiënt." />
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Naam</p>
                    <Input value={addPhase.phaseName} onChange={(e) => setAddPhase({ ...addPhase, phaseName: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Doel van deze fase (optioneel)</p>
                    <Textarea rows={2} value={addPhase.phaseDescription} onChange={(e) => setAddPhase({ ...addPhase, phaseDescription: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Oefenen per week</p>
                    <Select value={addPhase.frequencyPerWeek} onChange={(e) => setAddPhase({ ...addPhase, frequencyPerWeek: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6, 7, 14].map((n) => <option key={n} value={n}>{n === 14 ? "2× per dag" : `${n}× per week`}</option>)}
                    </Select>
                  </div>
                  {addPhaseError && <p className="text-xs" style={{ color: "#dc2626" }}>{addPhaseError}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="secondary" onClick={() => setAddPhase(null)} disabled={addPhaseSaving}>Annuleren</Button>
                    <Button size="sm" onClick={handleAddPhase} disabled={addPhaseSaving}>
                      {addPhaseSaving ? <Loader2 size={13} className="animate-spin" /> : "Toevoegen"}
                    </Button>
                  </div>
                </div>
              </Card>
            </Modal>
          )}

          {confirmMfaReset && (
            <ConfirmDialog
              title="Tweestapsverificatie resetten?"
              message="Doe dit alleen als de patiënt geen toegang meer heeft tot de authenticator-app, bijvoorbeeld na een nieuwe telefoon. Controleer eerst of je echt met de patiënt zelf spreekt. Bij de volgende keer inloggen stelt de patiënt tweestapsverificatie opnieuw in."
              confirmLabel="Resetten"
              loading={resettingMfa}
              onCancel={() => setConfirmMfaReset(false)}
              onConfirm={handleMfaReset}
            />
          )}

          {confirmAdvance && (
            <PhaseTransitionModal
              phaseName={confirmAdvance.name}
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
                    <p className="text-sm text-subtle">Nog geen herstelplannen beschikbaar. Maak er eerst een aan via Herstelplannen.</p>
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

          {checkinHistoryOpen && (
            <Modal onClose={() => setCheckinHistoryOpen(false)} maxWidth="max-w-3xl">
              <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
                <h3 className="font-semibold text-gray-900 mb-4">Check-in geschiedenis</h3>
                {checkinHistoryLoading ? (
                  <p className="text-sm text-subtle">Laden…</p>
                ) : checkinHistory.length === 0 ? (
                  <p className="text-sm text-subtle">Nog geen check-ins ingevuld.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Datum</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Dagscore</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Pijn</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Mobiliteit</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Energie</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Stemming</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Slaap</th>
                          <th className="text-left font-medium text-subtle text-xs uppercase tracking-wide px-3 py-2">Notitie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkinHistory.map((c) => (
                          <tr key={c.date} style={{ borderBottom: "1px solid #f8f7f4" }}>
                            <td className="px-3 py-2.5 text-gray-800 whitespace-nowrap">
                              {formatDate(c.date)}
                              {c.swelling && <Droplets size={12} className="inline ml-1.5 -mt-0.5" style={{ color: "#b45309" }} />}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">{c.dayScore}/5</td>
                            <td className="px-3 py-2.5 text-gray-600">{c.painScore !== null ? `${c.painScore}/10` : "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600">{c.mobilityScore !== null ? `${c.mobilityScore}/5` : "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600">{c.energyScore !== null ? `${c.energyScore}/5` : "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600">{c.moodScore !== null ? `${c.moodScore}/5` : "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600">{c.sleepScore !== null ? `${c.sleepScore}/5` : "—"}</td>
                            <td className="px-3 py-2.5 text-gray-500 italic max-w-[200px] truncate">{c.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <Button size="sm" variant="secondary" onClick={() => setCheckinHistoryOpen(false)}>Sluiten</Button>
                </div>
              </div>
            </Modal>
          )}

          {galleryOpen && (
            <Modal onClose={closeGallery} maxWidth={lightboxIndex !== null ? "max-w-2xl" : "max-w-3xl"}>
              {lightboxIndex !== null ? (
                (() => {
                  const item = photoHistory[lightboxIndex];
                  const url = item?.imagePath ? photoHistoryUrls.get(item.imagePath) ?? null : null;
                  return (
                    <div className="relative rounded-2xl overflow-hidden" style={{ background: "#ffffff" }}>
                      <button
                        type="button"
                        onClick={closeGallery}
                        aria-label="Sluiten"
                        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/60"
                        style={{ background: "rgba(0,0,0,0.45)" }}
                      >
                        <X size={18} color="#ffffff" />
                      </button>
                      {lightboxIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => setLightboxIndex((i) => (i !== null ? i - 1 : i))}
                          aria-label="Vorige foto"
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/60"
                          style={{ background: "rgba(0,0,0,0.45)" }}
                        >
                          <ChevronLeft size={18} color="#ffffff" />
                        </button>
                      )}
                      {lightboxIndex < photoHistory.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setLightboxIndex((i) => (i !== null ? i + 1 : i))}
                          aria-label="Volgende foto"
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/60"
                          style={{ background: "rgba(0,0,0,0.45)" }}
                        >
                          <ChevronRight size={18} color="#ffffff" />
                        </button>
                      )}
                      <div className="flex items-center justify-center" style={{ background: "#18181a" }}>
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="Voortgangsfoto" className="max-w-full max-h-[70vh] object-contain" />
                        ) : (
                          <div className="w-full h-64 flex items-center justify-center">
                            <Camera size={24} style={{ color: "#52525e" }} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-gray-800">
                          {item ? formatDate(item.date) : ""} <span className="text-xs font-normal text-subtle">({lightboxIndex + 1}/{photoHistory.length})</span>
                        </p>
                        {item?.note ? (
                          <p className="text-sm text-gray-600 mt-1.5">&ldquo;{item.note}&rdquo;</p>
                        ) : (
                          <p className="text-sm italic text-subtle mt-1.5">Geen opmerking</p>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
                  <h3 className="font-semibold text-gray-900 mb-4">Foto&apos;s</h3>
                  {galleryLoading ? (
                    <p className="text-sm text-subtle">Laden…</p>
                  ) : photoHistory.length === 0 ? (
                    <p className="text-sm text-subtle">Nog geen foto-updates.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {photoHistory.map((item, index) => {
                        const url = item.imagePath ? photoHistoryUrls.get(item.imagePath) ?? null : null;
                        return (
                          <button
                            key={`${item.date}-${index}`}
                            type="button"
                            onClick={() => setLightboxIndex(index)}
                            className="space-y-1 text-left"
                          >
                            <div className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "#f3f0eb" }}>
                              {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <Camera size={18} style={{ color: "#c4bfb9" }} />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{formatDateShort(item.date)}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-end mt-4">
                    <Button size="sm" variant="secondary" onClick={closeGallery}>Sluiten</Button>
                  </div>
                </div>
              )}
            </Modal>
          )}

          {confirmDeletePatient && (
            <ConfirmDialog
              title="Patiënt verwijderen?"
              message="Dit verwijdert het volledige patiëntdossier permanent. Deze actie kan niet ongedaan worden gemaakt."
              confirmLabel="Verwijderen"
              loading={deletingPatient}
              onCancel={() => setConfirmDeletePatient(false)}
              onConfirm={handleDeletePatient}
            />
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
              <input type="number" min={0} value={sets} onChange={(e) => setSets(e.target.value)} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={scheduleExerciseInputStyle} />
            </div>
            <div>
              <ScheduleExerciseFieldLabel>Herhalingen</ScheduleExerciseFieldLabel>
              <input type="number" min={0} value={reps} onChange={(e) => setReps(e.target.value)} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={scheduleExerciseInputStyle} />
            </div>
            <div>
              <ScheduleExerciseFieldLabel>Duur (sec)</ScheduleExerciseFieldLabel>
              <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={scheduleExerciseInputStyle} />
            </div>
          </div>
          <div>
            <ScheduleExerciseFieldLabel>Belasting (bijv. &quot;20 kg&quot; of &quot;lichaamsgewicht&quot;)</ScheduleExerciseFieldLabel>
            <input type="text" value={loadText} onChange={(e) => setLoadText(e.target.value)} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none min-h-11 sm:min-h-0" style={scheduleExerciseInputStyle} />
          </div>
          <div>
            <ScheduleExerciseFieldLabel>Opmerking voor deze patiënt (optioneel)</ScheduleExerciseFieldLabel>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full text-base sm:text-sm rounded-xl border px-3 py-2 focus:outline-none resize-none" style={scheduleExerciseInputStyle} />
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
