"use client";

import { Zap, X } from "lucide-react";
import { useState } from "react";
import { useUserPlan } from "@/lib/hooks/useUserPlan";
import { UpgradeModal } from "./UpgradeModal";

/**
 * Shows a sticky banner at the top of the app during the trial period
 * and when the trial has just expired.
 * Returns null for free users without a recent trial and premium users.
 */
export function TrialBanner() {
  const planInfo = useUserPlan();
  const [dismissed, setDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Never show for premium
  if (planInfo.plan === "premium") return null;

  // Once dismissed, hide until next mount
  if (dismissed) return null;

  // Trial expired — persistent call-to-action
  if (planInfo.plan === "free" && planInfo.trialJustExpired) {
    return (
      <>
        <div
          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-white text-sm"
          style={{ background: "#1a1a2e" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 shrink-0" style={{ color: "#c8975a" }} />
            <span className="truncate">
              Je gratis proefperiode is verlopen.{" "}
              <button
                onClick={() => setShowUpgrade(true)}
                className="underline font-semibold"
                style={{ color: "#c8975a" }}
              >
                Upgrade naar Premium
              </button>
            </span>
          </div>
        </div>

        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} />
        )}
      </>
    );
  }

  // Active trial
  if (planInfo.plan === "trial") {
    const days = planInfo.trialDaysLeft;
    const isLast = planInfo.trialLastDay;

    const message = isLast
      ? "Laatste dag van je gratis REVA Premium trial."
      : `${days} ${days === 1 ? "dag" : "dagen"} Premium gratis.`;

    return (
      <>
        <div
          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
          style={{ background: isLast ? "#c8975a" : "#f5f0e8", color: isLast ? "#ffffff" : "#7c5c30" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {message}{" "}
              <button
                onClick={() => setShowUpgrade(true)}
                className="underline font-semibold"
              >
                Bekijk Premium
              </button>
            </span>
          </div>
          <button onClick={() => setDismissed(true)} className="shrink-0 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} />
        )}
      </>
    );
  }

  return null;
}
