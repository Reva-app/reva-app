"use client";

import { useState, useEffect } from "react";
import { useAppData } from "@/lib/store";
import {
  type TrainingOefening,
  type TrainingSchema,
  type TrainingOefeningType,
  type TrainingLocatie,
  type TrainingSchemaStatus,
} from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp,
  Dumbbell, Activity, Zap, Move, Minus, HelpCircle, Clock,
  LayoutList, BookOpen,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const OEFENING_TYPES: TrainingOefeningType[] = ["Kracht", "Conditie", "Mobiliteit", "Stabiliteit", "Rekken", "Anders"];
const LOCATIES: TrainingLocatie[] = ["Thuis", "Gym", "Fysio", "Buiten", "Anders"];
const DUUR_OPTIONS = ["10 minuten", "15 minuten", "20 minuten", "30 minuten", "45 minuten", "1 uur", "1,5 uur"];

// Internal values map to display labels — ensures capitalized display everywhere
const STATUS_OPTIONS: { value: TrainingSchemaStatus; label: string }[] = [
  { value: "actief",   label: "Actief" },
  { value: "gepland",  label: "Gepland" },
  { value: "afgerond", label: "Afgerond" },
];

const TYPE_ICONS: Record<TrainingOefeningType, React.ElementType> = {
  Kracht: Dumbbell,
  Conditie: Activity,
  Mobiliteit: Zap,
  Stabiliteit: Move,
  Rekken: Minus,
  Anders: HelpCircle,
};

