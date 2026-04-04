"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppData } from "@/lib/store";
import { type Doel, type Mijlpaal } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Target, Plus, Check, Pencil, Trash2, X,
  Star, Flag, Trophy, Zap, GripVertical,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(str: string): string {
  if (!str) return "";
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const ICON_OPTIONS = ["🏃", "🚴", "💪", "🏋️", "⚽", "🎯", "🧘", "🏊", "🚶", "🦵", "🏆", "✨"];
const FASE_OPTIONS = ["Fase 1 – Basis", "Fase 2 – Beweging", "Fase 3 – Kracht", "Fase 4 – Terugkeer"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && (
        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
          style={{ background: "#f3f0eb", color: "#a8a29e" }}>
          Optioneel
        </span>
      )}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none transition-colors"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm rounded-xl border px-4 py-2.5 resize-none focus:outline-none transition-colors"
      style={{ borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a" }}
    />
  );
}

// ─── Celebration toast ────────────────────────────────────────────────────────

const CELEBRATION_MESSAGES = [
  "Goed bezig! 💪",
  "Sterk, deze is behaald!",
  "Nice, weer een stap verder.",
  "Mooi werk!",
  "Je komt steeds dichter bij je doel.",
];

function CelebrationToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg"
      style={{
        transform: "translateX(-50%)",
        background: "#1c1c1e",
        color: "#ffffff",
        animation: "toastIn 0.25s ease",
        minWidth: "220px",
      }}
    >
      <span className="text-lg">🎉</span>
      <span className="text-sm font-medium">{message}</span>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Goal form modal ──────────────────────────────────────────────────────────

type GoalFormState = { icon: string; title: string; description: string; targetDate: string; behaaldOp?: string };

function GoalFormModal({
  initial,
  onSave,
  onClose,
  title: modalTitle,
}: {
  initial?: Partial<GoalFormState>;
  onSave: (data: GoalFormState) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState<GoalFormState>({
    icon: initial?.icon ?? "🎯",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    targetDate: initial?.targetDate ?? "",
    behaaldOp: initial?.behaaldOp,
  });
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof GoalFormState>(k: K, v: GoalFormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSave() {
    setSubmitted(true);
    if (!form.title.trim()) return;
    onSave(form);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", animation: "modalIn 0.18s ease" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{modalTitle}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <FieldLabel>Icoon</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button key={ic} type="button" onClick={() => set("icon", ic)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
                  style={{ background: form.icon === ic ? "#fff3ee" : "#f8f7f4", border: `1.5px solid ${form.icon === ic ? "#e8632a" : "#e8e5df"}` }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Titel *</FieldLabel>
            <TextInput value={form.title} onChange={(v) => set("title", v)} placeholder="Bijv. Terugkeren naar sport" />
            {submitted && !form.title.trim() && <p className="text-xs text-red-400 mt-1">Vul een titel in</p>}
          </div>

          <div>
            <FieldLabel optional>Omschrijving</FieldLabel>
            <Textarea value={form.description} onChange={(v) => set("description", v)} placeholder="Wat wil je precies bereiken?" />
          </div>

          <div>
            <FieldLabel optional>Streefdatum</FieldLabel>
            <DatePicker value={form.targetDate} onChange={(v) => set("targetDate", v)} placeholder="Kies een datum" />
          </div>

          {initial?.behaaldOp !== undefined && (
            <div>
              <FieldLabel optional>Behaald op</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker value={form.behaaldOp ?? ""} onChange={(v) => set("behaaldOp", v)} placeholder="Geen datum gekozen" />
                </div>
                {form.behaaldOp && (
                  <button
                    type="button"
                    onClick={() => set("behaaldOp", "")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
                    title="Datum verwijderen"
                  >
                    <X size={13} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
            <Button size="sm" onClick={handleSave}>Opslaan</Button>
          </div>
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

// ─── Mijlpaal form modal ──────────────────────────────────────────────────────

type MijlpaalFormState = { title: string; fase: string; reflectionText: string; completedAt: string };

function MijlpaalFormModal({
  initial,
  onSave,
  onClose,
  isNew,
}: {
  initial?: Partial<MijlpaalFormState>;
  onSave: (data: MijlpaalFormState) => void;
  onClose: () => void;
  isNew?: boolean;
}) {
  const [form, setForm] = useState<MijlpaalFormState>({
    title: initial?.title ?? "",
    fase: initial?.fase ?? FASE_OPTIONS[0],
    reflectionText: initial?.reflectionText ?? "",
    completedAt: initial?.completedAt ?? "",
  });
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof MijlpaalFormState>(k: K, v: MijlpaalFormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSave() {
    setSubmitted(true);
    if (!form.title.trim()) return;
    onSave(form);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", animation: "modalIn 0.18s ease" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{isNew ? "Nieuwe mijlpaal" : "Mijlpaal bewerken"}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <FieldLabel>Titel *</FieldLabel>
            <TextInput value={form.title} onChange={(v) => set("title", v)} placeholder="Bijv. 30 minuten lopen" />
            {submitted && !form.title.trim() && <p className="text-xs text-red-400 mt-1">Vul een titel in</p>}
          </div>

          <div>
            <FieldLabel>Fase</FieldLabel>
            <select
              value={form.fase}
              onChange={(e) => set("fase", e.target.value)}
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none appearance-none"
              style={{
                borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "36px",
              }}
            >
              {FASE_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {initial?.completedAt !== undefined && (
            <div>
              <FieldLabel optional>Voltooiingsdatum</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker value={form.completedAt} onChange={(v) => set("completedAt", v)} placeholder="Geen datum gekozen" />
                </div>
                {form.completedAt && (
                  <button
                    type="button"
                    onClick={() => set("completedAt", "")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
                    title="Datum verwijderen"
                  >
                    <X size={13} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <FieldLabel optional>Reflectie</FieldLabel>
            <Textarea value={form.reflectionText} onChange={(v) => set("reflectionText", v)} placeholder="Hoe voelde dit?" />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
            <Button size="sm" onClick={handleSave}>Opslaan</Button>
          </div>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ label, title: dlgTitle, onConfirm, onClose }: {
  label: string; title: string; onConfirm: () => void; onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
        <p className="text-sm font-semibold text-gray-900 mb-1">{dlgTitle}</p>
        <p className="text-sm text-gray-500 mb-5">
          Weet je zeker dat je <span className="font-medium text-gray-700">{label}</span> wilt verwijderen?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Verwijderen</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main goal card ───────────────────────────────────────────────────────────

function MainGoalCard({ doel, onToggle, onEdit }: { doel: Doel; onToggle: () => void; onEdit: () => void }) {
  const isDone = doel.completed;

  return (
    <div
      className="rounded-2xl p-5 transition-all"
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
          {doel.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Star size={11} style={{ color: "#e8632a" }} />
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#e8632a" }}>Hoofddoel</span>
              </div>
              <h2
                className="text-sm font-semibold leading-snug"
                style={{
                  color: isDone ? "rgba(134,239,172,0.9)" : "#f5f4f2",
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {doel.title}
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={onToggle}
                className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ml-1"
                style={{
                  borderColor: isDone ? "#22c55e" : "rgba(255,255,255,0.25)",
                  background: isDone ? "#22c55e" : "transparent",
                }}
              >
                {isDone && <Check size={13} className="text-white" strokeWidth={3} />}
              </button>
            </div>
          </div>

          {doel.description && (
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {doel.description}
            </p>
          )}

          {doel.targetDate && (
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Flag size={10} className="inline mr-1 mb-0.5" />
              Streefdatum: {formatDate(doel.targetDate)}
            </p>
          )}
          {isDone && doel.completedAt && (
            <p className="text-xs mt-1" style={{ color: "rgba(134,239,172,0.75)" }}>
              ✓ Behaald op {formatDate(doel.completedAt.slice(0, 10))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Regular goal card ────────────────────────────────────────────────────────

function GoalCard({ doel, onToggle, onEdit, onDelete, onPromote }: {
  doel: Doel; onToggle: () => void; onEdit: () => void; onDelete: () => void; onPromote: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all"
      style={{ background: doel.completed ? "#f9fafb" : "#ffffff", borderColor: "#e8e5df", opacity: doel.completed ? 0.75 : 1 }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
        style={{ background: doel.completed ? "#f3f4f6" : "#fff3ee" }}>
        {doel.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug"
              style={{ color: doel.completed ? "#9ca3af" : "#1a1a1a", textDecoration: doel.completed ? "line-through" : "none" }}>
              {doel.title}
            </p>
            {doel.description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{doel.description}</p>}
            {doel.targetDate && (
              <p className="text-[11px] mt-1" style={{ color: "#b5b0a8" }}>
                <Flag size={9} className="inline mr-0.5 mb-0.5" />{formatDate(doel.targetDate)}
              </p>
            )}
            {doel.completed && doel.completedAt && (
              <p className="text-[11px] mt-0.5" style={{ color: "#22c55e" }}>
                ✓ Behaald op {formatDate(doel.completedAt.slice(0, 10))}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 relative">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Pencil size={12} className="text-gray-400" />
            </button>
            <button onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 text-lg leading-none"
              style={{ paddingBottom: "2px" }}>
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 rounded-xl border overflow-hidden"
                style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", minWidth: "160px" }}>
                <button onClick={() => { onPromote(); setMenuOpen(false); }}
                  className="w-full text-left text-sm px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{ color: "#e8632a" }}>
                  <Star size={13} /> Maak hoofddoel
                </button>
                <button onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="w-full text-left text-sm px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-500">
                  <Trash2 size={13} /> Verwijderen
                </button>
              </div>
            )}
            <button onClick={onToggle}
              className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ml-1"
              style={{ borderColor: doel.completed ? "#22c55e" : "#d1d5db", background: doel.completed ? "#22c55e" : "transparent" }}>
              {doel.completed && <Check size={12} className="text-white" strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Milestone item ───────────────────────────────────────────────────────────

function MijlpaalItem({
  mijlpaal, isNext, onToggle, onUpdateReflection, onEdit, onDelete, isDragOver,
}: {
  mijlpaal: Mijlpaal; isNext: boolean;
  onToggle: () => void;
  onUpdateReflection: (text: string, score?: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragOver?: boolean;
}) {
  const [reflOpen, setReflOpen] = useState(false);
  const [reflText, setReflText] = useState(mijlpaal.reflectionText ?? "");
  const [reflScore, setReflScore] = useState<number | undefined>(mijlpaal.painScore);
  const [confirmDel, setConfirmDel] = useState(false);

  function saveReflection() {
    onUpdateReflection(reflText, reflScore);
    setReflOpen(false);
  }

  return (
    <div className="flex gap-3 py-3 transition-all" style={{ borderBottom: "1px solid #f5f3f0", borderTop: isDragOver ? "2px solid #e8632a" : "2px solid transparent" }}>
      <button onClick={onToggle}
        className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
        style={{ borderColor: mijlpaal.completed ? "#22c55e" : isNext ? "#e8632a" : "#d1d5db", background: mijlpaal.completed ? "#22c55e" : "transparent" }}>
        {mijlpaal.completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug flex-1"
            style={{ color: mijlpaal.completed ? "#9ca3af" : isNext ? "#1a1a1a" : "#374151", fontWeight: isNext && !mijlpaal.completed ? 600 : 400, textDecoration: mijlpaal.completed ? "line-through" : "none" }}>
            {mijlpaal.title}
            {isNext && !mijlpaal.completed && (
              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full align-middle"
                style={{ background: "#fff3ee", color: "#e8632a" }}>Volgende</span>
            )}
          </p>
          {/* Edit + delete actions */}
          <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
            <span className="w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing" title="Versleep om volgorde aan te passen">
              <GripVertical size={13} className="text-gray-200" />
            </span>
            <button onClick={onEdit} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Pencil size={11} className="text-gray-300 hover:text-gray-500" />
            </button>
            {confirmDel ? (
              <div className="flex items-center gap-1 ml-1">
                <button onClick={() => { onDelete(); setConfirmDel(false); }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md text-white"
                  style={{ background: "#ef4444" }}>Ja</button>
                <button onClick={() => setConfirmDel(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Nee</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <Trash2 size={11} className="text-gray-300 hover:text-red-400" />
              </button>
            )}
          </div>
        </div>

        {mijlpaal.completed && (
          <p className="text-[11px] mt-0.5" style={{ color: "#22c55e" }}>
            ✓ {formatDate(mijlpaal.completedAt ?? "")}
          </p>
        )}

        {mijlpaal.completed && (
          <button onClick={() => setReflOpen((v) => !v)}
            className="mt-1 text-[11px] font-medium transition-colors hover:opacity-70"
            style={{ color: "#9ca3af" }}>
            {reflOpen ? "Verberg reflectie" : mijlpaal.reflectionText ? "Reflectie bekijken" : "Reflectie toevoegen"}
          </button>
        )}

        {reflOpen && (
          <div className="mt-2 space-y-2 p-3 rounded-xl" style={{ background: "#faf9f7" }}>
            <p className="text-xs font-medium text-gray-500">Hoe voelde dit?</p>
            <Textarea value={reflText} onChange={setReflText} placeholder="Schrijf een korte reflectie..." rows={2} />
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Pijnniveau (optioneel)</p>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setReflScore(reflScore === n ? undefined : n)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                    style={{ background: reflScore === n ? "#e8632a" : "#f3f0eb", color: reflScore === n ? "#ffffff" : "#6b7280" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveReflection}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "#1c1c1e", color: "#ffffff" }}>Opslaan</button>
              <button onClick={() => setReflOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Annuleren</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase group ──────────────────────────────────────────────────────────────

function FaseGroep({
  fase, mijlpalen, firstIncompleteId, onToggle, onUpdateReflection, onEdit, onDelete, onReorder,
}: {
  fase: string; mijlpalen: Mijlpaal[]; firstIncompleteId: string | null;
  onToggle: (id: string) => void;
  onUpdateReflection: (id: string, text: string, score?: number) => void;
  onEdit: (m: Mijlpaal) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [localItems, setLocalItems] = useState<Mijlpaal[]>(mijlpalen);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragFromIdx = useRef<number | null>(null);

  // Sync local items when props change (external updates)
  useEffect(() => { setLocalItems(mijlpalen); }, [mijlpalen]);

  function handleDragStart(idx: number) { dragFromIdx.current = idx; }
  function handleDragEnter(idx: number) { setDragOverIdx(idx); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleDrop(toIdx: number) {
    const fromIdx = dragFromIdx.current;
    if (fromIdx === null || fromIdx === toIdx) { setDragOverIdx(null); return; }
    const next = [...localItems];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLocalItems(next);
    setDragOverIdx(null);
    dragFromIdx.current = null;
    onReorder(next.map((m) => m.id));
  }
  function handleDragEnd() { setDragOverIdx(null); dragFromIdx.current = null; }

  const completed = localItems.filter((m) => m.completed).length;
  const total = localItems.length;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#e8e5df" }}>
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: "#faf9f7", borderBottom: "1px solid #f0ede8" }}>
        <p className="text-sm font-semibold text-gray-800">{fase}</p>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#f0ede8" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%`, background: completed === total ? "#22c55e" : "#e8632a" }} />
          </div>
          <span className="text-xs" style={{ color: "#9ca3af" }}>{completed}/{total}</span>
        </div>
      </div>
      <div className="px-5 bg-white">
        {localItems.map((m, idx) => (
          <div
            key={m.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            style={{ opacity: dragFromIdx.current === idx ? 0.4 : 1, transition: "opacity 0.15s" }}
          >
            <MijlpaalItem
              mijlpaal={m}
              isNext={m.id === firstIncompleteId}
              isDragOver={dragOverIdx === idx && dragFromIdx.current !== idx}
              onToggle={() => onToggle(m.id)}
              onUpdateReflection={(text, score) => onUpdateReflection(m.id, text, score)}
              onEdit={() => onEdit(m)}
              onDelete={() => onDelete(m.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoelstellingenPage() {
  const {
    hydrated, doelen, addDoel, updateDoel, deleteDoel, promoteToMain,
    mijlpalen, addMijlpaal, updateMijlpaal, deleteMijlpaal, reorderMijlpalen,
  } = useAppData();

  const [toast, setToast] = useState<string | null>(null);
  const [mobileTabDoel, setMobileTabDoel] = useState<"doelstellingen" | "mijlpalen">("doelstellingen");
  const [goalModal, setGoalModal] = useState<{ mode: "add" } | { mode: "edit"; doel: Doel } | null>(null);
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<Doel | null>(null);
  const [mijlpaalModal, setMijlpaalModal] = useState<{ mode: "add" } | { mode: "edit"; mijlpaal: Mijlpaal } | null>(null);
  const [deleteMijlpaalTarget, setDeleteMijlpaalTarget] = useState<Mijlpaal | null>(null);

  const triggerToast = useCallback(() => {
    const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
    setToast(msg);
  }, []);

  const mainGoal = doelen.find((d) => d.type === "main") ?? null;
  const regularGoals = doelen.filter((d) => d.type === "regular");

  // ── Goal actions ──────────────────────────────────────────────────────────

  function handleSaveGoal(data: GoalFormState) {
    const now = new Date().toISOString();
    if (!goalModal) return;
    if (goalModal.mode === "add") {
      addDoel({ id: crypto.randomUUID(), type: "regular", icon: data.icon, title: data.title, description: data.description, targetDate: data.targetDate, completed: false, createdAt: now, updatedAt: now });
    } else {
      updateDoel(goalModal.doel.id, { icon: data.icon, title: data.title, description: data.description, targetDate: data.targetDate, completedAt: data.behaaldOp || undefined });
    }
    setGoalModal(null);
  }

  function handleToggleDoel(doel: Doel) {
    const nowIso = new Date().toISOString();
    if (!doel.completed) { updateDoel(doel.id, { completed: true, completedAt: nowIso }); triggerToast(); }
    else updateDoel(doel.id, { completed: false, completedAt: undefined });
  }

  // ── Milestone actions ─────────────────────────────────────────────────────

  function handleToggleMijlpaal(id: string) {
    const m = mijlpalen.find((x) => x.id === id);
    if (!m) return;
    if (!m.completed) { updateMijlpaal(id, { completed: true, completedAt: todayStr() }); triggerToast(); }
    else updateMijlpaal(id, { completed: false, completedAt: undefined });
  }

  function handleUpdateReflection(id: string, text: string, score?: number) {
    updateMijlpaal(id, { reflectionText: text, painScore: score });
  }

  function handleSaveMijlpaal(data: MijlpaalFormState) {
    const now = new Date().toISOString();
    if (!mijlpaalModal) return;
    if (mijlpaalModal.mode === "add") {
      addMijlpaal({ id: crypto.randomUUID(), fase: data.fase, title: data.title, completed: false, reflectionText: data.reflectionText || undefined, createdAt: now, updatedAt: now });
    } else {
      updateMijlpaal(mijlpaalModal.mijlpaal.id, {
        title: data.title,
        fase: data.fase,
        reflectionText: data.reflectionText || undefined,
        completedAt: data.completedAt || undefined,
        completed: data.completedAt ? mijlpaalModal.mijlpaal.completed : false,
      });
    }
    setMijlpaalModal(null);
  }

  // ── Milestone grouping ────────────────────────────────────────────────────

  const faseOrder = ["Fase 1 – Basis", "Fase 2 – Beweging", "Fase 3 – Kracht", "Fase 4 – Terugkeer"];
  const groupedMijlpalen = faseOrder.reduce<Record<string, Mijlpaal[]>>((acc, fase) => {
    acc[fase] = mijlpalen.filter((m) => m.fase === fase);
    return acc;
  }, {});

  const totalMijlpalen = mijlpalen.length;
  const completedMijlpalen = mijlpalen.filter((m) => m.completed).length;
  const firstIncompleteId = faseOrder.flatMap((f) => groupedMijlpalen[f]).find((m) => !m.completed)?.id ?? null;

  if (!hydrated) return null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Hoofddoelstelling — always visible */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Hoofddoelstelling</h2>
            <p className="text-xs text-gray-400 mt-0.5">Jouw belangrijkste herstelgoal</p>
          </div>
        </div>

        {mainGoal ? (
          <MainGoalCard
            doel={mainGoal}
            onToggle={() => handleToggleDoel(mainGoal)}
            onEdit={() => setGoalModal({ mode: "edit", doel: mainGoal })}
          />
        ) : (
          <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-10 gap-2"
            style={{ borderColor: "#e8e5df" }}>
            <Target size={24} style={{ color: "#d4cfc9" }} />
            <p className="text-sm text-gray-400">Nog geen hoofddoel ingesteld</p>
            <p className="text-xs text-gray-400">Voeg een doelstelling toe en maak het je hoofddoel</p>
          </div>
        )}
      </section>

      {/* Mobile tab switcher */}
      <div className="sm:hidden flex rounded-xl overflow-hidden mb-5" style={{ background: "#f3f0eb" }}>
        {(["doelstellingen", "mijlpalen"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTabDoel(tab)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              background: mobileTabDoel === tab ? "#ffffff" : "transparent",
              color: mobileTabDoel === tab ? "#1a1a1a" : "#9ca3af",
              borderRadius: "10px",
              margin: "3px",
              boxShadow: mobileTabDoel === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab === "doelstellingen" ? "Doelstellingen" : "Mijlpalen"}
          </button>
        ))}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── LEFT COLUMN: Doelstellingen ─────────────────────────────────────── */}
        <div className={`space-y-6 ${mobileTabDoel !== "doelstellingen" ? "hidden sm:block" : ""}`}>

          {/* Blok 2: Overige doelstellingen */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Overige doelstellingen</h2>
                <p className="text-xs text-gray-400 mt-0.5">{regularGoals.length} {regularGoals.length === 1 ? "doel" : "doelen"}</p>
              </div>
              <Button size="sm" onClick={() => setGoalModal({ mode: "add" })}>
                <Plus size={14} /> Nieuw doel
              </Button>
            </div>

            {regularGoals.length === 0 ? (
              <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-8 gap-2"
                style={{ borderColor: "#e8e5df" }}>
                <Zap size={20} style={{ color: "#d4cfc9" }} />
                <p className="text-sm text-gray-400">Voeg een eerste doelstelling toe</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {regularGoals.map((d) => (
                  <GoalCard
                    key={d.id}
                    doel={d}
                    onToggle={() => handleToggleDoel(d)}
                    onEdit={() => setGoalModal({ mode: "edit", doel: d })}
                    onDelete={() => setDeleteGoalTarget(d)}
                    onPromote={() => promoteToMain(d.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN: Mijlpalen ─────────────────────────────────────────── */}
        <div className={`space-y-4 ${mobileTabDoel !== "mijlpalen" ? "hidden sm:block" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Mijlpalen</h2>
              <p className="text-xs text-gray-400 mt-0.5">{completedMijlpalen} van {totalMijlpalen} behaald</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "#f0ede8" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${totalMijlpalen > 0 ? (completedMijlpalen / totalMijlpalen) * 100 : 0}%`, background: "#e8632a" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: "#e8632a" }}>
                  {totalMijlpalen > 0 ? Math.round((completedMijlpalen / totalMijlpalen) * 100) : 0}%
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setMijlpaalModal({ mode: "add" })}>
                <Plus size={13} />
              </Button>
            </div>
          </div>

          {completedMijlpalen === 0 && (
            <div className="rounded-2xl border px-4 py-3 flex items-center gap-2.5"
              style={{ background: "#fff3ee", borderColor: "#fde3d5" }}>
              <Trophy size={15} style={{ color: "#e8632a" }} />
              <p className="text-sm" style={{ color: "#e8632a" }}>Je eerste mijlpaal komt eraan — zet hem neer!</p>
            </div>
          )}

          <div className="space-y-3">
            {faseOrder.map((fase) => {
              const items = groupedMijlpalen[fase];
              if (!items || items.length === 0) return null;
              return (
                <FaseGroep
                  key={fase}
                  fase={fase}
                  mijlpalen={items}
                  firstIncompleteId={firstIncompleteId}
                  onToggle={handleToggleMijlpaal}
                  onUpdateReflection={handleUpdateReflection}
                  onEdit={(m) => setMijlpaalModal({ mode: "edit", mijlpaal: m })}
                  onDelete={(id) => setDeleteMijlpaalTarget(mijlpalen.find((m) => m.id === id) ?? null)}
                  onReorder={reorderMijlpalen}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {goalModal && (
        <GoalFormModal
          title={goalModal.mode === "add" ? "Nieuw doel toevoegen" : "Doel bewerken"}
          initial={goalModal.mode === "edit" ? {
            icon: goalModal.doel.icon,
            title: goalModal.doel.title,
            description: goalModal.doel.description ?? "",
            targetDate: goalModal.doel.targetDate ?? "",
            ...(goalModal.doel.completed ? { behaaldOp: goalModal.doel.completedAt?.slice(0, 10) ?? "" } : {}),
          } : undefined}
          onSave={handleSaveGoal}
          onClose={() => setGoalModal(null)}
        />
      )}

      {deleteGoalTarget && (
        <ConfirmDeleteModal
          title="Doelstelling verwijderen"
          label={deleteGoalTarget.title}
          onConfirm={() => { deleteDoel(deleteGoalTarget.id); setDeleteGoalTarget(null); }}
          onClose={() => setDeleteGoalTarget(null)}
        />
      )}

      {mijlpaalModal && (
        <MijlpaalFormModal
          isNew={mijlpaalModal.mode === "add"}
          initial={mijlpaalModal.mode === "edit" ? {
            title: mijlpaalModal.mijlpaal.title,
            fase: mijlpaalModal.mijlpaal.fase,
            reflectionText: mijlpaalModal.mijlpaal.reflectionText ?? "",
            completedAt: mijlpaalModal.mijlpaal.completedAt ?? "",
          } : undefined}
          onSave={handleSaveMijlpaal}
          onClose={() => setMijlpaalModal(null)}
        />
      )}

      {deleteMijlpaalTarget && (
        <ConfirmDeleteModal
          title="Mijlpaal verwijderen"
          label={deleteMijlpaalTarget.title}
          onConfirm={() => { deleteMijlpaal(deleteMijlpaalTarget.id); setDeleteMijlpaalTarget(null); }}
          onClose={() => setDeleteMijlpaalTarget(null)}
        />
      )}

      {toast && <CelebrationToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
