"use client";

import { useState } from "react";
import {
  Plus, X, ClipboardCheck, Dumbbell, Pill, Calendar, Check,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import type { DagboekWorkout, MedicatieLog, AppointmentType } from "@/lib/data";
import { CheckInModal } from "@/components/checkin/CheckInModal";
import { AppointmentModal } from "@/components/dagboek/AppointmentModal";
import { InnameModal, type InnameFormFields, todayStr, nowTimeStr } from "@/components/medicatie/InnameModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Sheet = "checkin" | "training" | "medicatie" | "afspraak";

// ─── Shared sheet primitives ──────────────────────────────────────────────────

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="lg:hidden fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.18s ease" }}
        onClick={onClose}
      />
      <div
        className="lg:hidden fixed left-0 right-0 bottom-0 z-[60] rounded-t-2xl flex flex-col"
        style={{
          background: "#ffffff",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.18)",
          animation: "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "88vh",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e0ddd8" }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid #f0ede8" }}
        >
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center touch-press"
            style={{ background: "#f3f0eb" }}
          >
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-5 space-y-4 bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium mb-1.5" style={{ color: "#6b7280" }}>
      {children}
    </label>
  );
}

function SheetInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full min-w-0 text-sm rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a", boxSizing: "border-box", maxWidth: "100%" }}
    />
  );
}

function SheetSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl border px-4 py-3 focus:outline-none appearance-none"
      style={{
        borderColor: "#e8e5df",
        background: "#f8f7f4",
        color: "#1a1a1a",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        paddingRight: "40px",
      }}
    >
      {children}
    </select>
  );
}

