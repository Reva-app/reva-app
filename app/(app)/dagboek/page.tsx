"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppData } from "@/lib/store";
import {
  type Appointment,
  type AppointmentType,
  type CheckIn,
  type DagboekWorkout,
  type MedicatieLog,
  type TimelineEventType,
  appointmentTypeLabel,
  timelineTypeLabel,
} from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { CheckInModal } from "@/components/checkin/CheckInModal";
import { AppointmentModal } from "@/components/dagboek/AppointmentModal";
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Clock, MapPin,
  Dumbbell, Activity, Star, Target, Pill, AlertCircle, Trash2,
  Calendar, Zap, Pencil, AlertTriangle, Stethoscope, Scan,
  Scissors, FileText, ClipboardCheck, Trophy,
} from "lucide-react";

// ─── Blessure type lookup (mirrors Instellingen) ──────────────────────────────

const BLESSURE_TYPEN: Record<string, string> = {
  acl:       "Voorste kruisband (ACL) blessure",
  meniscus:  "Meniscus blessure",
  enkel:     "Enkelverstuiking",
  spier:     "Spierverrekking",
  hamstring: "Hamstring blessure",
  schouder:  "Schouderblessure",
  knieband:  "Knieband blessure",
  pees:      "Peesontsteking",
  rug:       "Rugblessure",
  achilles:  "Achillespees blessure",
  patella:   "Gescheurde kniepees",
  anders:    "Blessure",
};

function blessureLabel(type: string, anders: string): string {
  if (type === "anders" && anders) return anders;
  return BLESSURE_TYPEN[type] ?? type;
}

// ─── Color system ─────────────────────────────────────────────────────────────

type ColorKey =
  | "blessure" | "operatie_profiel" | "checkin" | "doel" | "mijlpaal"
  | "workout" | "ziekenhuis" | "fysio" | "mri" | "operatie_apt"
  | "nacontrole" | "second-opinion" | "telefonisch" | "medicatie";

interface ColorConfig {
  dot: string; bg: string; text: string; border: string; label: string; icon: React.ElementType;
}

const TYPE_COLORS: Record<ColorKey, ColorConfig> = {
  blessure:        { dot: "#ef4444", bg: "#fef2f2", text: "#dc2626", border: "#fecaca", label: "Blessure",      icon: AlertCircle },
  operatie_profiel:{ dot: "#8b5cf6", bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe", label: "Operatie",      icon: Zap },
  checkin:         { dot: "#e8632a", bg: "#fff7ed", text: "#ea580c", border: "#fed7aa", label: "Check-in",      icon: Activity },
  doel:            { dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "Doel",          icon: Target },
  mijlpaal:        { dot: "#22c55e", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "Mijlpaal",      icon: Star },
  workout:         { dot: "#0ea5e9", bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd", label: "Training",      icon: Dumbbell },
  ziekenhuis:      { dot: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", label: "Ziekenhuis",    icon: Calendar },
  fysio:           { dot: "#0d9488", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4", label: "Fysiotherapie", icon: Activity },
  mri:             { dot: "#7c3aed", bg: "#faf5ff", text: "#6d28d9", border: "#e9d5ff", label: "Scan / MRI",    icon: Calendar },
  operatie_apt:    { dot: "#dc2626", bg: "#fef2f2", text: "#b91c1c", border: "#fecaca", label: "Operatie",      icon: AlertCircle },
  nacontrole:      { dot: "#d97706", bg: "#fffbeb", text: "#b45309", border: "#fde68a", label: "Nacontrole",    icon: Calendar },
  "second-opinion":{ dot: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", label: "Second opinion",icon: Calendar },
  telefonisch:     { dot: "#6b7280", bg: "#f9fafb", text: "#374151", border: "#e5e7eb", label: "Telefonisch",   icon: Calendar },
  medicatie:       { dot: "#f59e0b", bg: "#fffbeb", text: "#b45309", border: "#fde68a", label: "Medicatie",     icon: Pill },
};

const TIMELINE_CONFIG: Record<TimelineEventType, { icon: React.ElementType; color: string; bg: string; badge: "danger" | "blue" | "purple" | "accent" | "muted" | "warning" | "success" | "default" }> = {
  blessure:  { icon: AlertTriangle,  color: "#ef4444", bg: "#fef2f2", badge: "danger" },
  consult:   { icon: Stethoscope,    color: "#3b82f6", bg: "#eff6ff", badge: "blue" },
  scan:      { icon: Scan,           color: "#8b5cf6", bg: "#f5f3ff", badge: "purple" },
  operatie:  { icon: Scissors,       color: "#e8632a", bg: "#fff3ee", badge: "accent" },
  fysio:     { icon: Dumbbell,       color: "#10b981", bg: "#f0fdf4", badge: "success" },
  document:  { icon: FileText,       color: "#6b7280", bg: "#f9fafb", badge: "muted" },
  checkin:   { icon: ClipboardCheck, color: "#3b82f6", bg: "#eff6ff", badge: "blue" },
  medicatie: { icon: Pill,           color: "#f59e0b", bg: "#fffbeb", badge: "warning" },
  training:  { icon: Activity,       color: "#10b981", bg: "#f0fdf4", badge: "success" },
  mijlpaal:  { icon: Trophy,         color: "#e8632a", bg: "#fff3ee", badge: "accent" },
};

function aptColorKey(type: AppointmentType): ColorKey {
  const map: Record<AppointmentType, ColorKey> = {
    ziekenhuis: "ziekenhuis", fysio: "fysio", mri: "mri", operatie: "operatie_apt",
    nacontrole: "nacontrole", "second-opinion": "second-opinion", telefonisch: "telefonisch",
  };
  return map[type];
}

// ─── Calendar item type ───────────────────────────────────────────────────────

type DagItemKind = "blessure" | "operatie_profiel" | "checkin" | "doel" | "mijlpaal" | "workout" | "appointment" | "medicatie";

interface DagItem {
  id: string;
  kind: DagItemKind;
  colorKey: ColorKey;
  title: string;
  time?: string;
  completed?: boolean;
  dagscore?: number;
  notitie?: string;
  rawAppointment?: Appointment;
  rawWorkout?: DagboekWorkout;
  rawMedicatie?: MedicatieLog[];
  rawCheckIn?: CheckIn;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function todayStr() { return fmtDate(new Date()); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtDayShort(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function fmtMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

const DAYS_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

interface CalendarDay { date: string; day: number; isCurrentMonth: boolean; isToday: boolean; }

function getMonthGrid(year: number, month: number): CalendarDay[] {
  const today = todayStr();
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: CalendarDay[] = [];
  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ date: fmtDate(new Date(year, month - 1, daysInPrev - i)), day: daysInPrev - i, isCurrentMonth: false, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = fmtDate(new Date(year, month, d));
    cells.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === today });
  }
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: fmtDate(new Date(year, month + 1, d)), day: d, isCurrentMonth: false, isToday: false });
  return cells;
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: "#f3f0eb", color: "#a8a29e" }}>Optioneel</span>}
    </label>
  );
}
function FormInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
    style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }} />;
}
function FormTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="w-full text-sm rounded-xl border px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
    style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }} />;
}
function FormSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl border px-3 py-2.5 focus:outline-none appearance-none"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "36px" }}>
      {children}
    </select>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "calc(100vh - 2rem)", animation: "modalIn 0.18s ease" }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Workout modal ────────────────────────────────────────────────────────────

