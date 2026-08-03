"use client";

import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminGate } from "@/components/auth/AdminGate";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="flex h-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <main
            className="flex-1 overflow-y-auto pb-nav lg:pb-0"
            style={{ background: "#f8f7f4" }}
          >
            {children}
          </main>
        </div>
        <AdminMobileNav />
      </div>
    </AdminGate>
  );
}
