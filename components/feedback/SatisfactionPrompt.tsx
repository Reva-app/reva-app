"use client";

import { useEffect, useState } from "react";
import { Star, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { loadMyDischargeFeedbackState, submitPatientFeedback } from "@/lib/services/patientFeedbackService";

const LABELS = ["", "Ontevreden", "Matig", "Neutraal", "Tevreden", "Heel tevreden"];

/**
 * Na het afsluiten van de behandeling: hoe tevreden ben je over je herstel
 * en de begeleiding? Alleen voor de eigen praktijk. Verschijnt tot de
 * patiënt reageert of "Liever niet" kiest.
 */
export function SatisfactionPrompt({ patientId, practiceName }: { patientId: string | null; practiceName: string | null }) {
  const [state, setState] = useState<"hidden" | "ask" | "thanks">("hidden");
  const [rating, setRating] = useState(0);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    loadMyDischargeFeedbackState(patientId).then((s) => { if (!cancelled && s.dischargedAt && !s.answered) setState("ask"); });
    return () => { cancelled = true; };
  }, [patientId]);

  if (state === "hidden" || !patientId) return null;

  async function send(declined: boolean) {
    if (!declined && !rating) { setError("Kies eerst hoeveel sterren je geeft"); return; }
    setSending(true);
    setError("");
    const { error: err } = await submitPatientFeedback(patientId!, { satisfaction: rating || null, recommend, comment, declined });
    setSending(false);
    if (err) { setError(err); return; }
    setState(declined ? "hidden" : "thanks");
  }

  const who = practiceName ?? "je praktijk";

  if (state === "thanks") {
    return (
      <div className="rounded-3xl border bg-white p-5 flex items-center gap-3" style={{ borderColor: "var(--brand-accent-border, #f8d0bf)" }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--brand-accent-soft, #fdefea)" }}><Heart size={18} style={{ color: "var(--brand-accent, #e8632a)" }} /></span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Dank je wel!</p>
          <p className="text-xs text-gray-500">Je reactie gaat naar {who}. Veel succes en plezier met alles wat je weer kunt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: "var(--brand-accent-border, #f8d0bf)" }}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--brand-accent, #e8632a)" }}>Behandeling afgerond</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">Hoe tevreden ben je over je herstel en de begeleiding?</p>
      <p className="text-sm text-gray-500 mt-0.5">Je antwoord gaat alleen naar {who} en helpt hen om de zorg nog beter te maken.</p>

      <div className="flex items-center gap-1 mt-4" role="radiogroup" aria-label="Tevredenheid">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? "ster" : "sterren"}: ${LABELS[n]}`} onClick={() => setRating(n)} className="p-1">
            <Star size={30} strokeWidth={1.5} style={{ color: "var(--brand-accent, #e8632a)" }} fill={n <= rating ? "currentColor" : "none"} />
          </button>
        ))}
        {rating > 0 && <span className="text-sm text-gray-600 ml-2">{LABELS[rating]}</span>}
      </div>

      {rating > 0 && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm text-gray-700 mb-2">Hoe waarschijnlijk is het dat je {who} aanraadt aan anderen? <span className="text-gray-400">(optioneel)</span></p>
            <div className="grid grid-cols-11 gap-1 max-w-lg">
              {Array.from({ length: 11 }, (_, n) => (
                <button key={n} type="button" aria-pressed={recommend === n} onClick={() => setRecommend(recommend === n ? null : n)}
                  className="h-9 rounded-lg border text-sm tabular-nums"
                  style={recommend === n ? { background: "var(--brand-accent, #e8632a)", borderColor: "var(--brand-accent, #e8632a)", color: "#fff" } : { borderColor: "#e8e5df", color: "#4b5563" }}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between max-w-lg text-[11px] text-gray-400 mt-1"><span>Zeer onwaarschijnlijk</span><span>Zeer waarschijnlijk</span></div>
          </div>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Wil je nog iets kwijt? Wat ging goed, wat kan beter? (optioneel)" />
        </div>
      )}

      {error && <p className="text-sm mt-3" style={{ color: "#dc2626" }}>{error}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button size="sm" onClick={() => send(false)} disabled={sending || !rating}>{sending ? <Loader2 size={13} className="animate-spin" /> : "Versturen"}</Button>
        <button type="button" onClick={() => send(true)} disabled={sending} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Liever niet</button>
      </div>
    </div>
  );
}