function SaveBtn({
  onClick,
  saved,
  children,
}: {
  onClick: () => void;
  saved: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all touch-press"
      style={{
        background: saved ? "#16a34a" : "#e8632a",
        color: "#ffffff",
        animation: saved ? "successPop 0.3s ease" : undefined,
        pointerEvents: saved ? "none" : undefined,
      }}
    >
      {saved ? (
        <>
          <Check size={16} strokeWidth={2.5} />
          Opgeslagen!
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── Training sheet ────────────────────────────────────────────────────────────

function TrainingSheet({
  onClose,
  addDagboekWorkout,
  trainingSchemas,
}: {
  onClose: () => void;
  addDagboekWorkout: (w: DagboekWorkout) => void;
  trainingSchemas: { id: string; title: string }[];
}) {
  const [schemaId, setSchemaId] = useState(trainingSchemas[0]?.id ?? "");
  const [vrij, setVrij] = useState("");
  const [date, setDate] = useState(todayStr());
  const [completed, setCompleted] = useState(true);
  const [saved, setSaved] = useState(false);

  function save() {
    const title = schemaId
      ? (trainingSchemas.find((s) => s.id === schemaId)?.title ?? "Training")
      : vrij.trim() || "Training";
    const now = new Date();
    addDagboekWorkout({
      id: crypto.randomUUID(),
      date,
      title,
      schemaId: schemaId || undefined,
      completed,
      completedAt: completed ? now.toISOString() : undefined,
      createdAt: now.toISOString(),
    });
    setSaved(true);
    setTimeout(onClose, 900);
  }

  return (
    <BottomSheet title="Training toevoegen" onClose={onClose}>
      {trainingSchemas.length > 0 && (
        <div>
          <FieldLabel>Trainingsschema</FieldLabel>
          <SheetSelect value={schemaId} onChange={setSchemaId}>
            <option value="">Vrije training (geen schema)</option>
            {trainingSchemas.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </SheetSelect>
        </div>
      )}

      {!schemaId && (
        <div>
          <FieldLabel>Naam training</FieldLabel>
          <SheetInput
            value={vrij}
            onChange={(e) => setVrij(e.target.value)}
            placeholder="Bijv. looptraining, fietsen..."
          />
        </div>
      )}

      {/* Date picker */}
      <div>
        <FieldLabel>Datum</FieldLabel>
        <SheetInput
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Completed toggle */}
      <button
        type="button"
        onClick={() => setCompleted((v) => !v)}
        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all touch-press"
        style={{
          background: completed ? "#f0fdf4" : "#f3f0eb",
          border: `2px solid ${completed ? "#86efac" : "#e8e5df"}`,
        }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
          style={{ background: completed ? "#16a34a" : "#d1d5db" }}
        >
          {completed && <Check size={12} color="#ffffff" strokeWidth={3} />}
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: completed ? "#15803d" : "#6b7280" }}
        >
          {completed ? "Training afgerond ✓" : "Training gepland (nog niet afgerond)"}
        </span>
      </button>

      <SaveBtn onClick={save} saved={saved}>
        Training opslaan
      </SaveBtn>
    </BottomSheet>
  );
}

// ─── Action config ─────────────────────────────────────────────────────────────

const ACTIONS = [
  { id: "checkin"   as const, label: "Check-in", icon: ClipboardCheck, color: "#e8632a", bg: "#fff3ee" },
  { id: "training"  as const, label: "Training",  icon: Dumbbell,      color: "#0ea5e9", bg: "#f0f9ff" },
  { id: "medicatie" as const, label: "Medicatie", icon: Pill,          color: "#8b5cf6", bg: "#f5f3ff" },
  { id: "afspraak"  as const, label: "Afspraak",  icon: Calendar,      color: "#3b82f6", bg: "#eff6ff" },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export function QuickActionFAB() {
  const [fabOpen, setFabOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<Sheet | null>(null);

  const {
    hydrated,
    checkIns,
    addCheckIn,
    updateCheckIn,
    addMedicatie,
    addDagboekWorkout,
    addAppointment,
    trainingSchemas,
    contactpersonen,
  } = useAppData();

  if (!hydrated) return null;

  const today = todayStr();
  const todayCheckIn = checkIns.find((c) => c.date === today);

  function openSheet(sheet: Sheet) {
    setFabOpen(false);
    setTimeout(() => setActiveSheet(sheet), 150);
  }

  function handleMedicatieSave(data: InnameFormFields) {
    const effectiefNaam =
      data.naam === "Anders" && data.naamAnders.trim()
        ? data.naamAnders.trim()
        : data.naam;
    const log: MedicatieLog = {
      id: crypto.randomUUID(),
      date: data.datum,
      time: data.tijdstip,
      naam: effectiefNaam,
      dosering: data.dosering.trim(),
      hoeveelheid: data.hoeveelheid.trim() || "—",
      reden: data.reden.trim(),
      notitie: data.notitie.trim() || undefined,
    };
    addMedicatie(log);
    setActiveSheet(null);
  }

  return (
    <>
      {/* FAB action buttons */}
      {fabOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.15s ease" }}
            onClick={() => setFabOpen(false)}
          />
          <div
            className="lg:hidden fixed z-50 flex flex-col-reverse gap-3"
            style={{
              bottom: `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 72px)`,
              right: "16px",
            }}
          >
            {ACTIONS.map((action, i) => {
              const Icon = action.icon;
              const label =
                action.id === "checkin" && todayCheckIn
                  ? "Check-in bijwerken"
                  : action.label;
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3"
                  style={{ animation: `fabActionIn 0.22s ease ${i * 45}ms both` }}
                >
                  <span
                    className="text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap"
                    style={{ background: "#ffffff", color: "#1a1a1a", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}
                  >
                    {label}
                  </span>
                  <button
                    onClick={() => openSheet(action.id)}
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 touch-press"
                    style={{
                      background: action.bg,
                      border: `1.5px solid ${action.color}30`,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    }}
                  >
                    <Icon size={20} style={{ color: action.color }} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Main FAB button */}
      <button
        onClick={() => setFabOpen((v) => !v)}
        className="lg:hidden fixed z-50 w-14 h-14 rounded-full flex items-center justify-center touch-press"
        style={{
          bottom: `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 12px)`,
          right: "16px",
          background: fabOpen ? "#1c1c1e" : "#e8632a",
          boxShadow: fabOpen
            ? "0 6px 24px rgba(0,0,0,0.25)"
            : "0 6px 24px rgba(232,99,42,0.45)",
          transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
          transition: "background 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease",
          animation: "fabIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        aria-label="Snelle acties"
      >
        <Plus size={24} color="#ffffff" strokeWidth={2.5} />
      </button>

      {/* ── Sheets ─────────────────────────────────────────────────── */}
      {activeSheet === "checkin" && (
        <CheckInModal
          existing={todayCheckIn}
          initialDate={today}
          onClose={() => setActiveSheet(null)}
          onSave={(ci) => {
            if (todayCheckIn) updateCheckIn(ci.id, ci);
            else addCheckIn(ci);
          }}
        />
      )}
      {activeSheet === "training" && (
        <TrainingSheet
          onClose={() => setActiveSheet(null)}
          addDagboekWorkout={addDagboekWorkout}
          trainingSchemas={trainingSchemas}
        />
      )}
      {activeSheet === "medicatie" && (
        <InnameModal
          onSave={handleMedicatieSave}
          onClose={() => setActiveSheet(null)}
          title="Medicatie loggen"
          saveLabel="Opslaan"
        />
      )}
      {activeSheet === "afspraak" && (
        <AppointmentModal
          initialDate={today}
          contactpersonen={contactpersonen}
          onClose={() => setActiveSheet(null)}
          onSave={(apt) => {
            addAppointment(apt);
            setActiveSheet(null);
          }}
        />
      )}
    </>
  );
}
