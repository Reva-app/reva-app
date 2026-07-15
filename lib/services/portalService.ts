import { createClient } from "@/lib/supabaseClient";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PortalMembership {
  organizationId: string;
  organizationName: string;
  locationId: string | null;
  locationName: string | null;
  roleKey: string;
  roleName: string;
}

export interface PortalPatient {
  id: string;
  fullName: string | null;
  email: string | null;
  locationName: string | null;
  status: string;
  createdAt: string;
}

export interface PortalDashboardStats {
  patientCount: number;
  colleagueCount: number;
}

// ─── Membership (huidige gebruiker) ────────────────────────────────────────

/**
 * Geeft de eerste actieve membership van de huidige gebruiker terug. Een
 * gebruiker met meerdere organisaties (bv. een therapeut bij twee praktijken)
 * krijgt hier voorlopig alleen de eerste — een org-switcher volgt zodra dat
 * scenario zich echt voordoet (zie docs/REVA-V2-MASTERPLAN.md §16.2).
 */
export async function loadCurrentMembership(userId: string): Promise<PortalMembership | null> {
  const supabase = createClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("organization_id, location_id, role_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) { logErr("loadCurrentMembership", error); return null; }
  if (!membership) return null;

  const [orgRes, locRes, roleRes] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).maybeSingle(),
    membership.location_id
      ? supabase.from("locations").select("name").eq("id", membership.location_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("roles").select("key, name").eq("id", membership.role_id).maybeSingle(),
  ]);
  if (orgRes.error) logErr("loadCurrentMembership(org)", orgRes.error);
  if (roleRes.error) logErr("loadCurrentMembership(role)", roleRes.error);

  return {
    organizationId: membership.organization_id,
    organizationName: orgRes.data?.name ?? "Onbekende organisatie",
    locationId: membership.location_id,
    locationName: locRes.data?.name ?? null,
    roleKey: roleRes.data?.key ?? "",
    roleName: roleRes.data?.name ?? "",
  };
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function loadPortalDashboardStats(organizationId: string): Promise<PortalDashboardStats> {
  const supabase = createClient();
  const [patients, colleagues] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
  ]);
  if (patients.error) logErr("loadPortalDashboardStats(patients)", patients.error);
  if (colleagues.error) logErr("loadPortalDashboardStats(memberships)", colleagues.error);
  return {
    patientCount: patients.count ?? 0,
    colleagueCount: colleagues.count ?? 0,
  };
}

// ─── Patiënten ──────────────────────────────────────────────────────────────

export async function loadPortalPatients(organizationId: string): Promise<PortalPatient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, user_id, location_id, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) { logErr("loadPortalPatients", error); return []; }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter((v): v is string => !!v))];

  const [profilesRes, locationsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[], error: null }),
    locationIds.length > 0
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);
  if (profilesRes.error) logErr("loadPortalPatients(profiles)", profilesRes.error);
  if (locationsRes.error) logErr("loadPortalPatients(locations)", locationsRes.error);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const locationMap = new Map((locationsRes.data ?? []).map((l) => [l.id, l.name]));

  return rows.map((r) => {
    const profile = r.user_id ? profileMap.get(r.user_id) : undefined;
    return {
      id: r.id as string,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      locationName: r.location_id ? locationMap.get(r.location_id) ?? null : null,
      status: r.status as string,
      createdAt: r.created_at as string,
    };
  });
}
