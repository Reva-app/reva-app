"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { StaffInviteForm } from "@/components/portal/StaffInviteForm";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  loadPortalStaffOverview, loadPortalRoles, loadPortalLocations, loadPortalMaxMembers,
  resendStaffInvite, deleteStaffInvite, updateStaffMember, deleteStaffMember,
  MANAGE_STAFF_ROLES, PORTAL_STAFF_STATUS_LABELS,
  type PortalStaffMember, type PortalRoleOption, type PortalLocationOption,
} from "@/lib/services/portalService";

function initials(name: string | null, email: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Avatar({ member }: { member: PortalStaffMember }) {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ background: "var(--brand-accent, #e8632a)" }}
    >
      {initials(member.fullName, member.email)}
    </div>
  );
}

function roleBadgeVariant(roleKey: string): "accent" | "blue" | "default" {
  if (roleKey === "organization_owner") return "accent";
  if (roleKey === "therapist") return "blue";
  return "default";
}

function statusBadge(status: PortalStaffMember["status"]) {
  if (status === "active") return <Badge variant="success">{PORTAL_STAFF_STATUS_LABELS.active}</Badge>;
  if (status === "invited") return <Badge variant="warning">{PORTAL_STAFF_STATUS_LABELS.invited}</Badge>;
  return <Badge variant="muted">{PORTAL_STAFF_STATUS_LABELS.suspended}</Badge>;
}

