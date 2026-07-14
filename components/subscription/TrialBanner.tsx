"use client";

import { Zap, X } from "lucide-react";
import { useState } from "react";
import { useUserPlan } from "@/lib/hooks/useUserPlan";
import { UpgradeModal } from "./UpgradeModal";

export function TrialBanner() {
  const planInfo = useUserPlan();
  const [dismissed, setDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Wacht tot profiel geladen is — voorkom flikkering met verkeerde dagentelling
  if (!planInfo.hydrated) return null;

  // Nooit tonen voor premium
  if (planInfo.plan === "premium") return null;

  // Eenmalig gesloten — verberg tot volgende mount
  if (dismissed) return null;

  // Trial verlopen — persistente CTA, hele balk is klikbaar
  if (planInfo.plan === "free" && planInfo.trialJustExpired) {
    return (
      <>
        <button
          onClick={() => setShowUpgrade(true)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-white text-sm transition-opacity active:opacity-90"
          style={{ background: "#1a1a2e" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 shrink-0" style={{ color: "#c8975a" }} />
            <span className="text-left leading-snug">
              <span className="opacity-80">Je gratis proefperiode is verlopen.</span>
              <span className="ml-1 font-semibold" style={{ color: "#c8975a" }}>
                Upgrade naar Premium →
              </span>
            </span>
          </div>
          <span
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
            style={{ background: "#c8975a", color: "#ffffff" }}
          >
            Bekijk plannen
          </span>
        </button>

        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  // Actieve trial — toon echte resterende dagen
  if (planInfo.plan === "trial") {
    const days   = planInfo.trialDaysLeft;
    const isLast = planInfo.trialLastDay;

    const message = isLast
      ? "Laatste dag van je gratis Premium trial."
      : `Je hebt nog ${days} ${days === 1 ? "dag" : "dagen"} Premium gratis.`;

    return (
      <>
        <div
          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
          style={{
            background: isLast ? "#c8975a" : "#f5f0e8",
            color:      isLast ? "#ffffff" : "#7c5c30",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {message}{" "}
              <button
                onClick={() => setShowUpgrade(true)}
                className="underline font-semibold"
              >
                Bekijk plannen
              </button>
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return null;
}
