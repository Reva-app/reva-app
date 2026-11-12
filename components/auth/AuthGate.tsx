"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppData } from "@/lib/store";
import { createClient } from "@/lib/supabaseClient";
import { usePatientStatus } from "@/lib/hooks/usePatientStatus";
import { AccountInactiveScreen } from "@/components/auth/AccountInactiveScreen";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { StaffAccountScreen } from "@/components/auth/StaffAccountScreen";
import { useMfaStatus } from "@/lib/hooks/useMfaStatus";
import { MfaEnrollScreen } from "@/components/auth/MfaEnrollScreen";
import { MfaChallengeScreen } from "@/components/auth/MfaChallengeScreen";
import { PatientIntakeScreen } from "@/components/intake/PatientIntakeScreen";
import { loadMyPendingIntake, type MyPendingIntake } from "@/lib/services/intakeService";

/**
 * Client-side auth + onboarding guard.
 *
 * - No session: redirect to /login.
 * - Session but setup not completed: redirect to /instellingen (unless already there).
 * - Session + setup done: render children normally.
 *
 * Het laadscherm wordt afgehandeld door AppLoadingGate (hoger in de boom).
 *
 * Uitnodigingsmails wijzen tegenwoordig naar /auth/verify, dat de sessie zelf
 * opzet (supabase.auth.verifyOtp) en medewerkers/eigenaars daarna al gericht
 * naar /auth/reset-password?mode=invite stuurt — dat pad raakt deze gate dus
 * niet meer. De onderstaande fresh-membership-detectie blijft als defensieve
 * vangnet staan voor het geval een sessie via een andere weg (bv. Supabase's
 * eigen fragment-detectie) alsnog hier op `/` tot stand komt.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { hydrated, setupCompleted, profile, markSetupDone } = useAppData();
  // Patiënten die via de therapeut-intake zijn aangemaakt (migratie 088+)
  // hebben hun blessuregegevens al ingevuld gekregen en doorlopen dus nooit
  // zelf het Instellingen-formulier dat setupCompleted normaal zet — zonder
  // deze bypass belandden zij bij elk bezoek opnieuw op /instellingen.
  const setupEffectivelyDone = setupCompleted || !!profile.blessureType;
  const { checked: statusChecked, status: patientStatus } = usePatientStatus();
  const { checked: membershipChecked, membership: staffMembership } = usePortalMembership();
  // Tweestapsverificatie is ook voor patiënten verplicht (november 2026):
  // gezondheidsgegevens verdienen hetzelfde niveau als het praktijkportaal.
  const { checked: mfaChecked, satisfied: mfaSatisfied, needsEnrollment, factorId, refresh: refreshMfa } = useMfaStatus();
  // Intake die de fysio door de patiënt zelf laat invullen (migratie 137):
  // na de tweestapsverificatie, vóór de rest van de app.
  const [pendingIntake, setPendingIntake] = useState<{ userId: string; intake: MyPendingIntake | null } | null>(null);
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
    // Wacht tot profiel/settings én membership geladen zijn: vóór de
    // hydratatie is setupCompleted nog false, waardoor een directe link
    // (bv. /check-in uit een herinneringsmail) anders altijd naar
    // /instellingen werd gestuurd.
    if (authLoading || !hydrated || !user || !membershipChecked) return;
    if (!inviteChecked) return;
    // Een medewerker-/eigenaaraccount heeft hier altijd ook een eigen
    // persoonlijke patiëntdossier (ensure_personal_organization, migratie
    // 020) — zonder deze guard zou zo'n account hier stilzwijgend naar de
    // patiënt-onboarding (/instellingen) worden gestuurd i.p.v. het
    // StaffAccountScreen hieronder te zien te krijgen.
    if (staffMembership) return;
    if (!setupEffectivelyDone && !onInstellingen) {
      router.replace("/instellingen");
    }
  }, [authLoading, hydrated, user, membershipChecked, inviteChecked, setupEffectivelyDone, onInstellingen, router, staffMembership]);

  useEffect(() => {
    if (!user || !mfaSatisfied || staffMembership || !membershipChecked) return;
    if (pendingIntake?.userId === user.id) return;
    let cancelled = false;
    loadMyPendingIntake().then((intake) => {
      if (!cancelled) setPendingIntake({ userId: user.id, intake });
    });
    return () => { cancelled = true; };
  }, [user, mfaSatisfied, staffMembership, membershipChecked, pendingIntake]);

  // Zet de DB-vlag alsnog op waar (zelfhelend), zodat ook Instellingen'
  // eigen "setup nog niet afgerond"-banner klopt en dit maar één keer
  // per account hoeft te gebeuren i.p.v. elke render opnieuw af te leiden.
  useEffect(() => {
    if (hydrated && !setupCompleted && profile.blessureType) markSetupDone();
  }, [hydrated, setupCompleted, profile.blessureType, markSetupDone]);

  if (authLoading || !hydrated) return null;
  if (!user) return null;
  if (!membershipChecked) return null;
  if (staffMembership) {
    return <StaffAccountScreen organizationName={staffMembership.organizationName} onSignOut={signOut} />;
  }
  if (!statusChecked) return null;
  if (patientStatus && patientStatus !== "active") {
    return <AccountInactiveScreen status={patientStatus} onSignOut={signOut} />;
  }
  if (checkingInvite) return null;
  if (!mfaChecked) return null;
  if (!mfaSatisfied) {
    return needsEnrollment || !factorId
      ? <MfaEnrollScreen onVerified={refreshMfa} onSignOut={signOut} portalLabel="je REVA-account" />
      : <MfaChallengeScreen factorId={factorId} onVerified={refreshMfa} onSignOut={signOut} />;
  }
  if (pendingIntake?.userId !== user.id) return null;
  if (pendingIntake.intake) {
    // Na versturen herladen: de blessuregegevens staan dan in de
    // instellingen (patients_sync_settings), dus geen onboarding meer.
    return <PatientIntakeScreen pending={pendingIntake.intake} onDone={() => window.location.replace("/")} onSignOut={signOut} />;
  }
  if (!setupEffectivelyDone && !onInstellingen) return null;

  return <>{children}</>;
}
