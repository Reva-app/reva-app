"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check, Clock, UserCircle, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadEmployeeOnboardingStatus, markMembershipWelcomed, type PortalDashboardStats } from "@/lib/services/portalService";

interface EmployeeWelcomePanelProps {
  membershipId: string;
  userId: string;
  organizationName: string;
  roleName: string;
  stats: PortalDashboardStats;
  onDismiss: () => void;
}

/**
 * Rolgebonden variant van WelcomePanel voor medewerkers (elke rol behalve
 * organization_owner) — bewust géén "locatie aanmaken"-stap, want alleen de
 * eigenaar heeft daar rechten toe (zie can_manage_org_branding/locations RLS).
 */
export function EmployeeWelcomePanel({ membershipId, userId, organizationName, roleName, stats, onDismiss }: EmployeeWelcomePanelProps) {
  const [status, setStatus] = useState<{ hasWorkSchedule: boolean; hasAvatar: boolean } | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadEmployeeOnboardingStatus(membershipId, userId).then((s) => {
      if (cancelled) return;
      setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [membershipId, userId]);

  async function handleDismiss() {
    setDismissing(true);
    onDismiss();
    await markMembershipWelcomed(membershipId);
  }

  const checklist = [
    { label: "Vul je werkuren in", done: status?.hasWorkSchedule === true, href: "/portal/account?tab=werkuren", icon: Clock },
    { label: "Personaliseer je account", done: status?.hasAvatar === true, href: "/portal/account?tab=account", icon: UserCircle },
    { label: "Bekijk je eerste patiënt", done: stats.patientCount > 0, href: "/portal/patienten", icon: HeartPulse },
  ];

  return (
    <Card className="relative">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Sluiten"
      >
        <X size={16} />
      </button>

      <div className="max-w-xl pr-6 mb-5">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welkom bij {organizationName}!</h2>
        <p className="text-sm text-gray-500">
          Je bent toegevoegd als {roleName}. Doorloop deze paar stappen om je account klaar te zetten.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {checklist.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-gray-50"
            style={{ borderColor: "#e8e5df" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: item.done ? "#f0fdf4" : "#f8f7f4" }}
            >
              {item.done ? <Check size={15} style={{ color: "#16a34a" }} /> : <item.icon size={15} className="text-gray-400" />}
            </div>
            <span className={item.done ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700 font-medium"}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <Button size="sm" variant="secondary" onClick={handleDismiss} disabled={dismissing}>
        Aan de slag
      </Button>
    </Card>
  );
}
