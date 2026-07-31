"use client";

import { PortalSidebar } from "./PortalSidebar";
import { PortalMobileNav } from "./PortalMobileNav";
import { PortalGate } from "@/components/auth/PortalGate";
import { usePortalBranding } from "@/lib/hooks/usePortalBranding";

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { branding } = usePortalBranding();
  return (
    <PortalGate>
      <div className="flex h-full" style={{ ["--brand-accent" as string]: branding?.primaryColor || "#e8632a" }}>
        <PortalSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-nav lg:pb-0" style={{ background: "#f8f7f4" }}>
            {children}
          </main>
        </div>
        <PortalMobileNav />
      </div>
    </PortalGate>
  );
}
