/**
 * featureGates.ts
 *
 * Centrale feature-gate checks op basis van het actieve plan.
 * Gebruik ALTIJD deze functies — geen losse plan-checks in componenten.
 *
 * Free limieten:
 *   - max 1 training oefening
 *   - max 1 doel
 *   - geen medicatie schema's
 *   - beperkte check-in velden (alleen dagscore)
 *   - beperkte analyse
 */

import type { PlanInfo } from "@/lib/subscription";
import { hasFullAccess } from "@/lib/subscription";

// ─── Training ─────────────────────────────────────────────────────────────────

export const FREE_TRAINING_LIMIT = 1;

export function canAddTrainingOefening(
  planInfo: PlanInfo,
  currentCount: number
): boolean {
  if (hasFullAccess(planInfo)) return true;
  return currentCount < FREE_TRAINING_LIMIT;
}

// ─── Doelen ───────────────────────────────────────────────────────────────────

export const FREE_DOELEN_LIMIT = 1;

export function canAddDoel(
  planInfo: PlanInfo,
  currentCount: number
): boolean {
  if (hasFullAccess(planInfo)) return true;
  return currentCount < FREE_DOELEN_LIMIT;
}

// ─── Medicatie schema ──────────────────────────────────────────────────────────

export function canUseMedicatieSchema(planInfo: PlanInfo): boolean {
  return hasFullAccess(planInfo);
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

/** Free-gebruikers mogen alleen de dagscore invullen (andere velden zichtbaar maar vergrendeld) */
export function canUseFullCheckIn(planInfo: PlanInfo): boolean {
  return hasFullAccess(planInfo);
}

// ─── Analyse ─────────────────────────────────────────────────────────────────

export function canViewFullAnalyse(planInfo: PlanInfo): boolean {
  return hasFullAccess(planInfo);
}

// ─── Dossier ─────────────────────────────────────────────────────────────────

export const FREE_DOSSIER_LIMIT = 3;

export function canAddDossierDocument(
  planInfo: PlanInfo,
  currentCount: number
): boolean {
  if (hasFullAccess(planInfo)) return true;
  return currentCount < FREE_DOSSIER_LIMIT;
}

// ─── Unlock bericht per feature ───────────────────────────────────────────────

export interface FeatureLockInfo {
  title: string;
  description: string;
}

export function getFeatureLockInfo(feature: string): FeatureLockInfo {
  const map: Record<string, FeatureLockInfo> = {
    training: {
      title: "Meer trainingen met Premium",
      description:
        "Met REVA Premium voeg je onbeperkt oefeningen en schema's toe aan je herstelplan.",
    },
    doel: {
      title: "Meer doelen met Premium",
      description:
        "Stel meerdere doelen in en volg je volledige herstelproces met REVA Premium.",
    },
    medicatieSchema: {
      title: "Medicatie schema's met Premium",
      description:
        "Plan je medicatie automatisch in en ontvang herinneringen. Beschikbaar met REVA Premium.",
    },
    checkIn: {
      title: "Uitgebreide check-ins met Premium",
      description:
        "Leg pijn, mobiliteit, energie, slaap en stemming gedetailleerd vast met REVA Premium.",
    },
    analyse: {
      title: "Volledige analyse met Premium",
      description:
        "Zie trends, grafieken en inzichten over je complete herstelperiode met REVA Premium.",
    },
    dossier: {
      title: "Meer documenten met Premium",
      description:
        "Sla onbeperkt medische documenten op in je dossier met REVA Premium.",
    },
  };

  return map[feature] ?? {
    title: "Beschikbaar met Premium",
    description: "Upgrade naar REVA Premium voor volledige toegang.",
  };
}
