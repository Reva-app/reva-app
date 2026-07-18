"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { PortalSidebar, getPortalNavItems } from "./PortalSidebar";
import { PortalGate } from "@/components/auth/PortalGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";
import { MANAGE_BRANDING_ROLES } from "@/lib/services/portalService";

function PortalMobileTopBar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { membership } = usePortalMembership();
  const { branding } = usePortalBranding();
  const [menuOpen, setMenuOpen] = useState(false);

  const canManageBranding = !!membership && MANAGE_BRANDING_ROLES.includes(membership.roleKey);
  const navItems = getPortalNavItems(canManageBranding);

  return (
    <>
      <div className="lg:hidden flex items-center justify-between px-4 py-4" style={{ background: "#18181a" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--brand-accent, #e8632a)" }}>
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-[10px]">{(membership?.organizationName || "R")[0].toUpperCase()}</span>
            )}
          </div>
          <p className="text-white font-semibold text-sm truncate">{membership?.organizationName ?? "REVA"} Practice Portal</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          aria-label="Menu openen"
        >
          <Menu size={20} style={{ color: "#ffffff" }} />
        </button>
      </div>

      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        className="lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] flex flex-col transition-transform duration-200"
        style={{
          background: "#18181a",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-white font-semibold text-sm truncate">{membership?.organizationName ?? "REVA"}</p>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            aria-label="Menu sluiten"
          >
            <X size={16} style={{ color: "#9ca3af" }} />
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  color: isActive ? "#ffffff" : "#7c7c8a",
                  background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                }}
              >
                <Icon size={16} style={{ color: isActive ? "var(--brand-accent, #e8632a)" : "#52525e" }} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-2.5 mb-4 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--brand-accent, #e8632a)" }}>
              {user?.email?.[0]?.toUpperCase() ?? "P"}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.email ?? ""}</p>
              <p className="text-[11px] truncate" style={{ color: "#52525e" }}>{membership?.roleName ?? ""}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Uitloggen"
              className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "var(--brand-accent, #e8632a)" }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { branding } = usePortalBranding();
  return (
    <PortalGate>
      <div className="flex h-full" style={{ ["--brand-accent" as string]: branding?.primaryColor || "#e8632a" }}>
        <PortalSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <PortalMobileTopBar />
          <main className="flex-1 overflow-y-auto" style={{ background: "#f8f7f4" }}>
            {children}
          </main>
        </div>
      </div>
    </PortalGate>
  );
}
