"use client";

import { useInsightFeedback } from "@/lib/hooks/useInsightFeedback";
import { Sparkles, AlertTriangle, TrendingUp, Info, X, Phone, Mail } from "lucide-react";
import type { InsightSuggestion, InsightTarget, InsightTone, PatientInsights } from "@/lib/insights/patientInsights";

export const TONE: Record<InsightTone, { icon: typeof Info; color: string; bg: string }> = {
  attention: { icon: AlertTriangle, color: "#b45309", bg: "#fef3c7" },
  positive: { icon: TrendingUp, color: "#15803d", bg: "#dcfce7" },
  info: { icon: Info, color: "#4b5563", bg: "#f3f4f6" },
};

/** Herkenbaar label voor elk voorstel van REVA: het is een voorstel, de fysio beslist. */
export function InsightBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--brand-accent-soft, #fdefea)", color: "var(--brand-accent-ink, #8a3a17)" }}>
      <Sparkles size={11} /> Voorstel · jij beslist
    </span>
  );
}

function SuggestionRow({ s, onAction, onContact, onDismiss, contact }: {
  s: InsightSuggestion;
  onAction: (t: InsightTarget) => void;
  onContact: () => void;
  onDismiss: () => void;
  contact: { phone: string | null; email: string | null };
}) {
  const tone = TONE[s.tone];
  const Icon = tone.icon;
  const actionClass = "inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors";
  return (
    <li className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: tone.bg }}>
        <Icon size={15} style={{ color: tone.color }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{s.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{s.reason}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {s.action?.target === "contact" ? (
            <>
              {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, "")}`} onClick={onContact} className={actionClass} style={{ borderColor: "#e8e5df" }}><Phone size={12} /> Bellen</a>}
              {contact.email && <a href={`mailto:${contact.email}`} onClick={onContact} className={actionClass} style={{ borderColor: "#e8e5df" }}><Mail size={12} /> E-mailen</a>}
            </>
          ) : s.action && (
            <button type="button" onClick={() => onAction(s.action!.target)} className={actionClass} style={{ borderColor: "#e8e5df" }}>{s.action.label}</button>
          )}
          <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
            <X size={12} /> Negeren
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * REVA-inzicht bovenaan het dossier: hoe gaat het (samenvatting) en wat
 * zou je kunnen doen (voorstellen). Negeren geldt per voorstel en per week.
 */
export function InsightCard({ insights, scope, onAction, contact }: {
  insights: PatientInsights;
  /** Patiënt-id: feedback (negeren, openen) wordt per patiënt vastgelegd. */
  scope: string;
  onAction: (target: InsightTarget) => void;
  contact: { phone: string | null; email: string | null };
}) {
  const { isHandled, record } = useInsightFeedback(scope, "inzicht");
  const visible = insights.suggestions.filter((s) => !isHandled(s.id));

  if (insights.sparse && visible.length === 0) return null;

  return (
    <div className="rounded-3xl border bg-white p-5 sm:p-6 relative overflow-hidden" style={{ borderColor: "var(--brand-accent-border, #f8d0bf)" }}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-24 pointer-events-none" style={{ background: "linear-gradient(180deg, var(--brand-accent-softer, #fef7f4) 0%, rgba(255,255,255,0) 100%)" }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-accent, #e8632a)" }}>
              <Sparkles size={17} color="#ffffff" />
            </span>
            <div>
              <p className="font-semibold text-gray-900">REVA-inzicht</p>
              <p className="text-xs text-gray-500">Op basis van check-ins, trainingen en het herstelplan</p>
            </div>
          </div>
          <InsightBadge />
        </div>

        {insights.summary.length > 0 && (
          <p className="text-sm text-gray-700 leading-relaxed mt-4">{insights.summary.join(" ")}</p>
        )}

        {visible.length > 0 ? (
          <ul className="mt-4 pt-4 border-t divide-y divide-[#f0ede8]" style={{ borderColor: "#f0ede8" }}>
            {visible.map((s) => (
              <SuggestionRow key={s.id} s={s} contact={contact} onAction={(t) => { record(s.id, "opened"); onAction(t); }} onContact={() => record(s.id, "opened")} onDismiss={() => record(s.id, "dismissed")} />
            ))}
          </ul>
        ) : insights.summary.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">Geen voorstellen op dit moment. Alles loopt volgens plan.</p>
        )}
      </div>
    </div>
  );
}
