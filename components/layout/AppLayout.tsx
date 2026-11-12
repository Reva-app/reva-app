"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { QuickActionFAB } from "./QuickActionFAB";
import { AppDataProvider } from "@/lib/store";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppLoadingGate } from "@/components/auth/AppLoadingGate";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { SUBSCRIPTIONS_ENABLED } from "@/lib/subscription";
import { useAppBranding } from "@/lib/hooks/useAppBranding";
import { NavigationBlockerProvider } from "@/lib/hooks/useNavigationBlocker";
import { brandPalette } from "@/lib/brand";
import { useBrandCssVars, useEffectiveBrandColor } from "@/lib/hooks/useBrandCssVars";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const branding = useAppBranding();
  const brandColor = useEffectiveBrandColor(branding?.primaryColor);
  useBrandCssVars(brandColor);
  return (
    <AppDataProvider>
      <AppLoadingGate>
        <AuthGate>
          <NavigationBlockerProvider>
            <div className="flex h-full" style={brandPalette(brandColor) as React.CSSProperties}>
              <Sidebar />
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {SUBSCRIPTIONS_ENABLED && <TrialBanner />}
                <TopBar />
                <main
                  className="flex-1 overflow-y-auto pb-nav-fab lg:pb-0"
                  style={{ background: "#f8f7f4" }}
                >
                  {children}
                </main>
              </div>
              <MobileNav />
              <QuickActionFAB />
            </div>
          </NavigationBlockerProvider>
        </AuthGate>
      </AppLoadingGate>
    </AppDataProvider>
  );
}
