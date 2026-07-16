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
  hasAccount: boolean;
  invitedAt: string | null;
}

export interface PortalDashboardStats {
  patientCount: number;
  colleagueCount: number;
}

export interface PortalLocationOption {
  id: string;
  name: string;
}

export interface PortalLocationDetail {
  id: string;
  name: string;
  city: string | null;
  status: string;
}

export interface PortalRoleOption {
  id: string;
  key: string;
  name: string;
}

export interface PortalMember {
  membershipId: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  membershipStatus: string;
  lastSignInAt: string | null;
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
    .select("id, user_id, location_id, status, created_at, first_name, last_name, email, invited_at")
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
    const dossierName = [r.first_name, r.last_name].filter(Boolean).join(" ") || null;
    return {
      id: r.id as string,
      fullName: profile?.full_name ?? dossierName,
      email: profile?.email ?? (r.email as string | null),
      locationName: r.location_id ? locationMap.get(r.location_id) ?? null : null,
      status: r.status as string,
      createdAt: r.created_at as string,
      hasAccount: !!r.user_id,
      invitedAt: r.invited_at as string | null,
    };
  });
}

export async function loadPortalLocations(organizationId: string): Promise<PortalLocationOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) { logErr("loadPortalLocations", error); return []; }
  return data ?? [];
}

export interface NewPortalPatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  locationId: string | null;
}

export async function createPortalPatient(
  organizationId: string,
  input: NewPortalPatientInput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patients").insert({
    organization_id: organizationId,
    location_id: input.locationId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    status: "active",
  });
  if (error) {
    logErr("createPortalPatient", error);
    return { error: "Aanmaken van het patiëntdossier is niet gelukt." };
  }
  return { error: null };
}

export type InvitePortalPatientResult =
  | { outcome: "linked"; error: null }
  | { outcome: "invited"; error: null }
  | { outcome: "failed"; error: string };

/**
 * Koppelt een patiëntdossier aan een REVA-account:
 * - heeft dat e-mailadres al een account? Dan wordt het dossier direct
 *   gekoppeld (geen e-mail nodig).
 * - anders wordt een echte magic-link uitnodiging verstuurd; de koppeling
 *   voltooit zichzelf zodra de patiënt die link gebruikt (zie migratie 033,
 *   ensure_personal_organization matcht dan op e-mailadres).
 */
export async function invitePortalPatient(
  patientId: string,
  email: string
): Promise<InvitePortalPatientResult> {
  const supabase = createClient();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    return { outcome: "failed", error: "Dit dossier heeft nog geen e-mailadres." };
  }

  const { data: found, error: lookupError } = await supabase.rpc("portal_find_user_by_email", {
    p_email: trimmedEmail,
  });
  if (lookupError) { logErr("invitePortalPatient(lookup)", lookupError); return { outcome: "failed", error: lookupError.message }; }
  const existingProfile = (found as { id: string; full_name: string | null }[] | null)?.[0];

  if (existingProfile) {
    const { error: linkError } = await supabase
      .from("patients")
      .update({ user_id: existingProfile.id })
      .eq("id", patientId);
    if (linkError) {
      logErr("invitePortalPatient(link)", linkError);
      if (linkError.code === "23505") {
        return { outcome: "failed", error: "Dit account heeft al een patiëntdossier bij een andere organisatie. Koppelen aan een tweede organisatie wordt nog niet ondersteund." };
      }
      return { outcome: "failed", error: "Koppelen van het account is niet gelukt." };
    }
    return { outcome: "linked", error: null };
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (otpError) {
    logErr("invitePortalPatient(otp)", otpError);
    return { outcome: "failed", error: "Versturen van de uitnodiging is niet gelukt." };
  }

  const { error: markError } = await supabase
    .from("patients")
    .update({ invited_at: new Date().toISOString() })
    .eq("id", patientId);
  if (markError) logErr("invitePortalPatient(mark)", markError);

  return { outcome: "invited", error: null };
}

// ─── Vestigingen (zelf-service) ─────────────────────────────────────────────

