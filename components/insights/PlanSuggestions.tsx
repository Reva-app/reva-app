"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, Check } from "lucide-react";
import { TONE, InsightBadge, readDismissed, writeDismissed } from "@/components/insights/InsightCard";
import { updatePatientScheduleExercise, type PortalPatientProtocolScheduleExercise } from "@/lib/services/protocolService";
import type { PlanSuggestion } from "@/lib/insights/planInsights";

/**
 * REVA-voorstellen in de huidige fase: dosering per oefening (opbouwen,
 * lichter, vaak overgeslagen) en het moment voor de volgende fase. Een
 * concrete wijziging pas je met één klik toe, of eerst aan.
 */
export function PlanSuggestions({ suggestions, scope, canManage, onEditExercise, onAdvancePhase, onChanged, notify }: {
  suggestions: PlanSuggestion[];
  scope: string;
  canManage: boolean;
  onEditExercise: (e: PortalPatientProtocolScheduleExercise) => void;
  onAdvancePhase: () => void;
  onChanged: () => void;
  notify: (message: string, type?: "success" | "error") => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed(scope));
  const [busy, setBusy] = useState<string | null>(null);
  const visible = suggestions.filter((s) => !dismissed.includes(s.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(scope, next);
  }

  async function apply(s: PlanSuggestion) {
    if (!s.apply || !s.exercise) return;
    setBusy(s.id);
    const { error } = await updatePatientScheduleExercise(s.exercise.id, s.apply.input);
    setBusy(null);
    if (error) { notify(error, "error"); return; }
    dismiss(s.id);
    notify(`${s.exercise.title} bijgewerkt: ${s.apply.label}`);
    onChanged();
  }

  async function applyAll(s: PlanSuggestion) {
    if (!s.applyMany) return;
    setBusy(s.id);
    const results = await Promise.all(s.applyMany.map((a) => updatePatientScheduleExercise(a.exercise.id, a.input)));
    setBusy(null);
    const failed = results.filter((r) => r.error).length;
    if (failed) notify(`${failed} van de ${results.length} oefeningen konden niet worden bijgewerkt.`, "error");
    else { dismiss(s.id); notify(`${results.length} oefeningen opgebouwd`); }
    onChanged();
  }

  const btn = "inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-60";

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--brand-accent-border, #f8d0bf)", background: "var(--brand-accent-softer, #fef7f4)" }}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
          <Sparkles size={15} style={{ color: "var(--brand-accent, #e8632a)" }} /> REVA-voorstellen voor deze fase
        </p>
        <InsightBadge />
      </div>
      <p className="text-xs text-gray-500 mb-2">Op basis van de gelogde trainingen en check-ins van de afgelopen weken.</p>
      <ul className="divide-y divide-[#f0e4dc]">
        {visible.map((s) => {
          const tone = TONE[s.tone];
          const Icon = tone.icon;
          return (
            <li key={s.id} className="flex items-start gap-3 py-3 last:pb-0">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: tone.bg }}>
                <Icon size={15} style={{ color: tone.color }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{s.reason}</p>
                {s.applyMany && (
                  <ul className="mt-2 space-y-1">
                    {s.applyMany.map((a) => (
                      <li key={a.exercise.id} className="flex items-center justify-between gap-3 rounded-lg bg-white border px-3 py-1.5 text-xs" style={{ borderColor: "#efe7e1" }}>
                        <span className="text-gray-800 truncate">{a.exercise.title}</span>
                        <span className="text-gray-500 shrink-0 tabular-nums">{a.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {canManage && s.apply && (
                    <button type="button" disabled={busy === s.id} onClick={() => apply(s)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--brand-accent, #e8632a)" }}>
                      {busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Toepassen: {s.apply.label}
                    </button>
                  )}
                  {canManage && s.applyMany && (
                    <button type="button" disabled={busy === s.id} onClick={() => applyAll(s)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: "var(--brand-accent, #e8632a)" }}>
                      {busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Alles toepassen
                    </button>
                  )}
                  {canManage && s.exercise && (
                    <button type="button" onClick={() => onEditExercise(s.exercise!)} className={btn} style={{ borderColor: "#e8e5df" }}>Aanpassen</button>
                  )}
                  {canManage && s.advancePhase && (
                    <button type="button" onClick={onAdvancePhase} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--brand-accent, #e8632a)" }}>
                      <Check size={12} /> Fase afronden en volgende starten
                    </button>
                  )}
                  <button type="button" onClick={() => dismiss(s.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-white">
                    <X size={12} /> Negeren
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
