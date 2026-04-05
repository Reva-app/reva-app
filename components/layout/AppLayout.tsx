import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { QuickActionFAB } from "./QuickActionFAB";
import { AppDataProvider } from "@/lib/store";
import { AuthGate } from "@/components/auth/AuthGate";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <AuthGate>
        <div className="flex h-full">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <TopBar />
            <main
              className="flex-1 overflow-y-auto pb-nav lg:pb-0"
              style={{ background: "#f8f7f4" }}
            >
              {children}
            </main>
          </div>
          <MobileNav />
          <QuickActionFAB />
        </div>
      </AuthGate>
    </AppDataProvider>
  );
}
