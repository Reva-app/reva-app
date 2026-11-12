"use client";

import { useEffect, useState } from "react";
import { BellRing, Share, PlusSquare, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPushState, enablePush, disablePush, sendTestPush, isIos, isStandalone, type PushState } from "@/lib/webPush";

/** Huidige pushstatus van dit apparaat, met verversen na aan/uit. */
function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => { getPushState().then(setState); }, []);
  return [state, setState] as const;
}

function InstallSteps({ staff }: { staff?: boolean }) {
  return (
    <ol className="mt-3 space-y-2 text-sm text-gray-600">
      <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-xs font-semibold" style={{ borderColor: "#e8e5df" }}>1</span>Tik in Safari op <Share size={15} className="inline text-gray-500" /> <span className="font-medium text-gray-800">Deel</span></li>
      <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-xs font-semibold" style={{ borderColor: "#e8e5df" }}>2</span>Kies <PlusSquare size={15} className="inline text-gray-500" /> <span className="font-medium text-gray-800">Zet op beginscherm</span></li>
      <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-xs font-semibold" style={{ borderColor: "#e8e5df" }}>3</span>{staff ? "Open REVA vanaf je beginscherm, log in en zet meldingen aan onder Account" : "Open REVA vanaf je beginscherm en zet meldingen hier aan"}</li>
    </ol>
  );
}

const COPY = {
  patient: {
    title: "Pushmeldingen op dit apparaat",
    on: "Aan. Je herinneringen komen ook als melding op dit apparaat binnen.",
    off: "Krijg je herinneringen als melding op je telefoon, naast de e-mail.",
  },
  staff: {
    title: "Dagoverzicht als pushmelding",
    on: "Aan. Elke werkdag om 08:00 krijg je op dit apparaat een kort overzicht van wat aandacht nodig heeft. Alleen als er iets is, en zonder patiëntnamen.",
    off: "Elke werkdag om 08:00 een kort overzicht: patiënten met een signaal uit hun check-in en ingevulde intakes. Alleen als er iets is, en zonder patiëntnamen.",
  },
} as const;

/**
 * Pushmeldingen op dit apparaat. Patiënt (Instellingen → Meldingen):
 * herinneringen komen ook als melding binnen, naast de e-mail. Medewerker
 * (portaal → Account): het dagoverzicht van werkdagen 08:00 (migratie 142).
 */
export function PushSettings({ notify, variant = "patient" }: { notify: (msg: string, type?: "success" | "error") => void; variant?: "patient" | "staff" }) {
  const copy = COPY[variant];
  const staff = variant === "staff";
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);

  async function turnOn() {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    setState(res.state);
    if (res.error) notify(res.error, "error");
    else if (res.state === "on") notify("Pushmeldingen staan aan op dit apparaat");
  }
  async function turnOff() {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setState("off");
    notify("Pushmeldingen uitgezet op dit apparaat");
  }
  async function test() {
    setBusy(true);
    const { error } = await sendTestPush({ portal: staff });
    setBusy(false);
    notify(error ?? "Testmelding verstuurd", error ? "error" : "success");
  }

  if (state === null || state === "unsupported") return null;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: "var(--brand-accent-softer, #fef7f4)", borderColor: "var(--brand-accent-border, #f8d0bf)" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white">
          <BellRing size={17} style={{ color: "var(--brand-accent, #e8632a)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {state === "on" && copy.on}
            {state === "off" && copy.off}
            {state === "denied" && "Meldingen zijn geblokkeerd. Sta ze toe in de instellingen van je telefoon of browser en kom dan terug."}
            {state === "needs-install" && "Op een iPhone werken meldingen als je REVA op je beginscherm zet."}
          </p>
          {state === "needs-install" && <InstallSteps staff={staff} />}
          <div className="flex flex-wrap gap-2 mt-3">
            {state === "off" && <Button size="sm" onClick={turnOn} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : "Meldingen aanzetten"}</Button>}
            {state === "on" && (
              <>
                <Button size="sm" variant="secondary" onClick={test} disabled={busy}>Testmelding sturen</Button>
                <Button size="sm" variant="ghost" onClick={turnOff} disabled={busy}>Uitzetten</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PROMPT_KEY = "reva-push-prompt-dismissed";

/**
 * Eenmalige uitnodiging op het dashboard zodra REVA vanaf het beginscherm
 * draait en meldingen nog niet aan staan.
 */
export function PushPrompt() {
  const [state, setState] = usePushState();
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(PROMPT_KEY) === "1"; } catch { return true; }
  });
  const [busy, setBusy] = useState(false);

  if (hidden || state !== "off" || !isStandalone()) return null;

  function dismiss() {
    try { localStorage.setItem(PROMPT_KEY, "1"); } catch { /* geen opslag */ }
    setHidden(true);
  }

  return (
    <div className="rounded-2xl p-4 flex items-center gap-3 bg-white border" style={{ borderColor: "#e8e5df" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--brand-accent-soft, #fdefea)" }}>
        <BellRing size={18} style={{ color: "var(--brand-accent, #e8632a)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Herinneringen als melding?</p>
        <p className="text-xs text-gray-500">{isIos() ? "Krijg je check-in en afspraken als melding op je iPhone." : "Krijg je check-in en afspraken als melding op je telefoon."}</p>
      </div>
      <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); const r = await enablePush(); setBusy(false); setState(r.state); if (r.state !== "off") dismiss(); }}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : "Aanzetten"}
      </Button>
      <button type="button" onClick={dismiss} aria-label="Niet nu" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 shrink-0"><X size={15} /></button>
    </div>
  );
}
