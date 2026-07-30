"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HeartPulse, ClipboardList, Users, MoreHorizontal, X, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { getPortalNavItems } from "./PortalSidebar";
import { MANAGE_BRANDING_ROLES, VIEW_ANALYTICS_ROLES } from "@/lib/services/portalService";
import { VIEW_AUDIT_LOG_ROLES } from "@/lib/services/auditService";

/**
 * Vier meest gebruikte pagina's direct in beeld, net als de patiënt-app se
 * bottom-nav — de rest (incl. Huisstijl/Analyse/Activiteitenlog, afhankelijk
 * van rol) zit achter "Meer", zelfde brondata als PortalSidebar/PortalLayout
 * zodat rolgating nooit uit de pas loopt.
 */
const FIXED_NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/patienten", label: "Patiënten", icon: HeartPulse },
  { href: "/portal/herstelplannen", label: "Herstelplannen", icon: ClipboardList },
  { href: "/portal/medewerkers", label: "Medewerkers", icon: Users },
];

export function PortalMobileNav() {
  const pathname = usePathname();
  const [meerOpen, setMeerOpen] = useState(false);
  const { signOut } = useAuth();
  const { membership } = usePortalMembership();

  const canManageBranding = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);
  const canViewAnalytics = !!membership && VIEW_ANALYTICS_ROLES.includes(membership.roleKey);
  const canViewAuditLog = !!membership && VIEW_AUDIT_LOG_ROLES.includes(membership.roleKey);
  const { primary, secondary } = getPortalNavItems(canManageBranding, canViewAnalytics, canViewAuditLog);
  const allNav = [...primary, ...secondary];

  useEffect(() => {
    setMeerOpen(false);
  }, [pathname]);

  const isMeerActive = allNav.some(
    (n) => n.href === pathname && !FIXED_NAV.some((f) => f.href === n.href)
  );

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: "#18181a",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-end h-16 px-1">
          {FIXED_NAV.map(({ href, label, icon: Icon }) => (
            <NavItem key={href} href={href} label={label} icon={Icon} active={pathname === href} />
          ))}

          <button
            onClick={() => setMeerOpen((v) => !v)}
            className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press"
          >
            <MoreHorizontal
              size={22}
              style={{ color: isMeerActive || meerOpen ? "var(--brand-accent, #e8632a)" : "#5a5a6a" }}
              strokeWidth={1.8}
            />
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: isMeerActive || meerOpen ? "#ffffff" : "#5a5a6a" }}
            >
              Meer
            </span>
          </button>
        </div>
      </nav>

      {meerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setMeerOpen(false)}
        />
      )}

      {meerOpen && (
        <div
          className="lg:hidden fixed left-0 right-0 z-[45]"
          style={{
            bottom: `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))`,
            background: "#18181a",
            borderTop: "1px solid rgba(255,255,255,0.10)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px 20px 0 0",
            animation: "sheetUp 0.28s cubic-bezier(0.32,0.72,0,1)",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>

          <div
            className="flex items-center justify-between px-5 pt-2 pb-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b6b7a" }}>
              Meer pagina&apos;s
            </p>
            <button
              onClick={() => setMeerOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center touch-press"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <X size={14} style={{ color: "#9ca3af" }} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4">
            {allNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl touch-press"
                  style={{
                    background: active ? "rgba(232,99,42,0.15)" : "rgba(255,255,255,0.05)",
                    border: active ? "1px solid rgba(232,99,42,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Icon size={22} style={{ color: active ? "var(--brand-accent, #e8632a)" : "#9ca3af" }} strokeWidth={active ? 2.2 : 1.8} />
                  <span
                    className="text-[11px] font-medium text-center leading-tight"
                    style={{ color: active ? "#ffffff" : "#9ca3af" }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="px-4 pb-5">
            <Link
              href="/portal/account"
              onClick={() => setMeerOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium touch-press mb-2"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#9ca3af",
              }}
            >
              Account instellingen
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium touch-press"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#9ca3af",
              }}
            >
              <LogOut size={16} style={{ color: "#6b7280" }} />
              Uitloggen
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-end gap-1 pb-2 touch-press">
      <Icon size={22} style={{ color: active ? "var(--brand-accent, #e8632a)" : "#5a5a6a" }} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[10px] font-medium leading-none" style={{ color: active ? "#ffffff" : "#5a5a6a" }}>
        {label}
      </span>
    </Link>
  );
}
