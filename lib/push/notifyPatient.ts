import { createClient } from "@/lib/supabaseClient";
import { apiUrl } from "@/lib/apiBase";

/**
 * Seintje aan de patiënt na een aanpassing door de fysio (schema of fase).
 * Fire-and-forget: de server bepaalt of en wanneer er een melding uitgaat
 * (één per half uur, alleen met app-account en pushmeldingen aan).
 */
export function notifyPatientUpdate(patientId: string, kind: "schema" | "fase" | "afgerond" = "schema"): void {
  void (async () => {
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;
      await fetch(apiUrl("/api/push/patient-update"), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, kind }),
      });
    } catch { /* een melding is een extra, nooit blokkerend */ }
  })();
}
