"use client";

import { Lock } from "lucide-react";
import { getFeatureLockInfo } from "@/lib/featureGates";
import { useUserPlan } from "@/lib/hooks/useUserPlan";
import { hasFullAccess } from "@/lib/subscription";
import { UpgradeModal } from "./UpgradeModal";
import { useState } from "react";

interface FeatureLockProps {
  /** Feature key from featureGates.ts (training, doel, medicatieSchema, checkIn, analyse, dossier) */
  feature: string;
  /** When omitted, renders as a standalone lock card. */
  children?: React.ReactNode;
  /** When true the children are still rendered but overlaid with a lock. Default: false = replace. */
  overlay?: boolean;
}

/**
 * Wraps content that should only be visible/usable by premium or trial users.
 *
 * - overlay=false (default): replaces content with a lock card
 * - overlay=true: renders children dimmed with a lock overlay on top
 */
export function FeatureLock({ feature, children, overlay = false }: FeatureLockProps) {
  const planInfo = useUserPlan();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Full access → render normally
  if (hasFullAccess(planInfo)) return <>{children}</>;

  const info = getFeatureLockInfo(feature);

  // No children → always render as lock card (standalone usage)
  if (!children) {
    return (
      <>
        <button
          onClick={() => setShowUpgrade(true)}
          className="w-full text-left rounded-2xl border p-5 flex items-start gap-4 transition-shadow hover:shadow-md"
          style={{
            background: "#fffdf9",
            borderColor: "#e8e1d4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <span
            className="flex items-center justify-center rounded-full w-10 h-10 shrink-0 mt-0.5"
            style={{ background: "#f5f0e8" }}
          >
            <Lock className="w-5 h-5" style={{ color: "#c8975a" }} />
          </span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{info.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{info.description}</p>
            <span
              className="inline-block mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#c8975a", color: "#ffffff" }}
            >
              Bekijk Premium
            </span>
          </div>
        </button>
        {showUpgrade && (
          <UpgradeModal feature={feature} onClose={() => setShowUpgrade(false)} />
        )}
      </>
    );
  }

  if (overlay) {
    return (
      <>
        <div className="relative">
          <div className="pointer-events-none select-none opacity-40 blur-[2px]">
            {children}
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.75)" }}
          >
            <span
              className="flex items-center justify-center rounded-full w-10 h-10"
              style={{ background: "#f5f0e8" }}
            >
              <Lock className="w-5 h-5" style={{ color: "#c8975a" }} />
            </span>
            <span className="text-sm font-semibold text-gray-800">{info.title}</span>
          </button>
        </div>

        {showUpgrade && (
          <UpgradeModal feature={feature} onClose={() => setShowUpgrade(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowUpgrade(true)}
        className="w-full text-left rounded-2xl border p-5 flex items-start gap-4 transition-shadow hover:shadow-md"
        style={{
          background: "#fffdf9",
          borderColor: "#e8e1d4",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <span
          className="flex items-center justify-center rounded-full w-10 h-10 shrink-0 mt-0.5"
          style={{ background: "#f5f0e8" }}
        >
          <Lock className="w-5 h-5" style={{ color: "#c8975a" }} />
        </span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{info.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{info.description}</p>
          <span
            className="inline-block mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "#c8975a", color: "#ffffff" }}
          >
            Bekijk Premium
          </span>
        </div>
      </button>

      {showUpgrade && (
        <UpgradeModal feature={feature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
