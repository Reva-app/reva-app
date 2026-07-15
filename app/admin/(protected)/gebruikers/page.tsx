"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { loadAdminUsers, type AdminUser } from "@/lib/services/adminService";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAdminUsers().then((data) => {
      if (cancelled) return;
      setUsers(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Gebruikers"
        subtitle={loading ? "Laden…" : `${users.length} ${users.length === 1 ? "gebruiker" : "gebruikers"} op het platform`}
      />

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nog geen gebruikers"
            description="Zodra mensen zich registreren, verschijnen ze hier."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">E-mail</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Rol</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt op</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f8f7f4" }}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{u.fullName || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-600">{u.email || "—"}</td>
                    <td className="px-5 py-3.5">
                      {u.isPlatformAdmin ? (
                        <Badge variant="accent">Platform admin</Badge>
                      ) : (
                        <Badge variant="muted">Patiënt</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
