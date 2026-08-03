"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/data";
import { loadAdminUsers, type AdminUser } from "@/lib/services/adminService";

const inputStyle = {
  borderColor: "#e8e5df",
  background: "#f8f7f4",
  color: "#1a1a1a",
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      (u.fullName ?? "").toLowerCase().includes(term)
      || (u.email ?? "").toLowerCase().includes(term)
      || (u.organizationName ?? "").toLowerCase().includes(term)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="Gebruikers"
        subtitle={loading ? "Laden…" : `${users.length} ${users.length === 1 ? "gebruiker" : "gebruikers"} op het platform`}
      />

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Zoek op naam, e-mail of organisatie…"
          className="w-full text-sm rounded-xl border pl-9 pr-4 py-2.5 focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "Geen gebruikers gevonden" : "Nog geen gebruikers"}
            description={search ? "Probeer een andere zoekterm." : "Zodra mensen zich registreren, verschijnen ze hier."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">E-mail</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Organisatie</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Rol</th>
                    <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Aangemaakt op</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => { if (u.organizationId) router.push(`/admin/organisaties/${u.organizationId}`); }}
                      style={{ borderBottom: "1px solid #f8f7f4" }}
                      className={u.organizationId ? "cursor-pointer transition-colors hover:bg-gray-50" : undefined}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-800">{u.fullName || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{u.email || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {u.organizationName ? (
                          <>
                            {u.organizationName}
                            {u.membershipCount > 1 && (
                              <span className="text-xs text-gray-400 ml-1.5">+{u.membershipCount - 1} andere</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.isPlatformAdmin ? (
                          <Badge variant="accent">Platform admin</Badge>
                        ) : u.roleName ? (
                          <Badge variant="blue">{u.roleName}</Badge>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2" style={{ borderTop: "1px solid #f8f7f4" }}>
                <span className="text-xs text-gray-400">
                  Pagina {safePage} van {totalPages} — {filteredUsers.length} {filteredUsers.length === 1 ? "resultaat" : "resultaten"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Vorige</Button>
                  <Button size="sm" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Volgende</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
