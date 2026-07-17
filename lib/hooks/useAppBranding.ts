"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadPatientOrganizationBranding } from "@/lib/services/brandingService";
import type { PortalBranding } from "@/lib/services/portalService";

/**
 * Huisstijl van de praktijk waar de ingelogde patiënt onder valt (indien
 * van toepassing) — logo/kleur/naam. Bewust los van AppDataProvider/
 * useAppData gehouden, zelfde reden als usePortalMembership los van de
 * patiëntenstore staat: dit is geen patiëntdata, maar weergave-informatie
 * over de organisatie. Voor patiënten zonder (gebrande) praktijk — bv. de
 * eigen persoonlijke werkruimte — komt gewoon `null`/lege velden terug,
 * waarna de UI netjes terugvalt op de standaard REVA-uitstraling.
 */
export function useAppBranding(): PortalBranding | null {
  const { user, loading: authLoading } = useAuth();
  const [branding, setBranding] = useState<PortalBranding | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    loadPatientOrganizationBranding().then((data) => {
      if (!cancelled) setBranding(data);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return branding;
}
