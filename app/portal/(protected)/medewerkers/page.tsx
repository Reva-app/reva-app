"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { StaffInviteForm } from "@/components/portal/StaffInviteForm";
import { Avatar } from "@/components/ui/Avatar";
import { ResponsiveList, type ListColumn } from "@/components/ui/ResponsiveList";
import { usePortalMembership } from "@/lib/hooks/usePortalMembership";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  loadPortalStaffOverview, loadPortalRoles, loadPortalLocations, loadPortalMaxMembers,
  resendStaffInvite, deleteStaffInvite, updateStaffMember, deleteStaffMember,
  MANAGE_STAFF_ROLES, PORTAL_STAFF_STATUS_LABELS, STAFF_INACTIVITY_THRESHOLD_DAYS, isDateStale,
  type PortalStaffMember, type PortalRoleOption, type PortalLocationOption,
} from "@/lib/services/portalService";

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

function staffName(member: PortalStaffMember, isSelf: boolean) {
  return (
    <>
      {member.fullName || member.email || "Onbekend"}
      {isSelf && <span className="text-xs text-gray-500 font-normal ml-2">(jij)</span>}
    </>
  );
}

function staffStatusBadges(member: PortalStaffMember) {
  return (
    <>
      {statusBadge(member.status)}
      {member.kind === "member" && member.status === "active" && isDateStale(member.lastSignInAt, STAFF_INACTIVITY_THRESHOLD_DAYS) && (
        <Badge variant="warning">Niet recent ingelogd</Badge>
      )}
    </>
  );
}

function staffColumns(selfId: string | undefined): ListColumn<PortalStaffMember, never>[] {
  return [
    {
      key: "name", header: "Naam",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar fullName={m.fullName} email={m.email} avatarUrl={m.avatarUrl} size={36} />
          <div className="min-w-0">
            <p className="font-medium text-gray-800 [overflow-wrap:anywhere]">{staffName(m, !!selfId && m.userId === selfId)}</p>
            <p className="text-xs text-gray-500 [overflow-wrap:anywhere]">{m.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Rol", cell: (m) => <Badge variant={roleBadgeVariant(m.roleKey)}>{m.roleName}</Badge> },
    { key: "location", header: "Hoofdlocatie", className: "text-gray-600", cell: (m) => m.locationName || "Hele organisatie" },
    { key: "status", header: "Status", cell: (m) => <div className="flex items-center gap-1.5 flex-wrap">{staffStatusBadges(m)}</div> },
  ];
}

/** Kaart op telefoon: wie, welke rol, waar en of er iets aandacht vraagt. */
function StaffCard({ member: m, isSelf }: { member: PortalStaffMember; isSelf: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar fullName={m.fullName} email={m.email} avatarUrl={m.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 leading-snug [overflow-wrap:anywhere]">{staffName(m, isSelf)}</p>
        {m.fullName && m.email && <p className="text-xs text-gray-500 mt-0.5 [overflow-wrap:anywhere]">{m.email}</p>}
        <p className="text-xs text-gray-500 mt-1">{m.locationName || "Hele organisatie"}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant={roleBadgeVariant(m.roleKey)}>{m.roleName}</Badge>
          {staffStatusBadges(m)}
        </div>
      </div>
    </div>
  );
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
  const [confirmDelete, setConfirmDelete] = useState<PortalStaffMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast, toastNode } = useToast();

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

  const usedCount = staff.length;
  const atLimit = maxMembers > 0 && usedCount >= maxMembers;

  async function handleResend(member: PortalStaffMember) {
    setBusyId(member.id);
    const { error } = await resendStaffInvite(member.id);
    setBusyId(null);
    showToast(error ?? "Uitnodiging opnieuw verstuurd.", error ? "error" : "success");
  }

  async function handleToggleBlocked(member: PortalStaffMember) {
    if (!membership) return;
    setBusyId(member.id);
    const nextBlocked = member.status === "active";
    const { error } = await updateStaffMember(member.id, { status: nextBlocked ? "suspended" : "active" });
    setBusyId(null);
    if (error) { showToast(error, "error"); return; }
    showToast(nextBlocked ? "Medewerker geblokkeerd" : "Medewerker gedeblokkeerd");
    refresh(membership.organizationId);
  }

  async function handleDelete() {
    if (!confirmDelete || !membership) return;
    const wasInvite = confirmDelete.kind === "invite";
    setBusyId(confirmDelete.id);
    const { error } = wasInvite
      ? await deleteStaffInvite(confirmDelete.id)
      : await deleteStaffMember(confirmDelete.id);
    setBusyId(null);
    setConfirmDelete(null);
    if (error) { showToast(error, "error"); return; }
    showToast(wasInvite ? "Uitnodiging verwijderd" : "Medewerker verwijderd");
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
          <Button size="sm" onClick={() => setShowInvite(true)} disabled={atLimit}>
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
        <Modal onClose={() => setShowInvite(false)} maxWidth="max-w-2xl" dismissOnBackdropClick={false}>
          <StaffInviteForm
            organizationId={membership.organizationId}
            roles={roles}
            locations={locations}
            onClose={() => setShowInvite(false)}
            onInvited={(result) => {
              setShowInvite(false);
              showToast(result.outcome === "linked" ? "Account gekoppeld en e-mail verstuurd." : "Uitnodiging verstuurd.");
              refresh(membership.organizationId);
            }}
          />
        </Modal>
      )}

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e8e5df", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Laden…</p>
        ) : staff.length === 0 ? (
          <EmptyState icon={Users} title="Nog geen medewerkers" description="Nodig je eerste medewerker uit om te beginnen." />
        ) : (
          <ResponsiveList
            rows={staff}
            rowKey={(m) => m.id}
            rowLabel={(m) => m.fullName || m.email || "Medewerker"}
            onRowClick={(m) => router.push(`/portal/medewerkers/${m.id}`)}
            isRowClickable={(m) => m.kind === "member"}
            columns={staffColumns(user?.id)}
            card={(m) => <StaffCard member={m} isSelf={!!user && m.userId === user.id} />}
            actions={canManage ? (member) =>
              user && member.userId === user.id ? null : [
                ...(member.kind === "member" ? [{ label: "Bewerken", onClick: () => router.push(`/portal/medewerkers/${member.id}`) }] : []),
                ...(member.status === "invited" ? [{ label: "Opnieuw uitnodigen", onClick: () => handleResend(member) }] : []),
                ...(member.kind === "member" ? [{ label: member.status === "active" ? "Blokkeren" : "Deblokkeren", onClick: () => handleToggleBlocked(member) }] : []),
                { label: "Verwijderen", onClick: () => setConfirmDelete(member), danger: true },
              ]
              : undefined}
          />
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.kind === "invite" ? "Uitnodiging verwijderen?" : "Medewerker verwijderen?"}
          message={confirmDelete.kind === "invite"
            ? "De openstaande uitnodiging wordt ingetrokken."
            : "Dit verwijdert de medewerker permanent uit jouw organisatie. Deze actie kan niet ongedaan worden gemaakt."}
          confirmLabel="Verwijderen"
          loading={busyId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
      {toastNode}
    </div>
  );
}
