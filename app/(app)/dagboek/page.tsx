"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { type Appointment, type AppointmentType } from "@/lib/data";
import { getActivityForDate } from "@/lib/dailyActivity";
import { DayActivityDots } from "@/components/ui/Charts";
import { usePatientProtocol } from "@/lib/hooks/usePatientProtocol";
import { loadSessionLogsInRange, type ProtocolSessionLogSummary } from "@/lib/services/patientProtocolService";
import { useMergedContactpersonen } from "@/lib/hooks/useMergedContactpersonen";
import dynamic from "next/dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AppointmentModal = dynamic<any>(
  () => import("@/components/dagboek/AppointmentModal").then((m) => ({ default: m.AppointmentModal })),
  { ssr: false }
);
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, MapPin,
  Calendar, Pencil, Trash2, Stethoscope, Scan,
  Scissors, TrendingUp, Dumbbell, Pill, ArrowRight, CalendarPlus,
} from "lucide-react";
import { downloadAppointmentIcs } from "@/lib/ics";

// ─── Color system (afspraaktypes) ─────────────────────────────────────────────

interface ColorConfig {
  dot: string; bg: string; text: string; border: string; label: string; icon: React.ElementType;
}

const TYPE_COLORS: Record<AppointmentType, ColorConfig> = {
  ziekenhuis:      { dot: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", label: "Ziekenhuis",    icon: Calendar },
  fysio:           { dot: "#0d9488", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4", label: "Fysiotherapie", icon: Stethoscope },
  mri:             { dot: "#7c3aed", bg: "#faf5ff", text: "#6d28d9", border: "#e9d5ff", label: "Scan / MRI",    icon: Scan },
  operatie:        { dot: "#dc2626", bg: "#fef2f2", text: "#b91c1c", border: "#fecaca", label: "Operatie",      icon: Scissors },
  nacontrole:      { dot: "#d97706", bg: "#fffbeb", text: "#b45309", border: "#fde68a", label: "Nacontrole",    icon: Calendar },
  "second-opinion":{ dot: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", label: "Second opinion",icon: Calendar },
  telefonisch:     { dot: "#6b7280", bg: "#f9fafb", text: "#374151", border: "#e5e7eb", label: "Telefonisch",   icon: Calendar },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return fmtDate(new Date()); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

const DAYS_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const DAGSCORE_LABELS = ["", "Slecht", "Matig", "Redelijk", "Goed", "Uitstekend"];
const DAGSCORE_EMOJI  = ["", "😞", "😕", "😐", "🙂", "😊"];

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

// ─── Day chip (in calendar cell) ──────────────────────────────────────────────

function DayChip({ appointment }: { appointment: Appointment }) {
  const cfg = TYPE_COLORS[appointment.type];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate leading-tight"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }} title={appointment.title}>
      <Icon size={9} style={{ color: cfg.dot, flexShrink: 0 }} />
      <span className="truncate">{appointment.time} {appointment.title}</span>
    </div>
  );
}

// ─── Detail panel item ────────────────────────────────────────────────────────

function DetailItem({ appointment, onDelete, onEdit }: {
  appointment: Appointment;
  onDelete: (id: string) => void;
  onEdit: (a: Appointment) => void;
}) {
  const cfg = TYPE_COLORS[appointment.type];
  const Icon = cfg.icon;
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border transition-all" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.7)" }}>
        <Icon size={13} style={{ color: cfg.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cfg.text }}>{cfg.label}</span>
          {appointment.time && <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock size={9} /> {appointment.time}</span>}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {!confirmDel ? (
              <>
                <button onClick={() => onEdit(appointment)}
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
                <button onClick={() => { onDelete(appointment.id); setConfirmDel(false); }}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#fef2f2", color: "#ef4444" }}>Ja</button>
                <button onClick={() => setConfirmDel(false)}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#6b7280" }}>Nee</button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm font-medium text-gray-800 leading-snug">{appointment.title}</p>
        <div className="mt-1 space-y-0.5">
          {appointment.location && <p className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={10} /> {appointment.location}</p>}
          {appointment.behandelaar && <p className="text-xs text-gray-400">{appointment.behandelaar}</p>}
        </div>
        <button
          onClick={() => downloadAppointmentIcs(appointment)}
          className="flex items-center gap-1.5 text-xs font-medium mt-2 px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-white"
          style={{ borderColor: cfg.border, color: cfg.text, background: "rgba(255,255,255,0.5)" }}
        >
          <CalendarPlus size={12} /> Toevoegen aan agenda
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DagboekPage() {
  const {
    appointments, addAppointment, updateAppointment, deleteAppointment,
    checkIns, medicatie, dagboekWorkouts,
    hydrated,
  } = useAppData();
  const mergedContactpersonen = useMergedContactpersonen();
  const { patientId, hasActiveProtocol, protocol } = usePatientProtocol();

  const today = todayStr();
  const todayDate = new Date();
  const [viewYear, setViewYear]     = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth]   = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    typeof window !== "undefined" && window.innerWidth < 640 ? null : today
  );

  const [aptModal, setAptModal] = useState<{ open: boolean; date: string; editing?: Appointment }>({ open: false, date: today });
  const [protocolSessionLogs, setProtocolSessionLogs] = useState<ProtocolSessionLogSummary[]>([]);

  // Auto-open modal via URL query param (e.g. from dashboard snelle actie)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("modal") === "afspraak") setAptModal({ open: true, date: today });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grid = getMonthGrid(viewYear, viewMonth);
  const scheduleTitleById = new Map(protocol?.currentPhase?.schedules.map((s) => [s.id, s.title]) ?? []);

  // Gelogde protocol-sessies voor de zichtbare kalendermaand (incl. de padding-dagen van vorige/volgende maand).
  useEffect(() => {
    if (!hasActiveProtocol || !patientId || grid.length === 0) return;
    let cancelled = false;
    loadSessionLogsInRange(patientId, grid[0].date, grid[grid.length - 1].date).then((logs) => {
      if (!cancelled) setProtocolSessionLogs(logs);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveProtocol, patientId, viewYear, viewMonth]);

  const getAppointmentsForDate = useCallback((dateStr: string): Appointment[] => {
    return appointments.filter((a) => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments]);

  const getDayActivity = useCallback((dateStr: string) => {
    return getActivityForDate(dateStr, { checkIns, appointments, dagboekWorkouts, medicatie, protocolSessionLogs });
  }, [checkIns, appointments, dagboekWorkouts, medicatie, protocolSessionLogs]);

  const selectedAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];
  const selectedActivity = selectedDate ? getDayActivity(selectedDate) : null;

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }
  function goToday() { const n = new Date(); setViewYear(n.getFullYear()); setViewMonth(n.getMonth()); setSelectedDate(today); }

  function handleSaveAppointment(apt: Appointment) {
    if (aptModal.editing) updateAppointment(apt.id, apt);
    else addAppointment(apt);
    setAptModal({ open: false, date: today });
    setSelectedDate(apt.date);
  }

  if (!hydrated) return null;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">

      {/* ── Calendar area ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Title + month nav + action button */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 sm:pb-0 shrink-0">
          <p className="text-2xl font-bold text-gray-900 mb-4">Afspraken</p>

          <div className="flex items-center justify-between flex-wrap gap-3 pb-4">
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
            <button onClick={() => setAptModal({ open: true, date: selectedDate ?? today })}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: "#93c5fd", color: "#1d4ed8", background: "#eff6ff" }}>
              <Plus size={11} /> Afspraak
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
              const items = getAppointmentsForDate(cell.date);
              const isSelected = selectedDate === cell.date;
              const visibleItems = items.slice(0, 3);
              const overflow = items.length - visibleItems.length;
              const dayActivity = getDayActivity(cell.date);

              return (
                <div key={cell.date}
                  onClick={() => setSelectedDate(cell.date)}
                  className="border-r border-b cursor-pointer transition-colors min-h-[72px] sm:min-h-[90px] lg:min-h-[110px]"
                  style={{ borderColor: "#e8e5df", background: isSelected ? "#fff8f5" : cell.isToday ? "#fafaf9" : "#ffffff" }}>
                  <div className="p-1 sm:p-1.5 lg:p-2">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold mb-0.5 sm:mb-1"
                      style={{ background: cell.isToday ? "#e8632a" : "transparent", color: cell.isToday ? "#ffffff" : cell.isCurrentMonth ? "#1a1a1a" : "#c4bfb9" }}>
                      {cell.day}
                    </span>

                    {/* Chips — hidden on mobile to keep calendar clean */}
                    <div className="hidden sm:block space-y-0.5">
                      {visibleItems.map((a) => <DayChip key={a.id} appointment={a} />)}
                      {overflow > 0 && <div className="text-[10px] text-gray-400 pl-1">+{overflow} meer</div>}
                    </div>
                    {/* Mobile: just show dot indicators */}
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:hidden mt-0.5">
                        {items.slice(0, 3).map((a) => (
                          <span key={a.id} className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: TYPE_COLORS[a.type]?.dot ?? "#e8632a" }} />
                        ))}
                      </div>
                    )}

                    {/* Dag-dichtheid: check-in / training / medicatie, los van afspraken hierboven */}
                    <div className="mt-0.5">
                      <DayActivityDots
                        hasCheckIn={!!dayActivity.checkIn}
                        hasTraining={dayActivity.workouts.length > 0 || dayActivity.protocolSessions.length > 0}
                        hasMedicatie={dayActivity.medicatie.length > 0}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-6 pb-6 shrink-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {(Object.keys(TYPE_COLORS) as AppointmentType[]).map((key) => {
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
                  {selectedAppointments.length === 0 ? "Geen afspraken" : `${selectedAppointments.length} ${selectedAppointments.length === 1 ? "afspraak" : "afspraken"}`}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 lg:hidden shrink-0">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "#e8e5df" }}>
            {/* Afspraken — enige sectie die hier volledig beheerbaar is */}
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                <Calendar size={11} /> Afspraken
              </p>
              {selectedAppointments.length === 0 ? (
                <p className="text-xs text-gray-400">Geen afspraken op deze dag.</p>
              ) : (
                <div className="space-y-2">
                  {selectedAppointments.map((a) => (
                    <DetailItem key={a.id} appointment={a}
                      onEdit={(apt) => setAptModal({ open: true, date: apt.date, editing: apt })}
                      onDelete={(id) => deleteAppointment(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Check-in, Trainingen, Medicatie — alleen-lezen recap met doorklik naar de eigen beheerpagina */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <TrendingUp size={11} /> Check-in
                </p>
                <Link href="/check-in" className="flex items-center gap-1 text-[11px] font-medium shrink-0" style={{ color: "#e8632a" }}>
                  Bekijk <ArrowRight size={10} />
                </Link>
              </div>
              {selectedActivity?.checkIn ? (
                <div className="rounded-xl border p-3" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
                  <p className="text-sm font-medium text-gray-800">
                    <span className="mr-1.5">{DAGSCORE_EMOJI[selectedActivity.checkIn.dagscore]}</span>
                    Dagscore {selectedActivity.checkIn.dagscore}/5 · {DAGSCORE_LABELS[selectedActivity.checkIn.dagscore]}
                  </p>
                  {selectedActivity.checkIn.notitie && (
                    <p className="text-xs text-gray-500 mt-1">{selectedActivity.checkIn.notitie}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Geen check-in op deze dag.</p>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Dumbbell size={11} /> Trainingen
                </p>
                <Link href="/training" className="flex items-center gap-1 text-[11px] font-medium shrink-0" style={{ color: "#e8632a" }}>
                  Bekijk <ArrowRight size={10} />
                </Link>
              </div>
              {selectedActivity && (selectedActivity.workouts.length > 0 || selectedActivity.protocolSessions.length > 0) ? (
                <div className="space-y-1.5">
                  {selectedActivity.workouts.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: w.completed ? "#16a34a" : "#e8e5df" }}>
                        {w.completed && <Plus size={8} className="text-white rotate-45" strokeWidth={4} />}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{w.title}</span>
                      {!w.completed && <span className="text-[10px] text-gray-400 ml-auto shrink-0">Gepland</span>}
                    </div>
                  ))}
                  {selectedActivity.protocolSessions.map((s) => (
                    <div key={s.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#16a34a" }}>
                          <Plus size={8} className="text-white rotate-45" strokeWidth={4} />
                        </span>
                        <span className="text-sm text-gray-700 truncate">{scheduleTitleById.get(s.scheduleId) ?? "Sessie"}</span>
                      </div>
                      {s.reflection && <p className="text-xs text-gray-500 mt-1 pl-6">{s.reflection}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Geen training op deze dag.</p>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Pill size={11} /> Medicatie
                </p>
                <Link href="/medicatie" className="flex items-center gap-1 text-[11px] font-medium shrink-0" style={{ color: "#e8632a" }}>
                  Bekijk <ArrowRight size={10} />
                </Link>
              </div>
              {selectedActivity && selectedActivity.medicatie.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedActivity.medicatie.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
                      <Pill size={12} className="text-gray-400 shrink-0" />
                      <span className="text-gray-700 truncate">{m.naam}</span>
                      <span className="text-[11px] text-gray-400 ml-auto shrink-0">{m.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Geen medicatie geregistreerd op deze dag.</p>
              )}
            </div>
          </div>

          <div className="hidden sm:flex px-4 py-4 border-t shrink-0 gap-2" style={{ borderColor: "#e8e5df", background: "#ffffff" }}>
            <button onClick={() => setAptModal({ open: true, date: selectedDate })}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-colors"
              style={{ background: "#e8632a", color: "#ffffff" }}>
              <Plus size={12} /> Afspraak
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {aptModal.open && (
        <AppointmentModal initialDate={aptModal.date} initial={aptModal.editing}
          contactpersonen={mergedContactpersonen}
          onClose={() => setAptModal({ open: false, date: today })} onSave={handleSaveAppointment} />
      )}
    </div>
  );
}
