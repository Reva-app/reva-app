"use client";

import { useEffect, useState } from "react";
import { Check, Mail } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { loadPortalPlanUsage, MANAGE_BRANDING_ROLES, type PortalPlanUsage } from "@/lib/services/portalService";
import { PLANS, UNLIMITED, PATIENT_WARNING_RATIO, SEAT_PRICE_EXPLANATION, VAT_NOTE, priceLabel, limitLabel } from "@/lib/plans";
import { trialState, dayLabel } from "@/lib/trial";

function UsageRow({ label, used, max, hint }: { label: string; used: number | null; max: number | null; hint: string }) {
  const unlimited = max === null || max >= UNLIMITED;
  const ratio = !unlimited && used !== null && max! > 0 ? used / max! : 0;
  const color = ratio > 1 ? "#b91c1c" : ratio >= PATIENT_WARNING_RATIO ? "#c2410c" : "var(--brand-accent, #e8632a)";
  return (
    <div className="py-4 first:pt-0 last:pb-0" style={{ borderTop: "1px solid #f0eee8" }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{used ?? "—"}</span> van {limitLabel(max)}
        </p>
      </div>
      {!unlimited && (
        <div className="h-2 rounded-full mt-2.5 overflow-hidden" style={{ background: "#f0eee8" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }} />
        </div>
      )}
      <p className="text-xs text-subtle mt-2">{hint}</p>
    </div>
  );
}

/** Pakket en verbruik van de praktijk (migratie 130). Alleen voor de Practice Owner. */
export default function PortalAbonnementPage() {
  const { checked, membership } = usePortalMembership();
  const [usage, setUsage] = useState<PortalPlanUsage | null>(null);
  const canView = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);
  const organizationId = membership?.organizationId;

  useEffect(() => {
    if (!canView || !organizationId) return;
    let cancelled = false;
    loadPortalPlanUsage(organizationId).then((u) => { if (!cancelled) setUsage(u); });
    return () => { cancelled = true; };
  }, [canView, organizationId]);

  if (checked && membership && !canView) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <SectionHeader title="Abonnement" subtitle="Pakket en verbruik van je praktijk" />
        <p className="text-sm text-subtle mt-4">Alleen de Practice Owner kan het abonnement bekijken.</p>
      </div>
    );
  }
  if (!membership) return null;

  const plan = membership.plan ? PLANS[membership.plan] : null;
  const trial = trialState(membership.organizationStatus, membership.trialEndsAt);
  const patientsOver = membership.maxPatients !== null && usage !== null && usage.activePatients > membership.maxPatients;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Abonnement" subtitle="Pakket en verbruik van je praktijk" />

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-accent, #e8632a)" }}>
              {plan ? plan.name : "Pakket"}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {!plan
                ? "Nog geen pakket"
                : !plan.customizable && usage === null
                  ? "…"
                  : priceLabel(membership.plan, membership.customMonthlyPriceCents, membership.billingInterval, usage?.members ?? 1)}
            </p>
            {plan && (
              <p className="text-xs text-subtle mt-1">
                {!plan.customizable && usage !== null && `${usage.members} ${usage.members === 1 ? "behandelaar" : "behandelaars"} · `}
                {membership.billingInterval === "year" ? "Jaarlijks betaald, 2 maanden gratis" : "Maandelijks betaald"} · {VAT_NOTE}
              </p>
            )}
          </div>
          {trial.kind === "trial" && <Badge variant="warning">Proefperiode · nog {dayLabel(trial.daysLeft)}</Badge>}
          {trial.kind === "grace" && <Badge variant="danger">Proefperiode verlopen</Badge>}
          {membership.organizationStatus === "active" && <Badge variant="success">Actief</Badge>}
        </div>
        {plan && (
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ...(plan.customizable ? [] : [SEAT_PRICE_EXPLANATION]),
              "Alle functies van REVA",
              "Onbeperkt patiënten en vestigingen",
              plan.support,
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={15} style={{ color: "var(--brand-accent, #e8632a)" }} /> {item}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Verbruik" subtitle="Hoeveel van je pakket je nu gebruikt" />
        <UsageRow
          label="Behandelaars"
          used={usage?.members ?? null}
          max={membership.maxMembers}
          hint={plan && !plan.customizable
            ? "Iedere medewerker met toegang tot het praktijkportaal telt mee voor de prijs, inclusief openstaande uitnodigingen."
            : "Inclusief openstaande uitnodigingen."}
        />
        <UsageRow
          label="Vestigingen"
          used={usage?.locations ?? null}
          max={membership.maxLocations}
          hint="Gearchiveerde vestigingen tellen niet mee."
        />
        <UsageRow
          label="Actieve patiënten"
          used={usage?.activePatients ?? null}
          max={membership.maxPatients}
          hint={patientsOver
            ? "Je zit boven het aantal van je pakket. Je kunt gewoon doorwerken; we nemen contact met je op over een passend pakket."
            : "Patiënten van wie de behandeling is afgerond tellen niet mee."}
        />
      </Card>

      <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#ffffff", border: "1px solid #e8e5df" }}>
        <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600 leading-relaxed">
          Wil je overstappen naar een ander pakket of heb je vragen over je abonnement? Mail naar{" "}
          <a href="mailto:info@reva-app.nl" className="font-medium hover:underline" style={{ color: "var(--brand-accent, #e8632a)" }}>info@reva-app.nl</a>.
        </p>
      </div>
    </div>
  );
}