const STATUS_CONFIG: Record<TrainingSchemaStatus, { label: string; badge: "success" | "warning" | "muted"; color: string }> = {
  actief:   { label: "Actief",   badge: "success", color: "#16a34a" },
  gepland:  { label: "Gepland",  badge: "warning", color: "#d97706" },
  afgerond: { label: "Afgerond", badge: "muted",   color: "#9ca3af" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Get the Monday of the current week
function getWeekDays(): { date: string; label: string }[] {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const labels = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: dateStr, label };
  });
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
      {children}
      {optional && (
        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
          style={{ background: "#f3f0eb", color: "#a8a29e" }}>Optioneel</span>
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

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none appearance-none"
      style={{
        borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "36px",
      }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextareaInput({ value, onChange, placeholder, rows = 2 }: {
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

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
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
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#ffffff",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          animation: "modalIn 0.18s ease",
          maxHeight: "calc(100vh - 2rem)",
        }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0"
          style={{ borderColor: "#f0ede8" }}>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Oefening form modal ──────────────────────────────────────────────────────

type OefeningFormState = Omit<TrainingOefening, "id" | "createdAt" | "updatedAt">;

const EMPTY_OEFENING: OefeningFormState = {
  title: "", type: "Kracht", description: "",
  repetitions: "", loadOrTime: "", location: "Thuis", note: "",
};

function OefeningFormModal({
  initial, onSave, onClose,
}: {
  initial?: TrainingOefening;
  onSave: (data: OefeningFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<OefeningFormState>(
    initial ? {
      title: initial.title, type: initial.type, description: initial.description,
      repetitions: initial.repetitions, loadOrTime: initial.loadOrTime,
      location: initial.location, note: initial.note,
    } : EMPTY_OEFENING
  );
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof OefeningFormState>(k: K, v: OefeningFormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSave() {
    setSubmitted(true);
    if (!form.title.trim()) return;
    onSave(form);
  }

  return (
    <ModalShell title={initial ? "Oefening bewerken" : "Oefening toevoegen"} onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <FieldLabel>Titel *</FieldLabel>
          <TextInput value={form.title} onChange={(v) => set("title", v)} placeholder="Bijv. Mini squat" />
          {submitted && !form.title.trim() && <p className="text-xs text-red-400 mt-1">Vul een titel in</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Type</FieldLabel>
            <SelectInput value={form.type} onChange={(v) => set("type", v as TrainingOefeningType)} options={OEFENING_TYPES} />
          </div>
          <div>
            <FieldLabel>Locatie</FieldLabel>
            <SelectInput value={form.location} onChange={(v) => set("location", v as TrainingLocatie)} options={LOCATIES} />
          </div>
        </div>

        <div>
          <FieldLabel optional>Omschrijving</FieldLabel>
          <TextareaInput value={form.description} onChange={(v) => set("description", v)}
            placeholder="Beschrijf de uitvoering van de oefening" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel optional>Herhalingen</FieldLabel>
            <TextInput value={form.repetitions} onChange={(v) => set("repetitions", v)} placeholder="Bijv. 3×15 herh." />
          </div>
          <div>
            <FieldLabel optional>Gewicht / tijd</FieldLabel>
            <TextInput value={form.loadOrTime} onChange={(v) => set("loadOrTime", v)} placeholder="Bijv. 10 kg" />
          </div>
        </div>

        <div>
          <FieldLabel optional>Opmerking</FieldLabel>
          <TextareaInput value={form.note} onChange={(v) => set("note", v)}
            placeholder="Extra aandachtspunten van de fysio" />
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={handleSave}>Opslaan</Button>
      </div>
    </ModalShell>
  );
}

// ─── Schema form modal ────────────────────────────────────────────────────────

type SchemaFormState = {
  title: string;
  status: TrainingSchemaStatus;
  duration: string;
  exerciseIds: string[];
};

function SchemaFormModal({
  initial, oefeningen, onSave, onClose,
}: {
  initial?: TrainingSchema;
  oefeningen: TrainingOefening[];
  onSave: (data: SchemaFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SchemaFormState>({
    title: initial?.title ?? "",
    status: initial?.status ?? "actief",
    duration: initial?.duration ?? "30 minuten",
    exerciseIds: initial?.exerciseIds ?? [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TrainingOefeningType | "Alles">("Alles");

  const TYPE_FILTER_OPTIONS: (TrainingOefeningType | "Alles")[] = ["Alles", ...OEFENING_TYPES];

  const filteredOefeningen = typeFilter === "Alles"
    ? oefeningen
    : oefeningen.filter((o) => o.type === typeFilter);

  function set<K extends keyof SchemaFormState>(k: K, v: SchemaFormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleExercise(id: string) {
    setForm((p) => ({
      ...p,
      exerciseIds: p.exerciseIds.includes(id)
        ? p.exerciseIds.filter((x) => x !== id)
        : [...p.exerciseIds, id],
    }));
  }

  function handleSave() {
    setSubmitted(true);
    if (!form.title.trim()) return;
    onSave(form);
  }

  return (
    <ModalShell title={initial ? "Schema bewerken" : "Schema toevoegen"} onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <FieldLabel>Naam *</FieldLabel>
          <TextInput value={form.title} onChange={(v) => set("title", v)} placeholder="Bijv. Dagelijks schema — Fase 2" />
          {submitted && !form.title.trim() && <p className="text-xs text-red-400 mt-1">Vul een naam in</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Status</FieldLabel>
            {/* Custom select to show capitalized labels while storing lowercase values */}
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as TrainingSchemaStatus)}
              className="w-full text-sm rounded-xl border px-4 py-2.5 focus:outline-none appearance-none"
              style={{
                borderColor: "#e8e5df", background: "#f8f7f4", color: "#1a1a1a",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2020/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "36px",
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Duur</FieldLabel>
            <SelectInput value={form.duration} onChange={(v) => set("duration", v)} options={DUUR_OPTIONS} />
          </div>
        </div>

        <div>
          <FieldLabel optional>Oefeningen koppelen</FieldLabel>
          {oefeningen.length === 0 ? (
            <div className="rounded-xl border px-4 py-6 text-center"
              style={{ borderColor: "#e8e5df", background: "#f8f7f4" }}>
              <p className="text-xs text-gray-400">Nog geen oefeningen in je database.</p>
              <p className="text-xs text-gray-400 mt-1">Voeg eerst een oefening toe via "Oefening toevoegen".</p>
            </div>
          ) : (
            <>
              {/* Type filter chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TYPE_FILTER_OPTIONS.map((t) => {
                  const isActive = typeFilter === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: isActive ? "#e8632a" : "#f3f0eb",
                        color: isActive ? "#ffffff" : "#6b7280",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e8e5df" }}>
                {filteredOefeningen.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs text-gray-400">Geen oefeningen van dit type.</p>
                  </div>
                ) : (
                  filteredOefeningen.map((oe, i) => {
                    const Icon = TYPE_ICONS[oe.type];
                    const checked = form.exerciseIds.includes(oe.id);
                    return (
                      <button
                        key={oe.id}
                        type="button"
                        onClick={() => toggleExercise(oe.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          borderTop: i > 0 ? "1px solid #f0ede8" : undefined,
                          background: checked ? "#fff8f5" : "#ffffff",
                        }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: checked ? "#fff3ee" : "#f8f7f4" }}>
                          <Icon size={13} style={{ color: checked ? "#e8632a" : "#9ca3af" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{oe.title}</p>
                          <p className="text-xs text-gray-400">{oe.type}{oe.repetitions ? ` · ${oe.repetitions}` : ""}</p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                          style={{
                            borderColor: checked ? "#e8632a" : "#d1d5db",
                            background: checked ? "#e8632a" : "transparent",
                          }}
                        >
                          {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
          {form.exerciseIds.length > 0 && (
            <p className="text-xs text-gray-400 mt-1.5">
              {form.exerciseIds.length} oefening{form.exerciseIds.length !== 1 ? "en" : ""} geselecteerd
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end px-4 sm:px-6 py-4 border-t shrink-0" style={{ borderColor: "#f0ede8" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Annuleren</Button>
        <Button size="sm" onClick={handleSave}>Opslaan</Button>
      </div>
    </ModalShell>
  );
}

// ─── Schema card ──────────────────────────────────────────────────────────────

function SchemaCard({
  schema, oefeningen, onEdit, onDelete, onStatusChange,
}: {
  schema: TrainingSchema;
  oefeningen: TrainingOefening[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: TrainingSchemaStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const linked = oefeningen.filter((o) => schema.exerciseIds.includes(o.id));
  const cfg = STATUS_CONFIG[schema.status];

  return (
    <div
      className="rounded-2xl border transition-all"
      style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{schema.title}</h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={10} /> {schema.duration}
            </span>
            <span className="text-xs text-gray-400">
              {linked.length} oefening{linked.length !== 1 ? "en" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <Pencil size={13} className="text-gray-400" />
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => { onDelete(); setConfirmDel(false); }}
                className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: "#fef2f2", color: "#ef4444" }}>Ja</button>
              <button onClick={() => setConfirmDel(false)}
                className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: "#f3f4f6", color: "#6b7280" }}>Nee</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
              <Trash2 size={13} className="text-gray-300 hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Exercises toggle */}
      {linked.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left border-t transition-colors hover:bg-gray-50"
            style={{ borderColor: "#f0ede8" }}
          >
            <span className="text-xs font-medium text-gray-500">
              {expanded ? "Verbergen" : "Oefeningen tonen"}
            </span>
            {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
          </button>

          {expanded && (
            <div className="border-t" style={{ borderColor: "#f0ede8" }}>
              {linked.map((oe, i) => {
                const Icon = TYPE_ICONS[oe.type];
                return (
                  <div key={oe.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderTop: i > 0 ? "1px solid #f8f7f4" : undefined }}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "#fff3ee" }}>
                      <Icon size={11} style={{ color: "#e8632a" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{oe.title}</p>
                    </div>
                    {oe.repetitions && (
                      <span className="text-[11px] text-gray-400 shrink-0">{oe.repetitions}</span>
                    )}
                    {oe.loadOrTime && !oe.repetitions && (
                      <span className="text-[11px] text-gray-400 shrink-0">{oe.loadOrTime}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Status wijzigen */}
      <div className="flex gap-1.5 px-4 py-3 border-t" style={{ borderColor: "#f0ede8" }}>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: schema.status === s.value ? STATUS_CONFIG[s.value].color : "#f3f4f6",
              color: schema.status === s.value ? "#ffffff" : "#6b7280",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Oefening database card ───────────────────────────────────────────────────

function OefeningCard({
  oefening, usedInCount, onEdit, onDelete,
}: {
  oefening: TrainingOefening;
  usedInCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICONS[oefening.type];
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div
      className="rounded-2xl border p-4 transition-all"
      style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 6px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#fff3ee" }}>
          <Icon size={15} style={{ color: "#e8632a" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{oefening.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{oefening.type} · {oefening.location}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <Pencil size={12} className="text-gray-400" />
              </button>
              {confirmDel ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => { onDelete(); setConfirmDel(false); }}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                    style={{ background: "#fef2f2", color: "#ef4444" }}>Ja</button>
                  <button onClick={() => setConfirmDel(false)}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                    style={{ background: "#f3f4f6", color: "#6b7280" }}>Nee</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                  <Trash2 size={12} className="text-gray-300 hover:text-red-400" />
                </button>
              )}
            </div>
          </div>

          {oefening.description && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{oefening.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {oefening.repetitions && (
              <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{oefening.repetitions}</span>
            )}
            {oefening.loadOrTime && (
              <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{oefening.loadOrTime}</span>
            )}
            {usedInCount > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "#fff3ee", color: "#e8632a" }}>
                {usedInCount} schema{usedInCount !== 1 ? "'s" : ""}
              </span>
            )}
          </div>

          {oefening.note && (
            <p className="text-[11px] text-gray-400 mt-2 italic leading-relaxed">{oefening.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, sub }: {
  icon: React.ElementType; title: string; sub?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed"
      style={{ borderColor: "#e8e5df" }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: "#f8f7f4" }}>
        <Icon size={18} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {sub && <p className="text-xs text-gray-300 mt-1 max-w-xs">{sub}</p>}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#b5b0a8" }}>
      {children}
    </p>
  );
}

// ─── Page tabs ────────────────────────────────────────────────────────────────

type Tab = "schemas" | "oefeningen";

function PageTabs({ active, onChange, schemaCount, oefeningCount }: {
  active: Tab;
  onChange: (t: Tab) => void;
  schemaCount: number;
  oefeningCount: number;
}) {
  return (
    <div
      className="inline-flex items-center p-1 rounded-xl gap-0.5"
      style={{ background: "#f0ede8" }}
    >
      {([
        { id: "schemas" as Tab, label: "Schema's", count: schemaCount, icon: LayoutList },
        { id: "oefeningen" as Tab, label: "Oefeningen", count: oefeningCount, icon: BookOpen },
      ] as const).map(({ id, label, count, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: isActive ? "#ffffff" : "transparent",
              color: isActive ? "#1a1a1a" : "#9ca3af",
              boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                style={{
                  background: isActive ? "#f3f0eb" : "transparent",
                  color: isActive ? "#6b7280" : "#c4bfb9",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const {
    trainingOefeningen, addTrainingOefening, updateTrainingOefening, deleteTrainingOefening,
    trainingSchemas, addTrainingSchema, updateTrainingSchema, deleteTrainingSchema,
    dagboekWorkouts,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<Tab>("schemas");
  const [oefeningModal, setOefeningModal] = useState<{ open: boolean; editing?: TrainingOefening }>({ open: false });
  const [schemaModal, setSchemaModal] = useState<{ open: boolean; editing?: TrainingSchema }>({ open: false });

  // Week calendar — visual only, ready for agenda/dagboek integration
  const weekDays = getWeekDays();
  const today = todayStr();

  // Stats
  const actieveSchemas = trainingSchemas.filter((s) => s.status === "actief");
  const geplande = trainingSchemas.filter((s) => s.status === "gepland");
  const afgeronde = trainingSchemas.filter((s) => s.status === "afgerond");

  function usedInCount(oeId: string) {
    return trainingSchemas.filter((s) => s.exerciseIds.includes(oeId)).length;
  }

  function handleSaveOefening(data: OefeningFormState) {
    if (oefeningModal.editing) {
      updateTrainingOefening(oefeningModal.editing.id, data);
    } else {
      const now = new Date().toISOString();
      addTrainingOefening({ id: uid(), ...data, createdAt: now, updatedAt: now });
    }
    setOefeningModal({ open: false });
  }

  function handleSaveSchema(data: SchemaFormState) {
    if (schemaModal.editing) {
      updateTrainingSchema(schemaModal.editing.id, data);
    } else {
      const now = new Date().toISOString();
      addTrainingSchema({ id: uid(), ...data, createdAt: now, updatedAt: now });
    }
    setSchemaModal({ open: false });
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 overflow-x-hidden">
      {/* Desktop: buttons in SectionHeader action slot */}
      <div className="hidden sm:block">
        <SectionHeader
          title="Training & Oefeningen"
          subtitle="Jouw revalidatieschema's en oefeningen database"
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSchemaModal({ open: true })}>
                <LayoutList size={14} /> Schema toevoegen
              </Button>
              <Button size="sm" onClick={() => setOefeningModal({ open: true })}>
                <Plus size={14} /> Oefening toevoegen
              </Button>
            </div>
          }
        />
      </div>
      {/* Mobile: title + subtitle only (buttons are below the tab bar) */}
      <div className="sm:hidden">
        <SectionHeader
          title="Training & Oefeningen"
          subtitle="Jouw revalidatieschema's en oefeningen database"
        />
      </div>

      {/* Week overview — dark card, visual only, ready for future dagboek integration */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm font-semibold mb-0.5" style={{ color: "#f5f4f2" }}>Deze week</p>
        <p className="text-xs mb-4" style={{ color: "#7c7c8a" }}>Weekoverzicht van je revalidatieschema</p>
        {/* Desktop: equal-width columns in one row */}
        <div className="hidden sm:flex gap-2">
          {weekDays.map(({ date, label }) => {
            const isToday = date === today;
            const dayWorkouts = dagboekWorkouts.filter((w) => w.date === date);
            const visible = dayWorkouts.slice(0, 2);
            const overflow = dayWorkouts.length - visible.length;
            return (
              <div key={date}
                className="flex-1 flex flex-col gap-1.5 py-3 px-2 rounded-xl transition-all"
                style={{
                  background: isToday ? "#fff5f0" : "#ffffff",
                  border: isToday ? "1.5px solid #e8632a" : "1.5px solid #e8e5df",
                  boxShadow: isToday ? "0 0 0 3px rgba(232,99,42,0.08)" : "0 1px 4px rgba(0,0,0,0.05)",
                  minWidth: 0,
                }}
              >
                <span className="text-xs font-semibold text-center"
                  style={{ color: isToday ? "#e8632a" : "#1a1a1a" }}>
                  {label}
                </span>
                {dayWorkouts.length === 0 ? (
                  <div className="flex justify-center">
                    <div className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ background: isToday ? "#e8632a" : "#e8e5df" }} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visible.map((w) => {
                      const schema = trainingSchemas.find((s) => s.id === w.schemaId);
                      const wLabel = schema ? schema.title : w.title;
                      return (
                        <div key={w.id}
                          className="flex items-center gap-1 px-1.5 py-1 rounded-lg"
                          style={{ background: w.completed ? "rgba(34,197,94,0.10)" : "rgba(0,0,0,0.04)" }}
                        >
                          {w.completed ? (
                            <div className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: "#22c55e" }}>
                              <Check size={7} className="text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-3 h-3 rounded-full shrink-0"
                              style={{ border: "1.5px solid #d1d5db" }} />
                          )}
                          <span className="text-[9px] font-medium leading-tight truncate"
                            style={{ color: w.completed ? "#15803d" : "#374151" }}>
                            {wLabel}
                          </span>
                        </div>
                      );
                    })}
                    {overflow > 0 && (
                      <p className="text-[9px] font-medium text-center" style={{ color: "#9ca3af" }}>+{overflow} meer</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: horizontal scroll with wider cards */}
        <div className="sm:hidden flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {weekDays.map(({ date, label }) => {
            const isToday = date === today;
            const dayWorkouts = dagboekWorkouts.filter((w) => w.date === date);
            const visible = dayWorkouts.slice(0, 3);
            const overflow = dayWorkouts.length - visible.length;
            return (
              <div key={date}
                className="flex flex-col gap-2 py-3 px-3 rounded-xl shrink-0"
                style={{
                  width: "120px",
                  background: isToday ? "#fff5f0" : "#ffffff",
                  border: isToday ? "1.5px solid #e8632a" : "1.5px solid #e8e5df",
                  boxShadow: isToday ? "0 0 0 3px rgba(232,99,42,0.08)" : "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                <span className="text-xs font-bold"
                  style={{ color: isToday ? "#e8632a" : "#1a1a1a" }}>
                  {label}
                </span>
                {dayWorkouts.length === 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: isToday ? "#e8632a" : "#e8e5df" }} />
                    <span className="text-[10px]" style={{ color: "#9ca3af" }}>Rust</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visible.map((w) => {
                      const schema = trainingSchemas.find((s) => s.id === w.schemaId);
                      const wLabel = schema ? schema.title : w.title;
                      return (
                        <div key={w.id} className="flex items-center gap-1.5">
                          {w.completed ? (
                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: "#22c55e" }}>
                              <Check size={8} className="text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ border: "1.5px solid #d1d5db" }} />
                          )}
                          <span className="text-[10px] font-medium leading-tight line-clamp-2"
                            style={{ color: w.completed ? "#15803d" : "#374151" }}>
                            {wLabel}
                          </span>
                        </div>
                      );
                    })}
                    {overflow > 0 && (
                      <p className="text-[10px]" style={{ color: "#9ca3af" }}>+{overflow}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-xl font-bold" style={{ color: "#f5f4f2" }}>{actieveSchemas.length}</p>
            <p className="text-xs" style={{ color: "#7c7c8a" }}>Actieve schema's</p>
          </div>
          <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div>
            <p className="text-xl font-bold" style={{ color: "#f5f4f2" }}>{trainingSchemas.length}</p>
            <p className="text-xs" style={{ color: "#7c7c8a" }}>Schema's totaal</p>
          </div>
          <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <div>
            <p className="text-xl font-bold" style={{ color: "#f5f4f2" }}>{trainingOefeningen.length}</p>
            <p className="text-xs" style={{ color: "#7c7c8a" }}>Oefeningen in database</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div>
        {/* Desktop: tabs + inline button on same row */}
        <div className="hidden sm:flex items-center justify-between mb-5">
          <PageTabs
            active={activeTab}
            onChange={setActiveTab}
            schemaCount={trainingSchemas.length}
            oefeningCount={trainingOefeningen.length}
          />
          <button
            onClick={() => activeTab === "schemas"
              ? setSchemaModal({ open: true })
              : setOefeningModal({ open: true })
            }
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: "#6b7280" }}
          >
            <Plus size={12} />
            {activeTab === "schemas" ? "Nieuw schema" : "Oefening toevoegen"}
          </button>
        </div>
        {/* Mobile: tabs full width, button below */}
        <div className="sm:hidden mb-4">
          <PageTabs
            active={activeTab}
            onChange={setActiveTab}
            schemaCount={trainingSchemas.length}
            oefeningCount={trainingOefeningen.length}
          />
          <button
            onClick={() => activeTab === "schemas"
              ? setSchemaModal({ open: true })
              : setOefeningModal({ open: true })
            }
            className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold py-3.5 rounded-2xl transition-colors touch-press"
            style={{ background: "#e8632a", color: "#ffffff", boxShadow: "0 4px 14px rgba(232,99,42,0.3)" }}
          >
            <Plus size={15} />
            {activeTab === "schemas" ? "Nieuw schema toevoegen" : "Oefening toevoegen"}
          </button>
        </div>

        {/* Tab: Schema's */}
        {activeTab === "schemas" && (
          <div>
            {trainingSchemas.length === 0 ? (
              <EmptyState icon={LayoutList} title="Nog geen schema's"
                sub="Maak een trainingsschema op basis van het plan van je fysio." />
            ) : (
              <div className="space-y-6">
                {actieveSchemas.length > 0 && (
                  <div>
                    <SectionLabel>Actief</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {actieveSchemas.map((s) => (
                        <SchemaCard
                          key={s.id}
                          schema={s}
                          oefeningen={trainingOefeningen}
                          onEdit={() => setSchemaModal({ open: true, editing: s })}
                          onDelete={() => deleteTrainingSchema(s.id)}
                          onStatusChange={(st) => updateTrainingSchema(s.id, { status: st })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {geplande.length > 0 && (
                  <div>
                    <SectionLabel>Gepland</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {geplande.map((s) => (
                        <SchemaCard
                          key={s.id}
                          schema={s}
                          oefeningen={trainingOefeningen}
                          onEdit={() => setSchemaModal({ open: true, editing: s })}
                          onDelete={() => deleteTrainingSchema(s.id)}
                          onStatusChange={(st) => updateTrainingSchema(s.id, { status: st })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {afgeronde.length > 0 && (
                  <div>
                    <SectionLabel>Afgerond</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {afgeronde.map((s) => (
                        <SchemaCard
                          key={s.id}
                          schema={s}
                          oefeningen={trainingOefeningen}
                          onEdit={() => setSchemaModal({ open: true, editing: s })}
                          onDelete={() => deleteTrainingSchema(s.id)}
                          onStatusChange={(st) => updateTrainingSchema(s.id, { status: st })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Oefeningen database — grouped by type */}
        {activeTab === "oefeningen" && (
          <div>
            {trainingOefeningen.length === 0 ? (
              <EmptyState icon={BookOpen} title="Nog geen oefeningen"
                sub="Voeg oefeningen toe aan je database. Je kunt ze daarna aan schema's koppelen." />
            ) : (
              <div className="space-y-6">
                {OEFENING_TYPES.map((type) => {
                  const groep = trainingOefeningen.filter((o) => o.type === type);
                  if (groep.length === 0) return null;
                  return (
                    <div key={type}>
                      <SectionLabel>{type}</SectionLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {groep.map((oe) => (
                          <OefeningCard
                            key={oe.id}
                            oefening={oe}
                            usedInCount={usedInCount(oe.id)}
                            onEdit={() => setOefeningModal({ open: true, editing: oe })}
                            onDelete={() => deleteTrainingOefening(oe.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {oefeningModal.open && (
        <OefeningFormModal
          initial={oefeningModal.editing}
          onSave={handleSaveOefening}
          onClose={() => setOefeningModal({ open: false })}
        />
      )}

      {schemaModal.open && (
        <SchemaFormModal
          initial={schemaModal.editing}
          oefeningen={trainingOefeningen}
          onSave={handleSaveSchema}
          onClose={() => setSchemaModal({ open: false })}
        />
      )}
    </div>
  );
}
