"use client";

import { useEffect, useState } from "react";
import { loadDismissedSuggestions, recordInsightFeedback, insightRule, type InsightAction } from "@/lib/services/insightFeedbackService";

const LOCAL_KEY = "reva-insights-dismissed";

function readLocal(scope: string): string[] {
  try { return (JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Record<string, string[]>)[scope] ?? []; } catch { return []; }
}
function writeLocal(scope: string, ids: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Record<string, string[]>;
    all[scope] = ids.slice(-60);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch { /* geen opslag */ }
}

/**
 * Wat er met REVA-voorstellen van een patiënt is gedaan. Genegeerd of
 * toegepast geldt centraal (insight_feedback, migratie 145) voor elke
 * behandelaar en elk apparaat; lokaal blijft een terugval bewaard.
 */
export function useInsightFeedback(patientId: string, source: "inzicht" | "plan") {
  const [handled, setHandled] = useState<string[]>(() => readLocal(patientId));

  useEffect(() => {
    let cancelled = false;
    loadDismissedSuggestions(patientId).then((ids) => {
      if (!cancelled && ids.length) setHandled((cur) => Array.from(new Set([...cur, ...ids])));
    });
    return () => { cancelled = true; };
  }, [patientId]);

  function record(suggestionId: string, action: InsightAction) {
    if (action !== "opened") {
      setHandled((cur) => {
        const next = Array.from(new Set([...cur, suggestionId]));
        writeLocal(patientId, next);
        return next;
      });
    }
    void recordInsightFeedback(patientId, suggestionId, insightRule(source, suggestionId), action);
  }

  return { isHandled: (id: string) => handled.includes(id), record };
}