export async function loadPortalLocationDetails(organizationId: string): Promise<PortalLocationDetail[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) { logErr("loadPortalLocationDetails", error); return []; }
  return (data ?? []) as PortalLocationDetail[];
}

export async function createPortalLocation(
  organizationId: string,
  name: string,
  city: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("locations").insert({
    organization_id: organizationId,
    name: name.trim(),
    city: city.trim() || null,
  });
  if (error) {
    logErr("createPortalLocation", error);
    return { error: "Aanmaken van de vestiging is niet gelukt." };
  }
  return { error: null };
}

export async function updatePortalLocationStatus(
  locationId: string,
  status: "active" | "suspended"
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("locations").update({ status }).eq("id", locationId);
  if (error) {
    logErr("updatePortalLocationStatus", error);
    return { error: "Bijwerken van de vestiging is niet gelukt." };
  }
  return { error: null };
}

// ─── Medewerkers (zelf-service) ─────────────────────────────────────────────

/** Alle rollen behalve super_admin (die wordt niet via memberships toegekend). */
export async function loadPortalRoles(): Promise<PortalRoleOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, name")
    .neq("key", "super_admin")
    .order("scope")
    .order("key");
  if (error) { logErr("loadPortalRoles", error); return []; }
  return (data ?? []) as PortalRoleOption[];
}

export async function loadPortalMembers(organizationId: string): Promise<PortalMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_list_org_members", { org_id: organizationId });
  if (error) { logErr("loadPortalMembers", error); return []; }
  return ((data ?? []) as {
    membership_id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    role_id: string;
    role_key: string;
    role_name: string;
    location_id: string | null;
    location_name: string | null;
    membership_status: string;
    last_sign_in_at: string | null;
  }[]).map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    roleId: row.role_id,
    roleKey: row.role_key,
    roleName: row.role_name,
    locationId: row.location_id,
    locationName: row.location_name,
    membershipStatus: row.membership_status,
    lastSignInAt: row.last_sign_in_at,
  }));
}

/**
 * Koppelt een BESTAAND REVA-account (op e-mailadres) aan de organisatie met
 * een rol en optioneel een vestiging. Iemand uitnodigen die nog geen account
 * heeft is bewust nog niet gebouwd (zelfde reden als bij addAdminOrgMember).
 */
export async function addPortalMember(
  organizationId: string,
  email: string,
  roleId: string,
  locationId: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: found, error: lookupError } = await supabase.rpc("portal_find_user_by_email", {
    p_email: email.trim().toLowerCase(),
  });
  if (lookupError) { logErr("addPortalMember(lookup)", lookupError); return { error: lookupError.message }; }
  const profile = (found as { id: string; full_name: string | null }[] | null)?.[0];
  if (!profile) {
    return { error: "Geen bestaand REVA-account gevonden met dit e-mailadres. Diegene moet eerst zelf een account aanmaken." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", profile.id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existingError) logErr("addPortalMember(existing check)", existingError);
  if (existing) {
    return { error: "Deze persoon is al gekoppeld aan jouw organisatie." };
  }

  const { error: insertError } = await supabase.from("memberships").insert({
    user_id: profile.id,
    organization_id: organizationId,
    role_id: roleId,
    location_id: locationId,
    status: "active",
  });
  if (insertError) { logErr("addPortalMember(insert)", insertError); return { error: insertError.message }; }

  return { error: null };
}

export async function updatePortalMember(
  membershipId: string,
  patch: { roleId?: string; locationId?: string | null; status?: "active" | "suspended" }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.roleId !== undefined) dbPatch.role_id = patch.roleId;
  if (patch.locationId !== undefined) dbPatch.location_id = patch.locationId;
  if (patch.status !== undefined) dbPatch.status = patch.status;

  const { error } = await supabase.from("memberships").update(dbPatch).eq("id", membershipId);
  if (error) {
    logErr("updatePortalMember", error);
    return { error: "Bijwerken van de medewerker is niet gelukt." };
  }
  return { error: null };
}
