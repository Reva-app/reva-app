"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePortalMembership } from "./usePortalMembership";
import { loadPortalBranding, type PortalBranding } from "@/lib/services/portalService";

export interface PortalBrandingResult {
  branding: PortalBranding | null;
  /** Herlaadt de huisstijl, bv. na een geslaagde upload/wijziging in de instellingen. */
  refresh: () => void;
}

const PortalBrandingContext = createContext<PortalBrandingResult | null>(null);

/**
 * Eén gedeelde huisstijl-fetch per Practice Portal-sessie (gemount in
 * PortalLayout) — zonder deze provider had elke aanroeper van
 * usePortalBranding() zijn eigen onafhankelijke state, waardoor een refresh()
 * na het opslaan van de huisstijl (huisstijl/page.tsx) de zijbalk/mobiele
 * balk niet meenam en alleen een volledige window.location.reload() hielp.
 */
export function PortalBrandingProvider({ children }: { children: ReactNode }) {
  const { membership } = usePortalMembership();
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!membership) return;
    let cancelled = false;
    loadPortalBranding(membership.organizationId).then((data) => {
      if (!cancelled) setBranding(data);
    });
    return () => {
      cancelled = true;
    };
  }, [membership, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <PortalBrandingContext.Provider value={{ branding, refresh }}>
      {children}
    </PortalBrandingContext.Provider>
  );
}

/**
 * Laadt naam/kleur/logo van de organisatie van de huidige medewerker. Moet
 * binnen PortalBrandingProvider gebruikt worden (gemount in PortalLayout).
 */
export function usePortalBranding(): PortalBrandingResult {
  const ctx = useContext(PortalBrandingContext);
  if (!ctx) throw new Error("usePortalBranding moet binnen PortalBrandingProvider gebruikt worden");
  return ctx;
}
