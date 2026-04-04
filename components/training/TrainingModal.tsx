"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { DagboekWorkout } from "@/lib/data";
import { DatePicker } from "@/components/ui/DatePicker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Form body (shared between desktop modal and mobile sheet) ────────────────

function TrainingFormBody({
  trainingSchemas,
  onSave,
  onCancel,
  title,
}: {
  trainingSchemas: { id: string; title: string }[];
  onSave: (w: DagboekWorkout) => void;
  onCancel: () => void;
  title: string;
}) {
  const [schemaId, setSchemaId] = useState(trainingSchemas[0]?.id ?? "");
  const [vrij, setVrij] = useState("");
  const [date, setDate] = useState(todayStr());
  const [completed, setCompleted] = useState(true);
  const [saved, setSaved] = useState(false);

  function save() {
    const workoutTitle = schemaId
      ? (trainingSchemas.find((s) => s.id === schemaId)?.title ?? "Training")
      : vrij.trim() || "Training";
    const now = new Date();
    onSave({
      id: crypto.randomUUID(),
      date,
      title: workoutTitle,
      schemaId: schemaId || undefined,
      completed,
      completedAt: completed ? now.toISOString() : undefined,
      createdAt: now.toISOString(),
    });
    setSaved(true);
    setTimeout(onCancel, 900);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#f0fdf4" }}>
          <Check size={22} style={{ color: "#22c55e" }} />
        </div>
        <p className="text-sm font-semibold text-gray-800">Training opgeslagen</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trainingSchemas.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Trainingsschema</label>
          <select
            value={schemaId}
            onChange={(e) => setSchemaId(e.target.value)}
            className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none appearance-none"
            style={{
              borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "40px",
            }}
          >
            <option value="">Vrije training (geen schema)</option>
            {trainingSchemas.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {!schemaId && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Naam training</label>
          <input
            type="text"
            value={vrij}
            onChange={(e) => setVrij(e.target.value)}
            placeholder="Bijv. looptraining, fietsen..."
            className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
            style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Datum</label>
        <DatePicker value={date} onChange={setDate} />
      </div>

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
        <span className="text-sm font-medium" style={{ color: completed ? "#15803d" : "#6b7280" }}>
          {completed ? "Training afgerond ✓" : "Training gepland (nog niet afgerond)"}
        </span>
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TrainingModal({
  trainingSchemas,
  onSave,
  onClose,
}: {
  trainingSchemas: { id: string; title: string }[];
  onSave: (w: DagboekWorkout) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Desktop: centered modal */}
      <div
        className="hidden sm:flex items-center justify-center h-full p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            animation: "modalIn 0.18s ease",
          }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f0ede8" }}>
            <p className="text-sm font-semibold text-gray-900">Training toevoegen</p>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <X size={15} className="text-gray-400" />
            </button>
          </div>
          <div className="p-6">
            <TrainingFormBody trainingSchemas={trainingSchemas} onSave={onSave} onCancel={onClose} title="Training toevoegen" />
          </div>
          <div className="flex gap-2 justify-end px-6 py-4 border-t" style={{ borderColor: "#f0ede8" }}>
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-xl border font-medium text-gray-600 hover:bg-gray-50"
              style={{ borderColor: "#e8e5df" }}>
              Annuleren
            </button>
            <button
              form="training-form"
              className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
              style={{ background: "#e8632a" }}
              onClick={() => {
                // inner save is handled by TrainingFormBody via onSave callback
              }}
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className="sm:hidden fixed left-0 right-0 bottom-0 rounded-t-2xl flex flex-col overflow-hidden"
        style={{
          background: "#ffffff",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.18)",
          animation: "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "92vh",
          paddingBottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e0ddd8" }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid #f0ede8" }}>
          <p className="text-base font-semibold text-gray-900">Training toevoegen</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center touch-press"
            style={{ background: "#f3f0eb" }}>
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-5">
          <TrainingFormBodyMobile trainingSchemas={trainingSchemas} onSave={onSave} onCancel={onClose} />
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Mobile-specific form body (with save button inline) ─────────────────────

function TrainingFormBodyMobile({
  trainingSchemas,
  onSave,
  onCancel,
}: {
  trainingSchemas: { id: string; title: string }[];
  onSave: (w: DagboekWorkout) => void;
  onCancel: () => void;
}) {
  const [schemaId, setSchemaId] = useState(trainingSchemas[0]?.id ?? "");
  const [vrij, setVrij] = useState("");
  const [date, setDate] = useState(todayStr());
  const [completed, setCompleted] = useState(true);
  const [saved, setSaved] = useState(false);

  function save() {
    const workoutTitle = schemaId
      ? (trainingSchemas.find((s) => s.id === schemaId)?.title ?? "Training")
      : vrij.trim() || "Training";
    const now = new Date();
    onSave({
      id: crypto.randomUUID(),
      date,
      title: workoutTitle,
      schemaId: schemaId || undefined,
      completed,
      completedAt: completed ? now.toISOString() : undefined,
      createdAt: now.toISOString(),
    });
    setSaved(true);
    setTimeout(onCancel, 900);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#f0fdf4" }}>
          <Check size={22} style={{ color: "#22c55e" }} />
        </div>
        <p className="text-sm font-semibold text-gray-800">Training opgeslagen</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trainingSchemas.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Trainingsschema</label>
          <select
            value={schemaId}
            onChange={(e) => setSchemaId(e.target.value)}
            className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none appearance-none"
            style={{
              borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "40px",
            }}
          >
            <option value="">Vrije training (geen schema)</option>
            {trainingSchemas.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {!schemaId && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Naam training</label>
          <input
            type="text"
            value={vrij}
            onChange={(e) => setVrij(e.target.value)}
            placeholder="Bijv. looptraining, fietsen..."
            className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none"
            style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Datum</label>
        <DatePicker value={date} onChange={setDate} />
      </div>

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
        <span className="text-sm font-medium" style={{ color: completed ? "#15803d" : "#6b7280" }}>
          {completed ? "Training afgerond ✓" : "Training gepland (nog niet afgerond)"}
        </span>
      </button>

      <button
        onClick={save}
        className="w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all touch-press"
        style={{ background: "#e8632a", color: "#ffffff" }}
      >
        Training opslaan
      </button>
    </div>
  );
}
