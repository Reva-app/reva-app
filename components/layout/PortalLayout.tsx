"use client";

import { PortalSidebar } from "./PortalSidebar";
import { PortalMobileNav } from "./PortalMobileNav";
import { PortalQuickActionFAB } from "./PortalQuickActionFAB";
import { PortalGate } from "@/components/auth/PortalGate";
import { TrialBanner } from "@/components/portal/TrialBanner";
import { PlanUsageBanner } from "@/components/portal/PlanUsageBanner";
import { PortalBrandingProvider, usePortalBranding } from "@/lib/hooks/usePortalBranding";
import { accessibleAccent } from "@/lib/brand";

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const { branding } = usePortalBranding();
  return (
    <div className="flex h-full" style={{ ["--brand-accent" as string]: accessibleAccent(branding?.primaryColor) }}>
      <PortalSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TrialBanner />
        <PlanUsageBanner />
        <main className="flex-1 overflow-y-auto pb-nav-fab lg:pb-0" style={{ background: "#f8f7f4" }}>
          {children}
        </main>
      </div>
      <PortalMobileNav />
      <PortalQuickActionFAB />
    </div>
  );
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGate>
      <PortalBrandingProvider>
        <PortalLayoutInner>{children}</PortalLayoutInner>
      </PortalBrandingProvider>
    </PortalGate>
  );
}
