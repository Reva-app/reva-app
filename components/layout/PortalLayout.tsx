"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HeartPulse } from "lucide-react";
import { PortalSidebar } from "./PortalSidebar";
import { PortalGate } from "@/components/auth/PortalGate";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";

const mobileNav = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/patienten", label: "Patiënten", icon: HeartPulse },
];

function PortalMobileTopBar() {
  const pathname = usePathname();
  const { membership } = usePortalMembership();
  const { branding } = usePortalBranding();
  return (
    <div className="lg:hidden" style={{ background: "#18181a" }}>
      <div className="px-4 py-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--brand-accent, #e8632a)" }}>
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-[10px]">{(membership?.organizationName || "R")[0].toUpperCase()}</span>
          )}
        </div>
        <p className="text-white font-semibold text-sm">{membership?.organizationName ?? "REVA"} Practice Portal</p>
      </div>
      <div className="flex items-center gap-1 px-3 pb-3 overflow-x-auto">
        {mobileNav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                color: isActive ? "#ffffff" : "#7c7c8a",
                background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
              }}
            >
              <Icon size={13} style={{ color: isActive ? "var(--brand-accent, #e8632a)" : "#52525e" }} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
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
