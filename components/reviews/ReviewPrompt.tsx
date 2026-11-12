"use client";

import { useEffect, useRef, useState } from "react";
import { Star, MessageSquare, X, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { apiUrl } from "@/lib/apiBase";
import { GOOGLE_REVIEW_URL, isReviewExcluded, loadReviewHistory, mayAsk, recordReviewEvent } from "@/lib/reviews";

const audience = "owner" as const;

function copy(ctx: { weeks: number; practiceName: string | null }) {
  return {
    title: `${ctx.practiceName ?? "Je praktijk"} werkt nu ${ctx.weeks} weken met REVA`,
    body: "Hoe bevalt het? Met een review help je andere praktijken een goede keuze te maken, en met feedback help je ons REVA beter te maken.",
  };
}

/**
 * Reviewverzoek op een natuurlijk moment (lib/reviews.ts). Toont zichzelf
 * alleen als er een trigger is en het niet te vaak gevraagd is. Iedereen
 * krijgt dezelfde keuze: review op Google of feedback aan ons.
 */
export function ReviewPrompt({ trigger, weeks, practiceName, name, email }: {
  trigger: string | null;
  weeks: number;
  practiceName: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"ask" | "feedback" | "thanks">("ask");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const shownRef = useRef(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!trigger) return;
    let cancelled = false;
    Promise.all([loadReviewHistory(), isReviewExcluded(email)]).then(([history, excluded]) => {
      if (cancelled || excluded || !mayAsk(history, now)) return;
      setVisible(true);
      if (!shownRef.current) { shownRef.current = true; void recordReviewEvent(audience, trigger, "shown"); }
    });
    return () => { cancelled = true; };
  }, [trigger, now, email]);

  if (!visible || !trigger) return null;
  const c = copy({ weeks, practiceName });

  function close(event: "later" | "never") {
    void recordReviewEvent(audience, trigger!, event);
    setVisible(false);
  }

  async function sendFeedback() {
    if (!text.trim()) return;
    setSending(true);
    await fetch(apiUrl("/api/feedback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categorie: "Feedback op reviewmoment",
        onderwerp: `Feedback van praktijkeigenaar${practiceName ? ` (${practiceName})` : ""}`,
        bericht: text,
        naam: name ?? "",
        email: email ?? "",
      }),
    }).catch(() => {});
    void recordReviewEvent(audience, trigger!, "feedback");
    setSending(false);
    setMode("thanks");
  }

  return (
    <div className="rounded-3xl border p-5 sm:p-6 relative" style={{ background: "#ffffff", borderColor: "var(--brand-accent-border, #f8d0bf)" }}>
      {mode !== "thanks" && (
        <button type="button" onClick={() => close("later")} aria-label="Later" className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50"><X size={15} /></button>
      )}
      {mode === "thanks" ? (
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--brand-accent-soft, #fdefea)" }}><Heart size={18} style={{ color: "var(--brand-accent, #e8632a)" }} /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Dank je wel!</p>
            <p className="text-xs text-gray-500">We lezen alle feedback en gebruiken die om REVA beter te maken.</p>
          </div>
          <button type="button" onClick={() => setVisible(false)} aria-label="Sluiten" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50"><X size={15} /></button>
        </div>
      ) : (
        <div className="flex items-start gap-4 pr-6">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--brand-accent-soft, #fdefea)" }}>
            <Star size={20} style={{ color: "var(--brand-accent, #e8632a)" }} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{c.title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-2xl">{c.body}</p>
            {mode === "ask" ? (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { void recordReviewEvent(audience, trigger, "review"); setTimeout(() => setMode("thanks"), 300); }}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--brand-accent, #e8632a)" }}
                >
                  <Star size={14} /> Review schrijven op Google
                </a>
                <Button size="sm" variant="secondary" onClick={() => setMode("feedback")}><MessageSquare size={13} /> Feedback geven</Button>
                <button type="button" onClick={() => close("never")} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Niet meer vragen</button>
              </div>
            ) : (
              <div className="mt-3 space-y-2 max-w-xl">
                <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Wat gaat goed, en wat kan beter?" autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" onClick={sendFeedback} disabled={sending || !text.trim()}>{sending ? <Loader2 size={13} className="animate-spin" /> : "Versturen"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setMode("ask")}>Terug</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