export default function PortalStaffPage() {
  const router = useRouter();
  const { checked, membership } = usePortalMembership();
  const { user } = useAuth();

  const [staff, setStaff] = useState<PortalStaffMember[]>([]);
  const [roles, setRoles] = useState<PortalRoleOption[]>([]);
  const [locations, setLocations] = useState<PortalLocationOption[]>([]);
  const [maxMembers, setMaxMembers] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PortalStaffMember | null>(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({});

  const canManage = !!membership && MANAGE_STAFF_ROLES.includes(membership.roleKey);

  async function refresh(organizationId: string) {
    const [staffData, max] = await Promise.all([
      loadPortalStaffOverview(organizationId),
      loadPortalMaxMembers(organizationId),
    ]);
    setStaff(staffData);
    setMaxMembers(max);
    setLoading(false);
  }

  useEffect(() => {
    if (!checked || !membership) return;
    let cancelled = false;
    Promise.all([
      loadPortalStaffOverview(membership.organizationId),
      loadPortalRoles(),
      loadPortalLocations(membership.organizationId),
      loadPortalMaxMembers(membership.organizationId),
    ]).then(([staffData, rolesData, locationsData, max]) => {
      if (cancelled) return;
      setStaff(staffData);
      setRoles(rolesData);
      setLocations(locationsData);
      setMaxMembers(max);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checked, membership]);

  function showRowMessage(id: string, text: string) {
    setRowMessages((prev) => ({ ...prev, [id]: text }));
    setTimeout(() => setRowMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    }), 5000);
  }

  const usedCount = staff.length;
  const atLimit = maxMembers > 0 && usedCount >= maxMembers;

  async function handleResend(member: PortalStaffMember) {
    setBusyId(member.id);
    const { error } = await resendStaffInvite(member.email ?? "");
    setBusyId(null);
    showRowMessage(member.id, error ?? "Uitnodiging opnieuw verstuurd.");
  }

  async function handleToggleBlocked(member: PortalStaffMember) {
    if (!membership) return;
    setBusyId(member.id);
    const { error } = await updateStaffMember(member.id, { status: member.status === "active" ? "suspended" : "active" });
    setBusyId(null);
    if (error) { showRowMessage(member.id, error); return; }
    refresh(membership.organizationId);
  }

  async function handleDelete() {
    if (!confirmDelete || !membership) return;
    setBusyId(confirmDelete.id);
    const { error } = confirmDelete.kind === "invite"
      ? await deleteStaffInvite(confirmDelete.id)
      : await deleteStaffMember(confirmDelete.id);
    setBusyId(null);
    if (error) { setActionError(error); return; }
    setConfirmDelete(null);
    refresh(membership.organizationId);
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionHeader
          title="Medewerkers"
          subtitle={loading ? "Laden…" : maxMembers > 0 ? `${usedCount} van ${maxMembers} medewerkers gebruikt` : `${usedCount} ${usedCount === 1 ? "medewerker" : "medewerkers"}`}
        />
        {canManage && (
          <Button size="sm" onClick={() => { setInviteMessage(""); setShowInvite(true); }} disabled={atLimit}>
            <UserPlus size={14} />
            Medewerker uitnodigen
          </Button>
        )}
      </div>

      {!loading && atLimit && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          Je hebt het maximum aantal medewerkers voor je abonnement bereikt. Neem contact op om uit te breiden.
        </p>
      )}

      {showInvite && membership && (
        <Modal onClose={() => setShowInvite(false)} maxWidth="max-w-2xl">
          <StaffInviteForm
            organizationId={membership.organizationId}
            roles={roles}
            locations={locations}
            onClose={() => setShowInvite(false)}
            onInvited={(result) => {
              setShowInvite(false);
              setInviteMessage(result.outcome === "linked" ? "Account gekoppeld." : "Uitnodiging verstuurd.");
              refresh(membership.organizationId);
              setTimeout(() => setInviteMessage(""), 5000);
            }}
          />
        </Modal>
      )}

      {inviteMessage && (
        <p className="text-sm" style={{ color: "#16a34a" }}>{inviteMessage}</p>
      )}

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-400 p-6">Laden…</p>
        ) : staff.length === 0 ? (
          <EmptyState icon={Users} title="Nog geen medewerkers" description="Nodig je eerste medewerker uit om te beginnen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e5df" }}>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Naam</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Rol</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Hoofdvestiging</th>
                  <th className="text-left font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Status</th>
                  {canManage && <th className="text-right font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3">Actie</th>}
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const isSelf = !!user && member.userId === user.id;
                  const message = rowMessages[member.id];
                  return (
                    <tr
                      key={member.id}
                      style={{ borderBottom: "1px solid #f8f7f4" }}
                      className={member.kind === "member" ? "cursor-pointer hover:bg-gray-50" : undefined}
                      onClick={() => { if (member.kind === "member") router.push(`/portal/medewerkers/${member.id}`); }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar member={member} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {member.fullName || member.email || "Onbekend"}
                              {isSelf && <span className="text-xs text-gray-400 font-normal ml-2">(jij)</span>}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{message || member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={roleBadgeVariant(member.roleKey)}>{member.roleName}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{member.locationName || "Hele organisatie"}</td>
                      <td className="px-5 py-3.5">{statusBadge(member.status)}</td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          {isSelf ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <ActionMenu
                              items={[
                                ...(member.kind === "member" ? [{ label: "Bewerken", onClick: () => router.push(`/portal/medewerkers/${member.id}`) }] : []),
                                ...(member.status === "invited" ? [{ label: "Opnieuw uitnodigen", onClick: () => handleResend(member) }] : []),
                                ...(member.kind === "member" ? [{ label: member.status === "active" ? "Blokkeren" : "Deblokkeren", onClick: () => handleToggleBlocked(member) }] : []),
                                { label: "Verwijderen", onClick: () => { setActionError(""); setConfirmDelete(member); }, danger: true },
                              ]}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <div className="rounded-2xl p-6" style={{ background: "#ffffff" }}>
            <h3 className="font-semibold text-gray-900 mb-2">
              {confirmDelete.kind === "invite" ? "Uitnodiging verwijderen?" : "Medewerker verwijderen?"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {confirmDelete.kind === "invite"
                ? "De openstaande uitnodiging wordt ingetrokken."
                : "Dit verwijdert de medewerker permanent uit jouw organisatie. Deze actie kan niet ongedaan worden gemaakt."}
            </p>
            {actionError && <p className="text-xs mb-3" style={{ color: "#dc2626" }}>{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>Annuleren</Button>
              <Button size="sm" variant="danger" disabled={busyId === confirmDelete.id} onClick={handleDelete}>Verwijderen</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
