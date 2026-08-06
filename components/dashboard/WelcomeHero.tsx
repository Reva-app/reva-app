"use client";

import { useEffect, useRef } from "react";

interface WelcomeHeroProps {
  firstName: string;
  blessureContext: string;
  dagsSindsBlessure: number;
  faseNaam: string;
  onShown: () => void;
}

/**
 * Eenmalig welkomstmoment na afronding van de intake + REVA Analyse door de
 * therapeut (zie components/portal/wizard/RevaAnalyseStep.tsx). Wordt door
 * app/(app)/page.tsx alleen gerenderd zolang patients.welcomed_at nog leeg
 * is (usePatientWelcome) — markeert zichzelf bij het tonen als gezien, dus
 * verschijnt bij een volgend bezoek niet meer terug.
 */
export function WelcomeHero({ firstName, blessureContext, dagsSindsBlessure, faseNaam, onShown }: WelcomeHeroProps) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    onShown();
  }, [onShown]);

  return (
    <div
      className="rounded-3xl p-6 sm:p-8"
      style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <p className="text-2xl font-bold text-white leading-tight mb-2">
        Welkom{firstName ? `, ${firstName}` : ""}! 👋
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "#a8a8ad" }}>
        {blessureContext
          ? `We hebben je persoonlijke herstelplan voor je herstel van ${blessureContext} klaargezet.`
          : "We hebben je persoonlijke herstelplan voor je klaargezet."}
        {" "}Je bent nu op dag {dagsSindsBlessure}{faseNaam ? ` van ${faseNaam.toLowerCase()}` : ""}. Hier vind je alles voor je herstel op één plek.
      </p>
    </div>
  );
}
