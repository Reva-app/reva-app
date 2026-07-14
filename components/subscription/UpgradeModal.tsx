"use client";

import { useState } from "react";
import { X, Zap, CheckCircle, Star } from "lucide-react";
import { getFeatureLockInfo } from "@/lib/featureGates";
import { useUserPlan } from "@/lib/hooks/useUserPlan";

interface UpgradeModalProps {
  feature?: string;
  onClose: () => void;
}

const PREMIUM_FEATURES = [
  "Volledige dagelijkse check-ins (pijn, energie, slaap)",
  "Medicatieschema's met push herinneringen",
  "Onbeperkt trainingen en oefeningen",
  "Onbeperkt doelen instellen en bijhouden",
  "Uitgebreide analyse en voortgangsgrafieken",
  "Onbeperkt medische documenten bewaren",
];

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const planInfo = useUserPlan();
  const lockInfo = feature ? getFeatureLockInfo(feature) : null;
  const [selected, setSelected] = useState<"yearly" | "monthly">("yearly");

  const isTrialExpired = planInfo.plan === "free" && planInfo.trialJustExpired;
  const isTrial        = planInfo.plan === "trial";

  // Prijzen
  const MONTHLY_PRICE    = "€5,99";
  const YEARLY_PRICE     = "€49,95";
  const YEARLY_PER_MONTH = "€4,16";
  const YEARLY_DISCOUNT  = "30%";

  const urgencyText = isTrialExpired
    ? "Je trial is verlopen: kies een plan om door te gaan"
    : isTrial
      ? `Nog ${planInfo.trialDaysLeft} ${planInfo.trialDaysLeft === 1 ? "dag" : "dagen"} gratis: kies nu je plan`
      : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{
          background: "#ffffff",
          maxHeight: "92dvh",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="relative px-6 pt-7 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{ background: "rgba(200,151,90,0.2)" }}
          >
            <Zap className="w-7 h-7" style={{ color: "#c8975a" }} />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            REVA Premium
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {lockInfo
              ? lockInfo.description
              : "Alles wat je nodig hebt voor een succesvol hersteltraject."}
          </p>

          {/* Urgency pill */}
          {urgencyText && (
            <div
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(200,151,90,0.25)", color: "#e8b97a" }}
            >
              <Star className="w-3 h-3 fill-current" />
              {urgencyText}
            </div>
          )}
        </div>

        {/* ── Pricing plans ──────────────────────────────────────────────── */}
        <div className="px-5 pt-5 space-y-3">

          {/* Jaarlijks — aanbevolen */}
          <button
            onClick={() => setSelected("yearly")}
            className="w-full rounded-2xl p-4 text-left transition-all relative"
            style={{
              border:     selected === "yearly" ? "2px solid #c8975a" : "2px solid #e8e1d4",
              background: selected === "yearly" ? "#fdf9f4" : "#ffffff",
            }}
          >
            {/* Meest gekozen badge */}
            <span
              className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
              style={{ background: "#c8975a" }}
            >
              MEEST GEKOZEN
            </span>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Jaarlijks</p>
                <p className="text-xs mt-0.5" style={{ color: "#c8975a" }}>
                  {YEARLY_PER_MONTH}/maand · gefactureerd per jaar
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{YEARLY_PRICE}</p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "#c8975a" }}
                >
                  -{YEARLY_DISCOUNT}
                </span>
              </div>
            </div>

            {/* Radio indicator */}
            <div className="absolute top-4 right-4 flex items-center">
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: selected === "yearly" ? "#c8975a" : "#d1d5db",
                  background:  selected === "yearly" ? "#c8975a" : "transparent",
                }}
              >
                {selected === "yearly" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </button>

          {/* Maandelijks */}
          <button
            onClick={() => setSelected("monthly")}
            className="w-full rounded-2xl p-4 text-left transition-all"
            style={{
              border:     selected === "monthly" ? "2px solid #c8975a" : "2px solid #e8e1d4",
              background: selected === "monthly" ? "#fdf9f4" : "#ffffff",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Maandelijks</p>
                <p className="text-xs mt-0.5 text-gray-400">Opzegbaar per maand</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{MONTHLY_PRICE}</p>
                <p className="text-xs text-gray-400">per maand</p>
              </div>
            </div>

            {/* Radio indicator */}
            <div className="absolute right-9 flex items-center" style={{ marginTop: "-2.2rem" }}>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: selected === "monthly" ? "#c8975a" : "#d1d5db",
                  background:  selected === "monthly" ? "#c8975a" : "transparent",
                }}
              >
                {selected === "monthly" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Alles inbegrepen bij Premium
          </p>
          <ul className="space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: "#c8975a" }}
                />
                <span className="text-sm text-gray-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="px-5 pt-4 space-y-2.5">
          <button
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-opacity active:opacity-80"
            style={{ background: "linear-gradient(135deg, #c8975a 0%, #b5823f 100%)" }}
            onClick={() => {
              // TODO: wire up payment provider (RevenueCat / Stripe)
              onClose();
            }}
          >
            {selected === "yearly"
              ? `Start Premium: ${YEARLY_PRICE}/jaar`
              : `Start Premium: ${MONTHLY_PRICE}/maand`}
          </button>

          {selected === "yearly" && (
            <p className="text-center text-xs text-gray-400">
              Dat is {YEARLY_PER_MONTH}/maand, je bespaart {YEARLY_DISCOUNT} t.o.v. maandelijks
            </p>
          )}

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
