"use client";

import { useEffect } from "react";
import { applyBrandVars, readBrandCache } from "@/lib/brandCache";

/**
 * Zet bij het openen van REVA meteen de laatst bekende praktijkkleur, zodat
 * ook inloggen, 2FA en uitnodigingen in de stijl van de praktijk staan. De
 * layouts nemen het daarna over met de actuele huisstijl. Het beheerportaal
 * blijft in de REVA-stijl.
 */
export function BrandBoot() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    applyBrandVars(readBrandCache()?.color);
  }, []);
  return null;
}
