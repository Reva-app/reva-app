"use client";

/**
 * Client-side OAuth / magic-link callback handler.
 *
 * Supabase stuurt de gebruiker na Google OAuth, e-mailbevestiging of een
 * uitnodigingslink (auth.admin.generateLink) terug naar deze pagina — soms
 * met een `code` query-parameter (PKCE flow), soms met sessie-tokens in het
 * URL-fragment (de verify-link-flow die generateLink gebruikt), die de
 * Supabase-client automatisch verwerkt bij initialisatie. Beide paden
 * resulteren uiteindelijk in `getSession()`/`getUser()`.
 *
 * Werkt voor zowel de web-deployment als de Capacitor-app.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") ?? "/";

      let user = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          const { data } = await supabase.auth.getUser();
          user = data.user;
        }
      }

      if (!user) {
        // Geen ?code=, of exchange mislukt — controleer of er al een sessie is
        // (bv. via het URL-fragment, de vorm die generateLink's verify-link
        // gebruikt). Ook: query-parameters op de redirect-URL blijken niet
        // betrouwbaar te overleven als ze niet exact op Supabase's eigen
        // Redirect-URLs-allowlist staan — vandaar de membership-check hieronder
        // in plaats van te vertrouwen op een ?flow=invite-parameter.
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user ?? null;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      // Heeft deze gebruiker een actieve membership (medewerker/eigenaar van
      // een organisatie)? Dan is dit altijd het accepteren van een
      // uitnodiging — magic-link-logins zetten nooit een wachtwoord, dus
      // eerst daarheen, ongeacht welke query-parameters de redirect via
      // Supabase's eigen server heeft overleefd.
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership) {
        router.replace(`/auth/reset-password?next=${encodeURIComponent("/portal")}&mode=invite`);
        return;
      }

      const { data: settings } = await supabase
        .from("settings")
        .select("setup_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      const setupDone = settings?.setup_completed ?? false;
      const destination =
        setupDone ? (next && next !== "/" ? next : "/") : "/instellingen";
      router.replace(destination);
    };

    run();
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "#f8f7f4" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "#e8632a" }}
      >
        <span className="text-white font-bold text-base leading-none">R</span>
      </div>
      <p className="text-sm text-gray-500">Inloggen&hellip;</p>
    </div>
  );
}
