"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";
import { createClient } from "@/lib/supabaseClient";

/**
 * Client-side auth + onboarding guard.
 *
 * - No session: redirect to /login.
 * - Session but setup not completed: redirect to /instellingen (unless already there).
 * - Session + setup done: render children normally.
 *
 * Het laadscherm wordt afgehandeld door AppLoadingGate (hoger in de boom).
 *
 * BELANGRIJK: dit is in de praktijk ook de eerste plek waar iemand na een
 * magic-link/uitnodigingslink daadwerkelijk terechtkomt. Supabase's
 * redirect-URL-allowlist blijkt elke aangevraagde `redirectTo` (incl. het pad
 * naar /auth/callback) terug te brengen tot het kale Site-URL-domein, dus
 * /auth/callback's eigen routeringslogica wordt in de praktijk nooit bereikt
 * — de gebruiker landt altijd hier, op de kale `/`. Vandaar de
 * medewerker-/eigenaaruitnodiging-detectie hieronder, i.p.v. (alleen) in
 * /auth/callback.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hydrated, setupCompleted } = useAppData();
  const router = useRouter();
  const pathname = usePathname();

  // Vlag die bij de allereerste render vastlegt of er een hash-fragment met
  // sessie-tokens aanwezig was (bv. #access_token=...) — het teken dat de
  // Supabase-client nog bezig is dit te verwerken. Zonder deze vlag kan
  // getSession() sneller "geen sessie" teruggeven dan de daadwerkelijke
  // sessie tot stand komt, wat leidde tot een voortijdige /login-redirect
  // vlak vóórdat de echte sessie er alsnog kwam.
  const [hadAuthFragment] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("access_token")
  );
  // Alleen een fragment-gebaseerde login (magic link/uitnodiging) kan ooit een
  // zojuist geaccepteerde uitnodiging zijn — voor elke andere login is er
  // simpelweg niets te controleren, dus die starten al "klaar".
  const [checkingInvite, setCheckingInvite] = useState(hadAuthFragment);
  const [inviteChecked, setInviteChecked] = useState(!hadAuthFragment);

  // Normaliseer het pad: verwijder trailing slash (trailingSlash: true in
  // static export geeft `/instellingen/` terug, vergelijking met `/instellingen`
  // zou anders altijd mislukken en een oneindige redirect-loop veroorzaken).
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const onInstellingen = normalizedPath === "/instellingen";

  useEffect(() => {
    if (authLoading || !hydrated) return;

    if (!user) {
      if (hadAuthFragment) return; // nog aan het verwerken, niet meteen wegsturen
      router.replace("/login");
      return;
    }

    if (inviteChecked) return;

    // Is dit een zojuist geaccepteerde medewerker-/eigenaaruitnodiging?
    // (Zie ensure_personal_organization, migratie 041 — die maakt de
    // membership-rij aan op het moment dat de uitnodiging wordt verstuurd,
    // dus een ruim tijdvenster dekt de normale vertraging tussen versturen
    // en daadwerkelijk klikken.)
    (async () => {
      const supabase = createClient();
      const recentThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: freshMembership } = await supabase
        .from("memberships")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("created_at", recentThreshold)
        .limit(1)
        .maybeSingle();

      if (freshMembership) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", freshMembership.organization_id)
          .maybeSingle();
        const orgParam = org?.name ? `&org=${encodeURIComponent(org.name)}` : "";
        router.replace(`/auth/reset-password?next=${encodeURIComponent("/portal")}&mode=invite${orgParam}`);
        return;
      }

      setInviteChecked(true);
      setCheckingInvite(false);
    })();
  }, [authLoading, hydrated, user, hadAuthFragment, inviteChecked, router]);

  useEffect(() => {
    if (!inviteChecked) return;
    if (!setupCompleted && !onInstellingen) {
      router.replace("/instellingen");
    }
  }, [inviteChecked, setupCompleted, onInstellingen, router]);

  if (authLoading || !hydrated) return null;
  if (!user) return null;
  if (checkingInvite) return null;
  if (!setupCompleted && !onInstellingen) return null;

  return <>{children}</>;
}
