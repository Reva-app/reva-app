"use client";

/**
 * Client-side OAuth / magic-link callback handler.
 *
 * Supabase stuurt de gebruiker na Google OAuth of e-mailbevestiging terug
 * naar deze pagina met een `code` query-parameter (PKCE flow).
 * We ruilen dat code in voor een sessie via de browser-client.
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

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { data: settings } = await supabase
              .from("settings")
              .select("setup_completed")
              .eq("user_id", user.id)
              .maybeSingle();

            const setupDone = settings?.setup_completed ?? false;
            const destination =
              setupDone ? (next && next !== "/" ? next : "/") : "/instellingen";
            router.replace(destination);
            return;
          }
        }
      }

      // Fallback: controleer of er al een sessie is (bijv. via hash-fragment)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace(next || "/");
        return;
      }

      // Geen sessie, stuur terug naar login
      router.replace("/login");
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
