"use client";

import { useAppData } from "@/lib/store";
import { usePatientCareContext } from "@/lib/hooks/usePatientCareContext";
import type { Contactpersoon } from "@/lib/data";

/** Vast id van het automatisch toegevoegde behandelaar-contact, zie useMergedContactpersonen. */
export const THERAPIST_CONTACT_ID = "__care_team_therapist__";

/**
 * `contactpersonen` uit de patiëntenstore, met de behandelend fysiotherapeut
 * (uit usePatientCareContext) er automatisch vóór geplaatst — puur
 * render-time samengevoegd, niet opgeslagen. Gebruikt door zowel het
 * dossier (Contactpersonen-tab) als Afspraken (behandelaar-keuze bij een
 * nieuwe afspraak), zodat de fysio overal consistent verschijnt.
 */
export function useMergedContactpersonen(): Contactpersoon[] {
  const { contactpersonen } = useAppData();
  const careContext = usePatientCareContext();

  const therapistContact: Contactpersoon | null = careContext?.therapistName ? {
    id: THERAPIST_CONTACT_ID,
    naam: careContext.therapistName,
    functie: "Fysiotherapeut (behandelend)",
    organisatie: careContext.organizationName ?? "",
    telefoon: careContext.therapistPhone ?? "",
    email: careContext.therapistEmail ?? "",
  } : null;

  return therapistContact ? [therapistContact, ...contactpersonen] : contactpersonen;
}
