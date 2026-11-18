"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabaseClient";
import { apiUrl } from "@/lib/apiBase";
import { isDemoOrg } from "@/lib/demo";
import { writeBrandCache, applyBrandVars } from "@/lib/brandCache";

/**
 * "Demo leegmaken" voor de vaste demopraktijk (lib/demo.ts). Toont niets bij
 * een gewone praktijk. Na het leegmaken herlaadt de pagina, zodat naam, logo
 * en kleur direct terug zijn naar de beginstand.
 */
export function DemoResetButton({
  organizationId, notify, reloadTo = "/portal",
}: {
  organizationId: string | null | undefined;
  notify: (m: string, t?: "success" | "error") => void;
  /** Waarheen na het leegmaken (de portal, of de beheerpagina). */
  reloadTo?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!isDemoOrg(organizationId)) return null;

  async function reset() {
    setBusy(true);
    const { data: { session } } = await createClient().auth.getSession();
    const res = await fetch(apiUrl("/api/demo-reset"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ organizationId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setConfirm(false);
      notify(json.error ?? "Leegmaken is niet gelukt.", "error");
      return;
    }
    // Huisstijl van de vorige lead niet laten hangen op dit apparaat.
    writeBrandCache(null);
    applyBrandVars(null);
    try { localStorage.removeItem("reva-logo-aspect"); } catch { /* geen opslag */ }
    window.location.href = reloadTo;
  }

  return (
    <div className="rounded-xl border p-4 flex items-start gap-3" style={{ borderColor: "#e8e5df", background: "#fbfaf8" }}>
      <RotateCcw size={17} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">Demo leegmaken</p>
        <p className="text-xs text-subtle mt-0.5">
          Zet deze demopraktijk terug naar de lege beginstand: patiënten, medewerkers, eigen plannen, locaties en huisstijl gaan weg. De demo-accounts blijven bestaan.
        </p>
      </div>
      <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirm(true)}>Leegmaken</Button>
      {confirm && (
        <ConfirmDialog
          title="Demo leegmaken?"
          message="Alles wat in deze demo is aangemaakt wordt verwijderd. Dit kan niet ongedaan worden gemaakt."
          confirmLabel="Ja, leegmaken"
          loading={busy}
          onConfirm={reset}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
