/**
 * Vaste demo-omgeving voor live demo's met een lead (scripts/demo/setup-live-demo.mjs).
 * De praktijk begint leeg, wordt in de demo samen met de lead gevuld en gaat
 * daarna met "Demo leegmaken" (/api/demo-reset) terug naar de beginstand.
 *
 * Alleen praktijken in deze lijst kunnen worden leeggemaakt: de reset wist
 * álle dossiers, plannen, medewerkers en huisstijl van de praktijk.
 */
export const DEMO_ORG_IDS: readonly string[] = ["50d1d076-0f75-4e6c-aec9-2653515bfd8e"];

/** Vaste accounts die bij een reset blijven bestaan (met hun 2FA). */
export const DEMO_OWNER_EMAIL = "demo@demo.reva-app.nl";
export const DEMO_PATIENT_EMAIL = "patient@demo.reva-app.nl";

/** Beginstand van de praktijk na een reset. */
export const DEMO_ORG_DEFAULT_NAME = "Demopraktijk";

export function isDemoOrg(organizationId: string | null | undefined): boolean {
  return !!organizationId && DEMO_ORG_IDS.includes(organizationId);
}
