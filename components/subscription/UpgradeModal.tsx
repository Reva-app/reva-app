"use client";

import { X, Zap, CheckCircle } from "lucide-react";
import { getFeatureLockInfo } from "@/lib/featureGates";
import { useUserPlan } from "@/lib/hooks/useUserPlan";

interface UpgradeModalProps {
  feature?: string;
  onClose: () => void;
}

const PREMIUM_FEATURES = [
  "Onbeperkt oefeningen en trainingsschema's",
  "Onbeperkt doelen instellen",
  "Medicatieschema's met herinneringen",
  "Volledige dagelijkse check-ins",
  "Uitgebreide analyse en grafieken",
  "Onbeperkt medische documenten",
];

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const planInfo = useUserPlan();
  const lockInfo = feature ? getFeatureLockInfo(feature) : null;

  const isExpired = planInfo.plan === "free" && planInfo.trialJustExpired;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      {/* Scrollable sheet — stops click propagation so tapping inside doesn't close */}
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{
          background: "#ffffff",
          maxHeight: "92dvh",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-6 py-7 text-center"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{ background: "rgba(200,151,90,0.2)" }}
          >
            <Zap className="w-6 h-6" style={{ color: "#c8975a" }} />
          </div>

          <h2 className="text-lg font-bold text-white mb-1">
            {isExpired ? "Je trial is verlopen" : "Upgrade naar Premium"}
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            {lockInfo
              ? lockInfo.description
              : "Ontgrendel alle functies voor je volledige herstel."}
          </p>
        </div>

        {/* Features list */}
        <div className="px-6 pt-5 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Alles inbegrepen
          </p>
          <ul className="space-y-2.5">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: "#c8975a" }}
                />
                <span className="text-sm text-gray-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing + CTA */}
        <div className="px-6 pb-4 pt-2 space-y-3">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "#f9f7f3", border: "1px solid #e8e1d4" }}
          >
            <span className="text-3xl font-bold text-gray-900">€4,99</span>
            <span className="text-gray-500 text-sm"> / maand</span>
            <p className="text-xs text-gray-400 mt-1">Opzegbaar per maand</p>
          </div>

          <button
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity active:opacity-80"
            style={{ background: "#c8975a" }}
            onClick={() => {
              // TODO: wire up payment provider (RevenueCat / Stripe)
              onClose();
            }}
          >
            Start met Premium
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-400"
          >
            Misschien later
          </button>
        </div>
      </div>
    </div>
  );
}
