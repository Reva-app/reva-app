/**
 * subscription.ts
 *
 * Centrale entitlement-logica voor REVA.
 * Gebruik getUserPlan() overal waar je plan-checks nodig hebt.
 *
 * Plan-hiërarchie:
 *   premium  → actief abonnement (of developer-account)
 *   trial    → binnen de 4-daagse proefperiode
 *   free     → geen actief abonnement en trial verlopen
 */

import type { Profile } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserPlan = "trial" | "free" | "premium";

export interface PlanInfo {
  plan: UserPlan;
  /** Aantal dagen dat de trial nog loopt (alleen relevant als plan === "trial") */
  trialDaysLeft: number;
  /** True als de trial vandaag verloopt */
  trialLastDay: boolean;
  /** True als de trial zojuist is verlopen (plan is "free" maar trial_end_date bestaat) */
  trialJustExpired: boolean;
}

// ─── Developer bypass ─────────────────────────────────────────────────────────

const DEV_EMAILS = new Set(["stef.robberts1@gmail.com"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msToFullDays(ms: number): number {
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ─── Core entitlement ─────────────────────────────────────────────────────────

/**
 * Berekent het actieve plan van een gebruiker.
 *
 * @param profile  Het gehydrateerde profiel uit de store
 * @param email    Het e-mailadres van de ingelogde gebruiker (voor dev-bypass)
 * @param now      Optioneel tijdstip voor testdoeleinden (default: Date.now())
 */
export function getUserPlan(
  profile: Profile,
  email: string | null | undefined,
  now = new Date()
): PlanInfo {
  // ── Developer-account: altijd premium ─────────────────────────────────────
  if (email && DEV_EMAILS.has(email)) {
    return {
      plan:             "premium",
      trialDaysLeft:    0,
      trialLastDay:     false,
      trialJustExpired: false,
    };
  }

  // ── Actief abonnement ─────────────────────────────────────────────────────
  if (
    profile.subscriptionStatus === "active" &&
    profile.planType === "premium"
  ) {
    const expiresAt = profile.subscriptionExpiresAt
      ? new Date(profile.subscriptionExpiresAt)
      : null;
    if (!expiresAt || expiresAt > now) {
      return {
        plan:             "premium",
        trialDaysLeft:    0,
        trialLastDay:     false,
        trialJustExpired: false,
      };
    }
  }

  // ── Trial ─────────────────────────────────────────────────────────────────
  if (profile.trialEndDate) {
    const trialEnd = new Date(profile.trialEndDate);
    const msLeft   = trialEnd.getTime() - now.getTime();

    if (msLeft > 0) {
      const daysLeft = msToFullDays(msLeft);
      return {
        plan:             "trial",
        trialDaysLeft:    daysLeft,
        trialLastDay:     daysLeft === 1,
        trialJustExpired: false,
      };
    }

    // Trial net verlopen (trialEndDate bestaat maar is in het verleden)
    return {
      plan:             "free",
      trialDaysLeft:    0,
      trialLastDay:     false,
      trialJustExpired: true,
    };
  }

  // ── Free ──────────────────────────────────────────────────────────────────
  return {
    plan:             "free",
    trialDaysLeft:    0,
    trialLastDay:     false,
    trialJustExpired: false,
  };
}

/**
 * True als de gebruiker volledige toegang heeft (trial of premium).
 */
export function hasFullAccess(planInfo: PlanInfo): boolean {
  return planInfo.plan === "premium" || planInfo.plan === "trial";
}
