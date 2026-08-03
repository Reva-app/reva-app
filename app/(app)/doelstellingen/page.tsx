"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppData } from "@/lib/store";
import { type Doel } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { useUserPlan } from "@/lib/hooks/useUserPlan";
import { canAddDoel } from "@/lib/featureGates";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { DatePicker } from "@/components/ui/DatePicker";
import { usePatientProtocol } from "@/lib/hooks/usePatientProtocol";
import { ProtocolGoalsView } from "@/components/training/ProtocolGoalsView";
import { useToast } from "@/components/ui/Toast";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  Target, Plus, Check, Pencil, Trash2, X,
  Star, Flag, Zap,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string): string {
  if (!str) return "";
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const ICON_OPTIONS = ["🏃", "🚴", "💪", "🏋️", "⚽", "🎯", "🧘", "🏊", "🚶", "🦵", "🏆", "✨"];

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

// ─── Page ─────────────────────────────────────────────────────────────────────

type DoelTab = "herstelplan" | "eigen";

export default function DoelstellingenPage() {
  const { hydrated, doelen, addDoel, updateDoel, deleteDoel, promoteToMain } = useAppData();

  const planInfo = useUserPlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { checked: protocolChecked, hasActiveProtocol, protocol } = usePatientProtocol();

  const [toast, setToast] = useState<string | null>(null);
  const { showToast, toastNode } = useToast();
  const [goalModal, setGoalModal] = useState<{ mode: "add" } | { mode: "edit"; doel: Doel } | null>(null);
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<Doel | null>(null);
  const [tab, setTab] = useState<DoelTab>("herstelplan");

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
      showToast("Doel opgeslagen");
    } else {
      updateDoel(goalModal.doel.id, { icon: data.icon, title: data.title, description: data.description, targetDate: data.targetDate, completedAt: data.behaaldOp || undefined });
      showToast("Doel opgeslagen");
    }
    setGoalModal(null);
  }

  function handleToggleDoel(doel: Doel) {
    const nowIso = new Date().toISOString();
    if (!doel.completed) { updateDoel(doel.id, { completed: true, completedAt: nowIso }); triggerToast(); }
    else updateDoel(doel.id, { completed: false, completedAt: undefined });
  }

  if (!hydrated || !protocolChecked) return <PageSkeleton />;

  const showProtocolSection = hasActiveProtocol && !!protocol;

  const showPersonalSection = !showProtocolSection || tab === "eigen";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {showProtocolSection && (
        <Tabs
          options={[
            { value: "herstelplan", label: "Vanuit herstelplan" },
            { value: "eigen", label: "Persoonlijke doelen" },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      {showProtocolSection && tab === "herstelplan" && <ProtocolGoalsView protocol={protocol} />}

      {showPersonalSection && (
      <div className="space-y-8">
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
            <div className="rounded-2xl border" style={{ borderColor: "#e8e5df" }}>
              <EmptyState
                icon={Target}
                title="Nog geen hoofddoel ingesteld"
                description="Voeg een doelstelling toe en maak het je hoofddoel"
              />
            </div>
          )}
        </section>

        {/* Overige doelstellingen */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Overige doelstellingen</h2>
              <p className="text-xs text-gray-400 mt-0.5">{regularGoals.length} {regularGoals.length === 1 ? "doel" : "doelen"}</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!canAddDoel(planInfo, regularGoals.length)) {
                  setShowUpgradeModal(true);
                  return;
                }
                setGoalModal({ mode: "add" });
              }}
            >
              <Plus size={14} /> Nieuw doel
            </Button>
          </div>

          {regularGoals.length === 0 ? (
            <div className="rounded-2xl border" style={{ borderColor: "#e8e5df" }}>
              <EmptyState icon={Zap} title="Voeg een eerste doelstelling toe" />
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
      )}

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
        <ConfirmDialog
          title="Doelstelling verwijderen?"
          message={`"${deleteGoalTarget.title}" wordt verwijderd.`}
          confirmLabel="Verwijderen"
          onCancel={() => setDeleteGoalTarget(null)}
          onConfirm={() => { deleteDoel(deleteGoalTarget.id); setDeleteGoalTarget(null); showToast("Doel verwijderd"); }}
        />
      )}

      {toast && <CelebrationToast message={toast} onDone={() => setToast(null)} />}
      {toastNode}

      {showUpgradeModal && (
        <UpgradeModal feature="doel" onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}
