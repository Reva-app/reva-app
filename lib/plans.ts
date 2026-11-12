/**
 * Pakketten van REVA — één bron voor namen, prijzen en aantallen.
 *
 * Sinds de RMP-koers (november 2026, migratie 136) betaalt een praktijk per
 * behandelaar, met een getrapte staffel: behandelaar 1 t/m 9 kosten
 * SEAT_PRICE, elke behandelaar vanaf de 10e VOLUME_SEAT_PRICE. Getrapt (en
 * niet "alles goedkoper vanaf 10") zodat een extra behandelaar nooit tot een
 * lagere totaalprijs leidt. Patiënten en vestigingen zijn onbeperkt.
 *
 * Maatwerk (ketens, afwijkende afspraken) heeft een vrij in te vullen
 * maandbedrag en eigen limieten.
 */
export type PlanKey = "behandelaar" | "maatwerk";
export type BillingInterval = "month" | "year";

/** Vanaf dit aantal tonen we "onbeperkt" (de kolommen voor medewerkers/vestigingen kunnen niet leeg zijn). */
export const UNLIMITED = 999;

/** Jaarlijks betalen = 2 maanden gratis. */
export const YEARLY_MONTHS_CHARGED = 10;

export const PATIENT_WARNING_RATIO = 0.9;

/** Maandprijs per behandelaar (excl. btw), behandelaar 1 t/m VOLUME_FROM - 1. */
export const SEAT_PRICE = 24;
/** Maandprijs per behandelaar vanaf de VOLUME_FROM-de behandelaar. */
export const VOLUME_SEAT_PRICE = 19;
export const VOLUME_FROM = 10;

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  /** Mogen de limieten en prijs per organisatie worden aangepast? */
  customizable: boolean;
  maxMembers: number;
  maxLocations: number;
  /** null = onbeperkt */
  maxPatients: number | null;
  support: string;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  behandelaar: {
    key: "behandelaar", name: "Per behandelaar", customizable: false,
    maxMembers: UNLIMITED, maxLocations: UNLIMITED, maxPatients: null,
    support: "Persoonlijke onboarding en support per e-mail en telefoon",
  },
  maatwerk: {
    key: "maatwerk", name: "Maatwerk", customizable: true,
    maxMembers: UNLIMITED, maxLocations: UNLIMITED, maxPatients: null,
    support: "Vaste contactpersoon",
  },
};

export const PLAN_ORDER: PlanKey[] = ["behandelaar", "maatwerk"];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && value in PLANS;
}

/** Maandbedrag voor `seats` behandelaars volgens de getrapte staffel. */
export function seatsMonthlyPrice(seats: number): number {
  const n = Math.max(0, Math.floor(seats));
  const regular = Math.min(n, VOLUME_FROM - 1);
  const volume = Math.max(0, n - (VOLUME_FROM - 1));
  return regular * SEAT_PRICE + volume * VOLUME_SEAT_PRICE;
}

/**
 * Werkelijke maandprijs: bij Maatwerk het afgesproken bedrag, anders de
 * staffelprijs voor het aantal behandelaars (minimaal 1).
 */
export function effectiveMonthlyPrice(plan: PlanKey | null, customMonthlyPriceCents: number | null, seats: number): number | null {
  if (!plan) return null;
  if (PLANS[plan].customizable) return customMonthlyPriceCents !== null ? customMonthlyPriceCents / 100 : null;
  return seatsMonthlyPrice(Math.max(1, seats));
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}

/** Bijv. "€72 per maand" of "€720 per jaar". */
export function priceLabel(plan: PlanKey | null, customMonthlyPriceCents: number | null, interval: BillingInterval, seats: number): string {
  const monthly = effectiveMonthlyPrice(plan, customMonthlyPriceCents, seats);
  if (monthly === null) return "Prijs volgens afspraak";
  return interval === "year"
    ? `${formatEuro(monthly * YEARLY_MONTHS_CHARGED)} per jaar`
    : `${formatEuro(monthly)} per maand`;
}

/** "€24 per behandelaar per maand, vanaf de 10e €19" — voor uitleg in de UI. */
export const SEAT_PRICE_EXPLANATION =
  `${formatEuro(SEAT_PRICE)} per behandelaar per maand, vanaf de ${VOLUME_FROM}e behandelaar ${formatEuro(VOLUME_SEAT_PRICE)}`;

export function limitLabel(value: number | null): string {
  return value === null || value >= UNLIMITED ? "Onbeperkt" : value.toLocaleString("nl-NL");
}