function WorkoutModal({ initialDate, initial, activeSchemas, onClose, onSave }: {
  initialDate: string; initial?: DagboekWorkout; activeSchemas: { id: string; title: string }[];
  onClose: () => void; onSave: (w: DagboekWorkout) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? initialDate);
  const [schemaId, setSchemaId] = useState(initial?.schemaId ?? (activeSchemas[0]?.id ?? ""));
  const [submitted, setSubmitted] = useState(false);

  function handleSave() {
    setSubmitted(true);
    if (!date || !schemaId) return;
    onSave({ id: initial?.id ?? uid(), date, title: title.trim(), schemaId, completed: initial?.completed ?? false, completedAt: initial?.completedAt, reflection: initial?.reflection, createdAt: initial?.createdAt ?? new Date().toISOString() });
  }
  return (
    <ModalShell title={initial ? "Training bewerken" : "Training inplannen"} onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <FieldLabel>Schema *</FieldLabel>
          {activeSchemas.length === 0 ? (
            <div className="rounded-xl border px-3 py-3 text-xs text-gray-400 text-center" style={{ borderColor: "#e8e5df", background: "#f8f7f4" }}>
              Geen actieve schema's. Maak eerst een schema aan via Training &amp; Oefeningen.
            </div>
          ) : (
            <FormSelect value={schemaId} onChange={setSchemaId}>
              {activeSchemas.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </FormSelect>
          )}
          {submitted && !schemaId && <p className="text-xs text-red-400 mt-1">Kies een schema</p>}
        </div>
        <div>
          <FieldLabel optional>Extra omschrijving</FieldLabel>
          <FormInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. extra duur of aandachtspunt" />
        </div>
        <div>
          <FieldLabel>Datum *</FieldLabel>
          <DatePicker value={date} onChange={setDate} placeholder="Kies een datum" />
          {submitted && !date && <p className="text-xs text-red-400 mt-1">Kies een datum</p>}
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={handleSave} disabled={activeSchemas.length === 0}>Inplannen</Button>
      </div>
    </ModalShell>
  );
}

// ─── Workout complete modal ───────────────────────────────────────────────────

function WorkoutCompleteModal({ workout, onClose, onComplete }: {
  workout: DagboekWorkout; onClose: () => void; onComplete: (reflection: string) => void;
}) {
  const [reflection, setReflection] = useState(workout.reflection ?? "");
  const presets = ["Ging goed 💪", "Zwaar maar prima", "Rustig gehouden", "Meer pijn na afloop", "Beter dan verwacht"];
  return (
    <ModalShell title="Training afronden" onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e0f2fe" }}>
            <Dumbbell size={14} style={{ color: "#0369a1" }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{workout.title}</p>
            <p className="text-xs text-gray-400">{fmtDisplayDate(workout.date)}</p>
          </div>
        </div>
        <div>
          <FieldLabel optional>Hoe ging het? Voeg een korte reflectie toe</FieldLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {presets.map((p) => (
              <button key={p} type="button" onClick={() => setReflection(p)}
                className="text-xs px-2.5 py-1 rounded-full transition-all"
                style={{ background: reflection === p ? "#e8632a" : "#f3f0eb", color: reflection === p ? "#ffffff" : "#6b7280" }}>
                {p}
              </button>
            ))}
          </div>
          <FormTextarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={2} placeholder="Of schrijf zelf iets..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={() => onComplete(reflection)}><Check size={14} /> Afronden</Button>
      </div>
    </ModalShell>
  );
}

// ─── Day chip ─────────────────────────────────────────────────────────────────

function DayChip({ item }: { item: DagItem }) {
  const cfg = TYPE_COLORS[item.colorKey];
  const Icon = cfg.icon;
  // For check-in chips: show "Check-in" label only (score is shown in the badge)
  const displayTitle = item.kind === "checkin" ? "Check-in" : (item.time ? `${item.time} ${item.title}` : item.title);
  return (
    <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate leading-tight"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }} title={item.title}>
      <Icon size={9} style={{ color: cfg.dot, flexShrink: 0 }} />
      <span className="truncate">{displayTitle}</span>
    </div>
  );
}

// ─── Detail panel item ────────────────────────────────────────────────────────

function DetailItem({ item, onCompleteWorkout, onUncompleteWorkout, onDeleteWorkout, onEditWorkout, onDeleteAppointment, onEditAppointment, onEditCheckIn }: {
  item: DagItem;
  onCompleteWorkout?: (w: DagboekWorkout) => void;
  onUncompleteWorkout?: (id: string) => void;
  onDeleteWorkout?: (id: string) => void;
  onEditWorkout?: (w: DagboekWorkout) => void;
  onDeleteAppointment?: (id: string) => void;
  onEditAppointment?: (a: Appointment) => void;
  onEditCheckIn?: (ci: CheckIn) => void;
}) {
  const cfg = TYPE_COLORS[item.colorKey];
  const Icon = cfg.icon;
  const [confirmDel, setConfirmDel] = useState(false);
  const canEdit = item.kind === "appointment" || item.kind === "workout" || item.kind === "checkin";

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border transition-all" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.7)" }}>
        <Icon size={13} style={{ color: cfg.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cfg.text }}>{cfg.label}</span>
          {item.time && <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock size={9} /> {item.time}</span>}
          {canEdit && (
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {item.kind === "checkin" ? (
                <button onClick={() => { if (item.rawCheckIn) onEditCheckIn?.(item.rawCheckIn); }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/60 transition-colors" title="Bewerken">
                  <Pencil size={10} style={{ color: cfg.text, opacity: 0.6 }} />
                </button>
              ) : !confirmDel ? (
                <>
                  <button onClick={() => { if (item.kind === "workout" && item.rawWorkout) onEditWorkout?.(item.rawWorkout); if (item.kind === "appointment" && item.rawAppointment) onEditAppointment?.(item.rawAppointment); }}
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/60 transition-colors" title="Bewerken">
                    <Pencil size={10} style={{ color: cfg.text, opacity: 0.6 }} />
                  </button>
                  <button onClick={() => setConfirmDel(true)}
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/60 transition-colors" title="Verwijderen">
                    <Trash2 size={10} style={{ color: cfg.text, opacity: 0.6 }} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={() => { if (item.kind === "workout" && item.rawWorkout) onDeleteWorkout?.(item.rawWorkout.id); if (item.kind === "appointment" && item.rawAppointment) onDeleteAppointment?.(item.rawAppointment.id); setConfirmDel(false); }}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: "#ef4444" }}>Ja</button>
                  <button onClick={() => setConfirmDel(false)}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#6b7280" }}>Nee</button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-gray-800 leading-snug">{item.title}</p>

        {/* Check-in: show score dots in detail, NOT shown as text in chip */}
        {item.kind === "checkin" && item.dagscore !== undefined && (
          <div>
            <div className="flex items-center gap-1 mt-1.5">
              {[1,2,3,4,5].map((n) => (
                <div key={n} className="w-4 h-4 rounded-full" style={{ background: n <= item.dagscore! ? "#e8632a" : "#f3f0eb" }} />
              ))}
              <span className="text-xs text-gray-400 ml-1">{item.dagscore}/5</span>
            </div>
            {item.notitie && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{item.notitie}</p>
            )}
          </div>
        )}

        {/* Workout */}
        {item.kind === "workout" && item.rawWorkout && (
          <div className="mt-1.5">
            {item.rawWorkout.completed ? (
              <div>
                <button
                  onClick={() => onUncompleteWorkout?.(item.rawWorkout!.id)}
                  className="flex items-center gap-1.5 group/unc"
                  title="Klik om te markeren als niet afgerond"
                >
                  <div className="w-4 h-4 rounded-full flex items-center justify-center transition-colors" style={{ background: "#22c55e" }}>
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-xs transition-colors" style={{ color: "#15803d" }}>
                    Afgerond
                  </span>
                  <span className="text-[10px] font-medium opacity-0 group-hover/unc:opacity-100 transition-opacity" style={{ color: "#e8632a" }}>
                    — ongedaan maken
                  </span>
                </button>
                {item.rawWorkout.reflection && <p className="text-xs text-gray-500 mt-1 italic">"{item.rawWorkout.reflection}"</p>}
              </div>
            ) : (
              <button onClick={() => onCompleteWorkout?.(item.rawWorkout!)}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all mt-1"
                style={{ background: "#0ea5e9", color: "#ffffff" }}>
                <Check size={11} strokeWidth={3} /> Afronden
              </button>
            )}
          </div>
        )}

        {/* Appointment details */}
        {item.kind === "appointment" && item.rawAppointment && (
          <div className="mt-1 space-y-0.5">
            {item.rawAppointment.location && <p className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={10} /> {item.rawAppointment.location}</p>}
            {item.rawAppointment.behandelaar && <p className="text-xs text-gray-400">{item.rawAppointment.behandelaar}</p>}
          </div>
        )}

        {/* Medicatie details */}
        {item.kind === "medicatie" && item.rawMedicatie && item.rawMedicatie.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {item.rawMedicatie.map((m) => (
              <div key={m.id} className="flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(253,230,138,0.5)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">{m.naam}</span>
                    <span className="text-xs text-gray-500">{m.dosering}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "#fef3c7", color: "#92400e" }}>{m.hoeveelheid}</span>
                  </div>
                  {m.time && (
                    <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <Clock size={9} /> {m.time}
                    </p>
                  )}
                  {m.reden && <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{m.reden}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live timeline (grouped by day, newest first) ─────────────────────────────

interface LiveTimelineItem {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  time?: string;
}

function useLiveTimeline(profile: ReturnType<typeof useAppData>["profile"], appointments: Appointment[], checkIns: ReturnType<typeof useAppData>["checkIns"], medicatie: ReturnType<typeof useAppData>["medicatie"], dagboekWorkouts: DagboekWorkout[], mijlpalen: ReturnType<typeof useAppData>["mijlpalen"], trainingSchemas: ReturnType<typeof useAppData>["trainingSchemas"]) {
  return useMemo(() => {
    const items: LiveTimelineItem[] = [];

    // Blessure
    if (profile.blessureDatum)
      items.push({ id: "tl-blessure", date: profile.blessureDatum, type: "blessure", title: blessureLabel(profile.blessureType, profile.blessureTypeAnders), description: profile.situatieOmschrijving || undefined });

    // Operatie
    if (profile.operatieDatum)
      items.push({ id: "tl-operatie", date: profile.operatieDatum, type: "operatie", title: "Operatie" });

    // Appointments
    appointments.forEach((a) => {
      const type: TimelineEventType = a.type === "fysio" ? "fysio" : a.type === "mri" ? "scan" : a.type === "operatie" ? "operatie" : "consult";
      items.push({ id: `tl-apt-${a.id}`, date: a.date, type, title: a.title, description: a.behandelaar || undefined, time: a.time });
    });

    // Check-ins
    checkIns.forEach((ci) => {
      items.push({ id: `tl-ci-${ci.id}`, date: ci.date, type: "checkin", title: `Check-in — Dagscore ${ci.dagscore}/5`, description: ci.notitie || undefined });
    });

    // Medicatie (group by date, list unique names)
    const medByDate = medicatie.reduce<Record<string, string[]>>((acc, m) => {
      if (!acc[m.date]) acc[m.date] = [];
      if (!acc[m.date].includes(m.naam)) acc[m.date].push(m.naam);
      return acc;
    }, {});
    Object.entries(medByDate).forEach(([date, namen], idx) => {
      items.push({ id: `tl-med-${date}-${idx}`, date, type: "medicatie", title: `Medicatie: ${namen.join(", ")}` });
    });

    // Completed workouts
    dagboekWorkouts.filter((w) => w.completed).forEach((w) => {
      const schema = trainingSchemas.find((s) => s.id === w.schemaId);
      const title = schema ? schema.title + (w.title ? ` — ${w.title}` : "") : w.title;
      items.push({ id: `tl-workout-${w.id}`, date: w.date, type: "training", title, description: w.reflection || undefined });
    });

    // Completed milestones
    mijlpalen.filter((m) => m.completed && m.completedAt).forEach((m) => {
      items.push({ id: `tl-mijl-${m.id}`, date: m.completedAt!, type: "mijlpaal", title: m.title, description: m.reflectionText || undefined });
    });

    // Filter out future items — timeline only shows up to today
    const todayIso = fmtDate(new Date());
    const pastItems = items.filter((item) => item.date <= todayIso);

    // Sort newest first
    pastItems.sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? ""));

    // Group by date
    const groups: { date: string; items: LiveTimelineItem[] }[] = [];
    pastItems.forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last.date === item.date) last.items.push(item);
      else groups.push({ date: item.date, items: [item] });
    });

    return groups;
  }, [profile, appointments, checkIns, medicatie, dagboekWorkouts, mijlpalen, trainingSchemas]);
}

function LiveTimeline({ groups }: { groups: { date: string; items: LiveTimelineItem[] }[] }) {
  return (
    <div className="px-6 pb-10">
      {/* Prominent section divider */}
      <div className="border-t pt-8 mb-6" style={{ borderColor: "#e8e5df" }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fff3ee" }}>
            <Trophy size={15} style={{ color: "#e8632a" }} />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Mijlpalen &amp; Tijdlijn</p>
            <p className="text-xs text-gray-400">Chronologisch overzicht van jouw hersteltraject</p>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nog geen gebeurtenissen geregistreerd.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(({ date, items }) => (
            <div key={date}>
              {/* Day label */}
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 capitalize" style={{ color: "#b5b0a8" }}>
                {fmtDayShort(date)}
              </p>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "#e8e5df" }} />
                <div className="space-y-2">
                  {items.map((event) => {
                    const cfg = TIMELINE_CONFIG[event.type];
                    const Icon = cfg.icon;
                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className="relative z-10 shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white"
                            style={{ background: cfg.bg, boxShadow: "0 0 0 3px #f8f7f4" }}>
                            <Icon size={16} style={{ color: cfg.color }} />
                          </div>
                        </div>
                        <div className="flex-1 rounded-2xl border p-3.5 mb-1.5"
                          style={{ background: "#ffffff", borderColor: "#e8e5df" }}>
                          <div className="flex items-start justify-between gap-3 mb-0.5">
                            <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {event.time && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock size={9} />{event.time}</span>}
                              <Badge variant={cfg.badge}>{timelineTypeLabel(event.type)}</Badge>
                            </div>
                          </div>
                          {event.description && <p className="text-xs text-gray-500 leading-relaxed mt-1">{event.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const mon = new Date(now); mon.setDate(now.getDate() - dow);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return { start: fmt(mon), end: fmt(sun) };
}

function StatCards({ checkIns, appointments, dagboekWorkouts, mijlpalen, aantalFysio }: {
  checkIns: ReturnType<typeof useAppData>["checkIns"];
  appointments: Appointment[];
  dagboekWorkouts: DagboekWorkout[];
  mijlpalen: ReturnType<typeof useAppData>["mijlpalen"];
  aantalFysio: string;
}) {
  const { start: weekStart, end: weekEnd } = getWeekRange();

  // 1. Trainingen afgerond deze week
  const trainingenDezeWeek = dagboekWorkouts.filter(
    (w) => w.completed && w.date >= weekStart && w.date <= weekEnd
  ).length;

  // 2. Fysio behandelingen over
  const totaalFysio = Math.max(0, parseInt(aantalFysio, 10) || 0);
  const gebruiktFysio = appointments.filter((a) => a.type === "fysio").length;
  const fysioOver = Math.max(0, totaalFysio - gebruiktFysio);

  // 3. Gemiddelde check-in score deze week
  const weekCheckIns = checkIns.filter((c) => c.date >= weekStart && c.date <= weekEnd);
  const avgScore = weekCheckIns.length
    ? Math.round((weekCheckIns.reduce((s, c) => s + c.dagscore, 0) / weekCheckIns.length) * 10) / 10
    : null;

  // 4. Afgeronde mijlpalen totaal
  const afgerondeMijlpalen = mijlpalen.filter((m) => m.completed).length;

  const stats = [
    { value: trainingenDezeWeek, label: "Trainingen afgerond", sub: "deze week",        icon: Dumbbell,  color: "#0ea5e9", display: String(trainingenDezeWeek) },
    { value: fysioOver,          label: "Fysio behandelingen", sub: "nog beschikbaar",  icon: Activity,  color: "#10b981", display: String(fysioOver) },
    { value: avgScore ?? 0,      label: "Gem. check-in score", sub: "deze week",        icon: Star,      color: "#e8632a", display: avgScore !== null ? `${avgScore}/5` : "—" },
    { value: afgerondeMijlpalen, label: "Afgeronde mijlpalen", sub: "totaal behaald",   icon: Trophy,    color: "#f59e0b", display: String(afgerondeMijlpalen) },
  ];

  return (
    <div className="px-4 sm:px-6 pb-4 shrink-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border p-4"
              style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Mobile: icon left of value */}
              <div className="flex items-center gap-2.5 mb-1 sm:hidden">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}18` }}>
                  <Icon size={13} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.display}</p>
              </div>
              {/* Desktop: icon above value */}
              <div className="hidden sm:block">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                    <Icon size={13} style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.display}</p>
              </div>
              <p className="text-xs font-medium text-gray-600 mt-1">{s.label}</p>
              <p className="text-[11px] text-gray-400">{s.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DagboekPage() {
  const {
    profile, checkIns, addCheckIn, updateCheckIn,
    appointments, addAppointment, updateAppointment, deleteAppointment,
    medicatie,
    doelen, mijlpalen,
    dagboekWorkouts, addDagboekWorkout, updateDagboekWorkout, deleteDagboekWorkout,
    trainingSchemas,
    contactpersonen,
    hydrated,
  } = useAppData();

  const today = todayStr();
  const todayDate = new Date();
  const [viewYear, setViewYear]     = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth]   = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    typeof window !== "undefined" && window.innerWidth < 640 ? null : today
  );

  const [aptModal, setAptModal]         = useState<{ open: boolean; date: string; editing?: Appointment }>({ open: false, date: today });
  const [workoutModal, setWorkoutModal] = useState<{ open: boolean; date: string; editing?: DagboekWorkout }>({ open: false, date: today });
  const [completeModal, setCompleteModal] = useState<{ open: boolean; workout: DagboekWorkout | null }>({ open: false, workout: null });
  const [checkInModal, setCheckInModal] = useState<{ open: boolean; date: string; editing?: CheckIn }>({ open: false, date: today });

  const activeSchemas = trainingSchemas.filter((s) => s.status === "actief").map((s) => ({ id: s.id, title: s.title }));

  // Auto-open modal via URL query param (e.g. from dashboard snelle actie)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modal = params.get("modal");
    if (modal === "training") setWorkoutModal({ open: true, date: today });
    else if (modal === "afspraak") setAptModal({ open: true, date: today });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getItemsForDate = useCallback((dateStr: string): DagItem[] => {
    const items: DagItem[] = [];
    if (profile.blessureDatum === dateStr)
      items.push({ id: "blessure", kind: "blessure", colorKey: "blessure", title: blessureLabel(profile.blessureType, profile.blessureTypeAnders) });
    if (profile.operatieDatum && profile.operatieDatum === dateStr)
      items.push({ id: "operatie_profiel", kind: "operatie_profiel", colorKey: "operatie_profiel", title: "Operatie" });
    appointments.filter((a) => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time))
      .forEach((a) => items.push({ id: `apt-${a.id}`, kind: "appointment", colorKey: aptColorKey(a.type), title: a.title, time: a.time, rawAppointment: a }));
    doelen.filter((d) => d.targetDate === dateStr)
      .forEach((d) => items.push({ id: `doel-${d.id}`, kind: "doel", colorKey: "doel", title: `${d.icon} ${d.title}`, completed: d.completed }));
    mijlpalen.filter((m) => m.completedAt === dateStr)
      .forEach((m) => items.push({ id: `mijl-${m.id}`, kind: "mijlpaal", colorKey: "mijlpaal", title: m.title, completed: true }));
    dagboekWorkouts.filter((w) => w.date === dateStr).forEach((w) => {
      const schema = trainingSchemas.find((s) => s.id === w.schemaId);
      const displayTitle = schema ? schema.title + (w.title ? ` — ${w.title}` : "") : w.title;
      items.push({ id: `workout-${w.id}`, kind: "workout", colorKey: "workout", title: displayTitle, completed: w.completed, rawWorkout: w });
    });
    // Check-in: keep in list but title is "Check-in" only (score shown in badge)
    const ci = checkIns.find((c) => c.date === dateStr);
    if (ci) items.push({ id: `ci-${ci.id}`, kind: "checkin", colorKey: "checkin", title: "Check-in", dagscore: ci.dagscore, notitie: ci.notitie || undefined, rawCheckIn: ci });
    const medsOnDate = medicatie.filter((m) => m.date === dateStr);
    if (medsOnDate.length > 0) {
      const grouped = medsOnDate.reduce<Record<string, number>>((acc, m) => { acc[m.naam] = (acc[m.naam] || 0) + 1; return acc; }, {});
      items.push({ id: `med-${dateStr}`, kind: "medicatie", colorKey: "medicatie", title: Object.entries(grouped).map(([n, c]) => c > 1 ? `${n} ×${c}` : n).join(", "), rawMedicatie: medsOnDate });
    }
    return items;
  }, [profile, appointments, doelen, mijlpalen, dagboekWorkouts, checkIns, medicatie, trainingSchemas]);

  const grid = getMonthGrid(viewYear, viewMonth);
  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];
  const timelineGroups = useLiveTimeline(profile, appointments, checkIns, medicatie, dagboekWorkouts, mijlpalen, trainingSchemas);

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }
  function goToday() { const n = new Date(); setViewYear(n.getFullYear()); setViewMonth(n.getMonth()); setSelectedDate(today); }

  function handleSaveAppointment(apt: Appointment) {
    if (aptModal.editing) updateAppointment(apt.id, apt);
    else addAppointment(apt);
    setAptModal({ open: false, date: today });
    setSelectedDate(apt.date);
  }
  function handleSaveWorkout(w: DagboekWorkout) { if (workoutModal.editing) updateDagboekWorkout(w.id, w); else addDagboekWorkout(w); setWorkoutModal({ open: false, date: today }); setSelectedDate(w.date); }
  function handleCompleteWorkout(reflection: string) { if (!completeModal.workout) return; updateDagboekWorkout(completeModal.workout.id, { completed: true, completedAt: new Date().toISOString(), reflection }); setCompleteModal({ open: false, workout: null }); }
  function handleSaveCheckIn(ci: CheckIn) {
    if (checkInModal.editing) updateCheckIn(ci.id, ci);
    else addCheckIn(ci);
    setCheckInModal({ open: false, date: today });
    setSelectedDate(ci.date);
  }

  if (!hydrated) return null;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">

      {/* ── Calendar area ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Title */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 sm:pb-0 shrink-0">
          <p className="text-2xl font-bold text-gray-900 mb-4">Dagboek</p>

          {/* Month nav + action buttons — desktop only here, mobile gets it below stat cards */}
          <div className="hidden sm:flex items-center justify-between flex-wrap gap-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={15} className="text-gray-500" />
                </button>
                <h2 className="text-base font-semibold text-gray-700 min-w-[160px] text-center capitalize">
                  {fmtMonthYear(viewYear, viewMonth)}
                </h2>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <ChevronRight size={15} className="text-gray-500" />
                </button>
              </div>
              <button onClick={goToday}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "#e8632a", color: "#ffffff" }}>
                Vandaag
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setAptModal({ open: true, date: selectedDate ?? today })}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: "#93c5fd", color: "#1d4ed8", background: "#eff6ff" }}>
                <Plus size={11} /> Afspraak
              </button>
              <button onClick={() => setWorkoutModal({ open: true, date: selectedDate ?? today })}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" }}>
                <Plus size={11} /> Training
              </button>
              <button onClick={() => setCheckInModal({ open: true, date: selectedDate ?? today })}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }}>
                <Plus size={11} /> Check-in
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <StatCards checkIns={checkIns} appointments={appointments} dagboekWorkouts={dagboekWorkouts} mijlpalen={mijlpalen} aantalFysio={profile.aantalFysio} />

        {/* Month nav — mobile only, directly above calendar */}
        <div className="sm:hidden px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronLeft size={15} className="text-gray-500" />
              </button>
              <h2 className="text-base font-semibold text-gray-700 min-w-[160px] text-center capitalize">
                {fmtMonthYear(viewYear, viewMonth)}
              </h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronRight size={15} className="text-gray-500" />
              </button>
            </div>
            <button onClick={goToday}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "#e8632a", color: "#ffffff" }}>
              Vandaag
            </button>
          </div>
        </div>

        {/* Day-of-week header */}
        <div className="px-4 sm:px-6 shrink-0">
          <div className="grid grid-cols-7 border-t border-l" style={{ borderColor: "#e8e5df" }}>
            {DAYS_NL.map((d) => (
              <div key={d} className="py-1.5 text-center border-r border-b text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ borderColor: "#e8e5df" }}>{d}</div>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="px-4 sm:px-6 pb-4 shrink-0">
          <div className="grid grid-cols-7 border-l" style={{ borderColor: "#e8e5df" }}>
            {grid.map((cell) => {
              const items = getItemsForDate(cell.date);
              const isSelected = selectedDate === cell.date;
              const visibleItems = items.filter((i) => i.kind !== "checkin").slice(0, 3);
              const overflow = items.filter((i) => i.kind !== "checkin").length - 3;
              const ci = checkIns.find((c) => c.date === cell.date);

              return (
                <div key={cell.date}
                  onClick={() => setSelectedDate(cell.date)}
                  className="border-r border-b cursor-pointer transition-colors min-h-[72px] sm:min-h-[90px] lg:min-h-[110px]"
                  style={{ borderColor: "#e8e5df", background: isSelected ? "#fff8f5" : cell.isToday ? "#fafaf9" : "#ffffff" }}>
                  <div className="p-1 sm:p-1.5 lg:p-2">
                    {/* Day number + check-in badge */}
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold"
                        style={{ background: cell.isToday ? "#e8632a" : "transparent", color: cell.isToday ? "#ffffff" : cell.isCurrentMonth ? "#1a1a1a" : "#c4bfb9" }}>
                        {cell.day}
                      </span>
                      {/* Score badge with icon */}
                      {ci && (
                        <div className="flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold shrink-0"
                          style={{ background: "#fff3ee", color: "#e8632a", border: "1px solid #fed7aa" }}
                          title={`Dagscore: ${ci.dagscore}/5`}>
                          <Activity size={7} style={{ color: "#e8632a" }} />
                          {ci.dagscore}
                        </div>
                      )}
                    </div>

                    {/* Chips — hidden on mobile to keep calendar clean */}
                    <div className="hidden sm:block space-y-0.5">
                      {visibleItems.map((item) => <DayChip key={item.id} item={item} />)}
                      {overflow > 0 && <div className="text-[10px] text-gray-400 pl-1">+{overflow} meer</div>}
                    </div>
                    {/* Mobile: just show dot indicators */}
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:hidden mt-0.5">
                        {items.filter(i => i.kind !== "checkin").slice(0, 3).map((item) => (
                          <span key={item.id} className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: TYPE_COLORS[item.colorKey]?.dot ?? "#e8632a" }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-6 pb-4 shrink-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {(["blessure", "operatie_profiel", "ziekenhuis", "fysio", "checkin", "workout", "doel", "mijlpaal", "medicatie"] as ColorKey[]).map((key) => {
              const cfg = TYPE_COLORS[key];
              const Icon = cfg.icon;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <Icon size={10} style={{ color: cfg.dot }} />
                  <span className="text-[11px] text-gray-400">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live timeline — per day, newest first */}
        <LiveTimeline groups={timelineGroups} />
      </div>

      {/* ── Day detail panel ─────────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l overflow-hidden"
          style={{ borderColor: "#e8e5df", background: "#faf9f7" }}>
          <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 capitalize">{fmtDisplayDate(selectedDate)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedItems.length === 0 ? "Geen activiteit" : `${selectedItems.length} ${selectedItems.length === 1 ? "item" : "items"}`}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 lg:hidden shrink-0">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#f0ede8" }}>
                  <Calendar size={16} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">Niets gepland</p>
                <p className="text-xs text-gray-300 mt-1">Voeg een afspraak of training toe</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {selectedItems.map((item) => (
                  <DetailItem key={item.id} item={item}
                    onCompleteWorkout={(w) => setCompleteModal({ open: true, workout: w })}
                    onUncompleteWorkout={(id) => updateDagboekWorkout(id, { completed: false, completedAt: undefined, reflection: undefined })}
                    onDeleteWorkout={(id) => deleteDagboekWorkout(id)}
                    onEditWorkout={(w) => setWorkoutModal({ open: true, date: w.date, editing: w })}
                    onEditAppointment={(a) => setAptModal({ open: true, date: a.date, editing: a })}
                    onDeleteAppointment={(id) => { deleteAppointment(id); }}
                    onEditCheckIn={(ci) => setCheckInModal({ open: true, date: ci.date, editing: ci })}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:flex px-4 py-4 border-t shrink-0 gap-2" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
            <button onClick={() => setAptModal({ open: true, date: selectedDate })}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#e8e5df", color: "#374151" }}>
              <Plus size={12} /> Afspraak
            </button>
            <button onClick={() => setWorkoutModal({ open: true, date: selectedDate })}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-colors"
              style={{ background: "#e8632a", color: "#ffffff" }}>
              <Dumbbell size={12} /> Training
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {aptModal.open && (
        <AppointmentModal initialDate={aptModal.date} initial={aptModal.editing}
          contactpersonen={contactpersonen}
          onClose={() => setAptModal({ open: false, date: today })} onSave={handleSaveAppointment} />
      )}
      {workoutModal.open && (
        <WorkoutModal initialDate={workoutModal.date} initial={workoutModal.editing} activeSchemas={activeSchemas}
          onClose={() => setWorkoutModal({ open: false, date: today })} onSave={handleSaveWorkout} />
      )}
      {completeModal.open && completeModal.workout && (
        <WorkoutCompleteModal workout={completeModal.workout}
          onClose={() => setCompleteModal({ open: false, workout: null })} onComplete={handleCompleteWorkout} />
      )}
      {checkInModal.open && (
        <CheckInModal
          initialDate={checkInModal.date}
          existing={checkInModal.editing}
          onClose={() => setCheckInModal({ open: false, date: today })}
          onSave={handleSaveCheckIn}
        />
      )}
    </div>
  );
}
