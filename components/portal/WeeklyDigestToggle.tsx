"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

/** Eigenaar: wekelijks overzicht per e-mail aan/uit (user_email_prefs, migratie 148). */
export function WeeklyDigestToggle({ notify }: { notify: (m: string, t?: "success" | "error") => void }) {
  const { user } = useAuth();
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    createClient().from("user_email_prefs").select("weekly_digest").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setOn(data ? (data.weekly_digest as boolean) : true); });
    return () => { cancelled = true; };
  }, [user]);

  async function toggle() {
    if (!user || on === null) return;
    const next = !on;
    setOn(next);
    const { error } = await createClient().from("user_email_prefs").upsert({ user_id: user.id, weekly_digest: next, updated_at: new Date().toISOString() });
    if (error) { setOn(!next); notify("Opslaan is niet gelukt.", "error"); return; }
    notify(next ? "Je ontvangt het wekelijkse overzicht weer" : "Wekelijks overzicht uitgezet");
  }

  if (on === null) return null;
  return (
    <div className="rounded-xl border p-4 flex items-start gap-3" style={{ borderColor: "#e8e5df" }}>
      <Mail size={17} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">Wekelijks overzicht per e-mail</p>
        <p className="text-xs text-subtle mt-0.5">Elke maandagochtend de belangrijkste cijfers van je praktijk: therapietrouw, stille patiënten, pijn en tevredenheid.</p>
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={toggle}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: on ? "var(--brand-accent, #e8632a)" : "#d6d3cd" }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
      </button>
    </div>
  );
}
