/**
 * Pakketten van REVA — één bron voor namen, prijzen en aantallen (migratie 130).
 * Wijzig je hier een prijs of aantal, dan geldt dat voor nieuwe keuzes in de
 * beheeromgeving; bestaande organisaties houden hun opgeslagen limieten tot
 * je het pakket daar opnieuw opslaat.
 */
export type PlanKey = "solo" | "team" | "praktijk" | "praktijk_plus" | "enterprise" | "maatwerk";
export type BillingInterval = "month" | "year";

/** Vanaf dit aantal tonen we "onbeperkt" (de kolommen voor medewerkers/vestigingen kunnen niet leeg zijn). */
export const UNLIMITED = 999;

/** Jaarlijks betalen = 2 maanden gratis. */
export const YEARLY_MONTHS_CHARGED = 10;

export const PATIENT_WARNING_RATIO = 0.9;

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  /** Maandprijs in euro's; bij Enterprise een vanaf-prijs, bij Maatwerk geen. */
  monthlyPrice: number | null;
  priceIsFrom: boolean;
  /** Mogen de limieten en prijs per organisatie worden aangepast? */
  customizable: boolean;
  maxMembers: number;
  maxLocations: number;
  /** null = onbeperkt */
  maxPatients: number | null;
  support: string;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  solo: { key: "solo", name: "Solo", monthlyPrice: 49, priceIsFrom: false, customizable: false, maxMembers: 1, maxLocations: 1, maxPatients: 200, support: "E-mailsupport" },
  team: { key: "team", name: "Team", monthlyPrice: 129, priceIsFrom: false, customizable: false, maxMembers: 5, maxLocations: 2, maxPatients: 750, support: "E-mail- en telefoonsupport" },
  praktijk: { key: "praktijk", name: "Praktijk", monthlyPrice: 229, priceIsFrom: false, customizable: false, maxMembers: 10, maxLocations: 3, maxPatients: 1500, support: "E-mail- en telefoonsupport en persoonlijke onboarding" },
  praktijk_plus: { key: "praktijk_plus", name: "Praktijk Plus", monthlyPrice: 349, priceIsFrom: false, customizable: false, maxMembers: 20, maxLocations: 5, maxPatients: 3000, support: "Persoonlijke onboarding en prioriteitsondersteuning" },
  enterprise: { key: "enterprise", name: "Enterprise", monthlyPrice: 699, priceIsFrom: true, customizable: true, maxMembers: 30, maxLocations: UNLIMITED, maxPatients: null, support: "Persoonlijke accountmanager" },
  maatwerk: { key: "maatwerk", name: "Maatwerk", monthlyPrice: null, priceIsFrom: false, customizable: true, maxMembers: 10, maxLocations: 3, maxPatients: 1000, support: "Volgens afspraak" },
};

export const PLAN_ORDER: PlanKey[] = ["solo", "team", "praktijk", "praktijk_plus", "enterprise", "maatwerk"];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && value in PLANS;
}

/** Werkelijke maandprijs: afwijkende prijs (Enterprise/Maatwerk) of de standaardprijs. */
export function effectiveMonthlyPrice(plan: PlanKey | null, customMonthlyPriceCents: number | null): number | null {
  if (!plan) return null;
  if (PLANS[plan].customizable && customMonthlyPriceCents !== null) return customMonthlyPriceCents / 100;
  return PLANS[plan].monthlyPrice;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}

/** Bijv. "€129 per maand" of "€1.290 per jaar". */
export function priceLabel(plan: PlanKey | null, customMonthlyPriceCents: number | null, interval: BillingInterval): string {
  const monthly = effectiveMonthlyPrice(plan, customMonthlyPriceCents);
  if (monthly === null) return "Prijs volgens afspraak";
  return interval === "year"
    ? `${formatEuro(monthly * YEARLY_MONTHS_CHARGED)} per jaar`
    : `${formatEuro(monthly)} per maand`;
}

export function limitLabel(value: number | null): string {
  return value === null || value >= UNLIMITED ? "Onbeperkt" : value.toLocaleString("nl-NL");
}
