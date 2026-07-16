"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortalMembership } from "./usePortalMembership";
import { loadPortalBranding, type PortalBranding } from "@/lib/services/portalService";

export interface PortalBrandingResult {
  branding: PortalBranding | null;
  /** Herlaadt de huisstijl, bv. na een geslaagde upload/wijziging in de instellingen. */
  refresh: () => void;
}

/**
 * Laadt naam/kleur/logo van de organisatie van de huidige medewerker.
 * Losstaand van usePortalMembership gehouden (net als loadPortalPatientExtras
 * los van loadPortalPatients) — dit is puur de weergavelaag, geen
 * lidmaatschapsgegevens.
 */
export function usePortalBranding(): PortalBrandingResult {
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

  return { branding, refresh };
}
