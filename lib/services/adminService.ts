import { createClient } from "@/lib/supabaseClient";
import { apiUrl } from "@/lib/apiBase";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

/**
 * Verstuurt een op-maat gemaakte uitnodigingsmail via /api/send-invite (Resend +
 * server-side gegenereerde magic-link, i.p.v. Supabase's generieke ingebouwde
 * mail). Stuurt de actuele access token expliciet mee — niet vertrouwen op de
 * sessie-cookie, die kan achterlopen op een stille token-refresh.
 */
async function callSendInviteApi(body: Record<string, unknown>): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Niet ingelogd." };

  const res = await fetch(apiUrl("/api/send-invite"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    return { error: json.error ?? "Versturen van de uitnodiging is niet gelukt." };
  }
  return { error: null };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminOrganization {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  locationCount: number;
  patientCount: number;
}

export interface AdminUser {
  id: string;
  fullName: string | null;
  email: string | null;
  createdAt: string;
  isPlatformAdmin: boolean;
}

export interface AdminDashboardStats {
  organizationCount: number;
  locationCount: number;
  patientCount: number;
  userCount: number;
}

// ─── Platform admin check ───────────────────────────────────────────────────

/** Checkt of de huidige ingelogde gebruiker platform admin is. */
export async function checkIsPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) { logErr("checkIsPlatformAdmin", error); return false; }
  return !!data;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function loadAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = createClient();
  const [orgs, locations, patients, users] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  if (orgs.error) logErr("loadAdminDashboardStats(organizations)", orgs.error);
  if (locations.error) logErr("loadAdminDashboardStats(locations)", locations.error);
  if (patients.error) logErr("loadAdminDashboardStats(patients)", patients.error);
  if (users.error) logErr("loadAdminDashboardStats(profiles)", users.error);
  return {
    organizationCount: orgs.count ?? 0,
    locationCount: locations.count ?? 0,
    patientCount: patients.count ?? 0,
    userCount: users.count ?? 0,
  };
}

// ─── Organisaties ───────────────────────────────────────────────────────────

interface RawOrgRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  locations: { count: number }[] | null;
  patients: { count: number }[] | null;
}

export async function loadAdminOrganizations(): Promise<AdminOrganization[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, status, created_at, locations(count), patients(count)")
    .order("created_at", { ascending: false });
  if (error) { logErr("loadAdminOrganizations", error); return []; }
  return ((data ?? []) as unknown as RawOrgRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    locationCount: row.locations?.[0]?.count ?? 0,
    patientCount: row.patients?.[0]?.count ?? 0,
  }));
}

// ─── Gebruikers ─────────────────────────────────────────────────────────────

export async function loadAdminUsers(): Promise<AdminUser[]> {
  const supabase = createClient();
  const [profilesRes, adminsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }),
    supabase.from("platform_admins").select("user_id"),
  ]);
  if (profilesRes.error) { logErr("loadAdminUsers", profilesRes.error); return []; }
  if (adminsRes.error) logErr("loadAdminUsers(platform_admins)", adminsRes.error);

  const adminIds = new Set((adminsRes.data ?? []).map((a) => a.user_id as string));

  return (profilesRes.data ?? []).map((row) => ({
    id: row.id as string,
    fullName: row.full_name as string | null,
    email: row.email as string | null,
    createdAt: row.created_at as string,
    isPlatformAdmin: adminIds.has(row.id as string),
  }));
}

// ─── Organisatiedetail ──────────────────────────────────────────────────────

const LOGO_BUCKET = "organization-logos";
const LOGO_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 uur, zelfde als dossier-opslag

export interface AdminOrganizationDetail {
  id: string;
  name: string;
  status: string; // 'trial' | 'active' | 'paused'
  logoPath: string | null;
  logoUrl: string | null; // signed URL, ververst per load
  kvkNumber: string | null;
  btwNumber: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressStreet: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  supportNotes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  maxLocations: number;
  maxMembers: number;
}

export interface AdminOrganizationPatch {
  name?: string;
  status?: string;
  kvkNumber?: string | null;
  btwNumber?: string | null;
  website?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  supportNotes?: string | null;
  lastContactAt?: string | null;
  maxLocations?: number;
  maxMembers?: number;
}

export interface AdminOrgLocation {
  id: string;
  name: string;
  city: string | null;
  archived: boolean;
  patientCount: number;
}

export interface AdminOrgMember {
  userId: string;
  fullName: string | null;
  email: string | null;
  roleKey: string;
  roleName: string;
  locationName: string | null;
  membershipStatus: string;
  lastSignInAt: string | null;
}

export interface AdminOrgPatientStats {
  total: number;
  active: number;
  newThisMonth: number;
  lastAddedAt: string | null;
}

export interface AdminOrgUsage {
  lastSignInAt: string | null;
  checkinsLast30Days: number;
}

export async function loadAdminOrganizationDetail(orgId: string): Promise<AdminOrganizationDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, status, logo_path, kvk_number, btw_number, website, contact_name, contact_email, contact_phone, address_street, address_postal_code, address_city, support_notes, last_contact_at, created_at, max_locations, max_members")
    .eq("id", orgId)
    .maybeSingle();
  if (error) { logErr("loadAdminOrganizationDetail", error); return null; }
  if (!data) return null;

  let logoUrl: string | null = null;
  if (data.logo_path) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(data.logo_path, LOGO_SIGNED_URL_TTL_SECONDS);
    if (signErr) logErr("loadAdminOrganizationDetail(logo)", signErr);
    logoUrl = signed?.signedUrl ?? null;
  }

  return {
    id: data.id,
    name: data.name,
    status: data.status,
    logoPath: data.logo_path,
    logoUrl,
    kvkNumber: data.kvk_number,
    btwNumber: data.btw_number,
    website: data.website,
    contactName: data.contact_name,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    addressStreet: data.address_street,
    addressPostalCode: data.address_postal_code,
    addressCity: data.address_city,
    supportNotes: data.support_notes,
    lastContactAt: data.last_contact_at,
    createdAt: data.created_at,
    maxLocations: data.max_locations,
    maxMembers: data.max_members,
  };
}

export async function updateAdminOrganization(orgId: string, patch: AdminOrganizationPatch): Promise<{ error: string | null }> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.kvkNumber !== undefined) dbPatch.kvk_number = patch.kvkNumber;
  if (patch.btwNumber !== undefined) dbPatch.btw_number = patch.btwNumber;
  if (patch.website !== undefined) dbPatch.website = patch.website;
  if (patch.contactName !== undefined) dbPatch.contact_name = patch.contactName;
  if (patch.contactEmail !== undefined) dbPatch.contact_email = patch.contactEmail;
  if (patch.contactPhone !== undefined) dbPatch.contact_phone = patch.contactPhone;
  if (patch.addressStreet !== undefined) dbPatch.address_street = patch.addressStreet;
  if (patch.addressPostalCode !== undefined) dbPatch.address_postal_code = patch.addressPostalCode;
  if (patch.addressCity !== undefined) dbPatch.address_city = patch.addressCity;
  if (patch.supportNotes !== undefined) dbPatch.support_notes = patch.supportNotes;
  if (patch.lastContactAt !== undefined) dbPatch.last_contact_at = patch.lastContactAt;
  if (patch.maxLocations !== undefined) dbPatch.max_locations = patch.maxLocations;
  if (patch.maxMembers !== undefined) dbPatch.max_members = patch.maxMembers;

  const { error } = await supabase.from("organizations").update(dbPatch).eq("id", orgId);
  if (error) { logErr("updateAdminOrganization", error); return { error: error.message }; }
  return { error: null };
}

export async function uploadOrganizationLogo(orgId: string, file: File): Promise<{ logoUrl: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${orgId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) { logErr("uploadOrganizationLogo(upload)", uploadError); return { logoUrl: null, error: uploadError.message }; }

  const { error: updateError } = await supabase.from("organizations").update({ logo_path: path }).eq("id", orgId);
  if (updateError) { logErr("uploadOrganizationLogo(update)", updateError); return { logoUrl: null, error: updateError.message }; }

  const { data: signed, error: signErr } = await supabase.storage
    .from(LOGO_BUCKET)
    .createSignedUrl(path, LOGO_SIGNED_URL_TTL_SECONDS);
  if (signErr) { logErr("uploadOrganizationLogo(sign)", signErr); return { logoUrl: null, error: null }; }

  return { logoUrl: signed.signedUrl, error: null };
}

export async function loadAdminOrgLocations(orgId: string): Promise<AdminOrgLocation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, archived, patients(count)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error) { logErr("loadAdminOrgLocations", error); return []; }
  return ((data ?? []) as unknown as { id: string; name: string; city: string | null; archived: boolean; patients: { count: number }[] | null }[]).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    archived: row.archived,
    patientCount: row.patients?.[0]?.count ?? 0,
  }));
}

export async function loadAdminOrgMembers(orgId: string): Promise<AdminOrgMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_org_members", { org_id: orgId });
  if (error) { logErr("loadAdminOrgMembers", error); return []; }
  return ((data ?? []) as {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role_key: string;
    role_name: string;
    location_name: string | null;
    membership_status: string;
    last_sign_in_at: string | null;
  }[]).map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    roleKey: row.role_key,
    roleName: row.role_name,
    locationName: row.location_name,
    membershipStatus: row.membership_status,
    lastSignInAt: row.last_sign_in_at,
  }));
}

export async function loadAdminOrgPatientStats(orgId: string): Promise<AdminOrgPatientStats> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("status, created_at")
    .eq("organization_id", orgId);
  if (error) { logErr("loadAdminOrgPatientStats", error); return { total: 0, active: 0, newThisMonth: 0, lastAddedAt: null }; }

  const rows = data ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sorted = [...rows].sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string));

  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    newThisMonth: rows.filter((r) => new Date(r.created_at as string) >= monthStart).length,
    lastAddedAt: sorted[0]?.created_at ?? null,
  };
}

// ─── Organisatie aanmaken & medewerkers koppelen ────────────────────────────

export interface AdminRoleOption {
  id: string;
  key: string;
  name: string;
}

/** Precies de 3 canonieke rollen (organization_owner/therapist/practice_staff) — zie migratie 041. */
export async function loadAdminRoles(): Promise<AdminRoleOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, name")
    .in("key", ["organization_owner", "therapist", "practice_staff"])
    .order("scope")
    .order("key");
  if (error) { logErr("loadAdminRoles", error); return []; }
  return (data ?? []) as AdminRoleOption[];
}

/**
 * Maakt een lege organisatie aan, bewust ZONDER een placeholder-vestiging.
 * De eigenaar (of platform-admin) maakt zelf de eerste, echte vestiging aan
 * via /portal/locaties — die wordt dan automatisch de hoofdvestiging (zie
 * de set_first_location_as_main-trigger in migratie 040). Vroeger werd hier
 * altijd een lege "Hoofdlocatie" aangemaakt, die dan al hoofdvestiging was
 * vóórdat de eigenaar ooit iets zelf had ingevoerd.
 */
export async function createAdminOrganization(name: string): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, status: "trial" })
    .select("id")
    .single();
  if (orgError) { logErr("createAdminOrganization(org)", orgError); return { id: null, error: orgError.message }; }

  return { id: org.id, error: null };
}

/**
 * Koppelt een BESTAAND REVA-account (op e-mailadres) aan een organisatie met
 * een rol. Uitnodigen van iemand die nog geen account heeft, is bewust nog
 * niet gebouwd — dat vereist een e-mail-uitnodigingsflow (Supabase admin API)
 * die pas zinvol is zodra er een echte praktijk mee onboardt.
 */
export async function addAdminOrgMember(
  orgId: string,
  email: string,
  roleId: string,
  locationId: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (profileError) { logErr("addAdminOrgMember(profile)", profileError); return { error: profileError.message }; }
  if (!profile) {
    return { error: "Geen bestaand REVA-account gevonden met dit e-mailadres. Diegene moet eerst zelf een account aanmaken." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", profile.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (existingError) logErr("addAdminOrgMember(existing check)", existingError);
  if (existing) {
    return { error: "Deze persoon is al gekoppeld aan deze organisatie." };
  }

  const { error: insertError } = await supabase.from("memberships").insert({
    user_id: profile.id,
    organization_id: orgId,
    role_id: roleId,
    location_id: locationId,
    status: "active",
  });
  if (insertError) { logErr("addAdminOrgMember(insert)", insertError); return { error: insertError.message }; }

  return { error: null };
}

// ─── Organisatie-eigenaar / medewerker uitnodigen (echte e-mail) ───────────

export interface AdminAccountMatch {
  id: string;
  fullName: string | null;
}

/**
 * Zoekt een bestaand REVA-account op e-mailadres — platform-admin-veilig
 * (directe profiles-query, dezelfde die addAdminOrgMember hierboven al
 * gebruikt). Bewust GEEN gebruik van portalService's portal_find_user_by_email
 * RPC: die vereist dat de AANROEPER al een actieve membership heeft, wat een
 * platform-admin per definitie nooit heeft — de lookup zou daar altijd leeg
 * terugkomen.
 */
export async function findExistingAccountByEmail(email: string): Promise<AdminAccountMatch | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) { logErr("findExistingAccountByEmail", error); return null; }
  if (!data) return null;
  return { id: data.id, fullName: data.full_name };
}

/**
 * Koppelt een bestaand account (gevonden via findExistingAccountByEmail) aan
 * een organisatie. Verstuurt bewust GEEN e-mail — de platform-admin heeft dit
 * account al herkend/bevestigd, dus dit is een directe koppeling, geen
 * uitnodiging.
 */
export async function linkExistingAccountToOrg(
  orgId: string,
  userId: string,
  roleId: string,
  locationId: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (existingError) logErr("linkExistingAccountToOrg(existing check)", existingError);
  if (existing) return { error: "Deze persoon is al gekoppeld aan deze organisatie." };

  const { error: insertError } = await supabase.from("memberships").insert({
    user_id: userId,
    organization_id: orgId,
    role_id: roleId,
    location_id: locationId,
    status: "active",
  });
  if (insertError) { logErr("linkExistingAccountToOrg(insert)", insertError); return { error: insertError.message }; }
  return { error: null };
}

export interface AdminMemberInviteInput {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  locationId: string | null;
}

/**
 * Nodigt iemand uit die nog GEEN bestaand REVA-account heeft (controleer dat
 * zelf vooraf via findExistingAccountByEmail — deze functie doet zelf geen
 * lookup). Zet een membership_invites-rij + verstuurt een echte magic-link
 * e-mail; de koppeling voltooit zichzelf zodra iemand die link gebruikt (zie
 * migratie 041, ensure_personal_organization).
 */
export async function inviteAdminOrgMember(
  orgId: string,
  input: AdminMemberInviteInput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const trimmedEmail = input.email.trim().toLowerCase();
  if (!trimmedEmail) return { error: "Vul een e-mailadres in." };

  const { data: newInvite, error: inviteInsertError } = await supabase
    .from("membership_invites")
    .insert({
      organization_id: orgId,
      email: trimmedEmail,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role_id: input.roleId,
      location_id: input.locationId,
    })
    .select("id")
    .single();
  if (inviteInsertError || !newInvite) {
    logErr("inviteAdminOrgMember(invite insert)", inviteInsertError);
    if (inviteInsertError?.code === "23505") return { error: "Er staat al een openstaande uitnodiging voor dit e-mailadres." };
    return { error: inviteInsertError?.message ?? "Aanmaken van de uitnodiging is niet gelukt." };
  }

  const { error: sendError } = await callSendInviteApi({ context: "admin", inviteId: newInvite.id });
  if (sendError) {
    return { error: "Uitnodiging aangemaakt, maar het versturen van de e-mail is niet gelukt. Probeer 'Opnieuw uitnodigen'." };
  }

  return { error: null };
}

export interface AdminOrgInvite {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  invitedAt: string;
}

export async function loadAdminOrgInvites(orgId: string): Promise<AdminOrgInvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membership_invites")
    .select("id, email, first_name, last_name, role_id, location_id, invited_at")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .order("invited_at", { ascending: false });
  if (error) { logErr("loadAdminOrgInvites", error); return []; }

  const rows = data ?? [];
  const roleIds = [...new Set(rows.map((r) => r.role_id))];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter((v): v is string => !!v))];
  const [rolesRes, locationsRes] = await Promise.all([
    roleIds.length > 0
      ? supabase.from("roles").select("id, key, name").in("id", roleIds)
      : Promise.resolve({ data: [] as { id: string; key: string; name: string }[], error: null }),
    locationIds.length > 0
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);
  const roleMap = new Map((rolesRes.data ?? []).map((r) => [r.id, r]));
  const locationMap = new Map((locationsRes.data ?? []).map((l) => [l.id, l.name]));

  return rows.map((r) => {
    const role = roleMap.get(r.role_id);
    return {
      id: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      roleId: r.role_id,
      roleKey: role?.key ?? "",
      roleName: role?.name ?? "",
      locationId: r.location_id,
      locationName: r.location_id ? locationMap.get(r.location_id) ?? null : null,
      invitedAt: r.invited_at,
    };
  });
}

export async function resendAdminOrgInvite(inviteId: string): Promise<{ error: string | null }> {
  return callSendInviteApi({ context: "admin", inviteId });
}

export async function cancelAdminOrgInvite(inviteId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("membership_invites").delete().eq("id", inviteId);
  if (error) { logErr("cancelAdminOrgInvite", error); return { error: "Verwijderen van de uitnodiging is niet gelukt." }; }
  return { error: null };
}

export async function loadAdminOrgUsage(orgId: string): Promise<AdminOrgUsage> {
  const supabase = createClient();

  const { data: patientRows, error: patientErr } = await supabase
    .from("patients")
    .select("id")
    .eq("organization_id", orgId);
  if (patientErr) { logErr("loadAdminOrgUsage(patients)", patientErr); return { lastSignInAt: null, checkinsLast30Days: 0 }; }

  const patientIds = (patientRows ?? []).map((p) => p.id as string);
  let checkinsLast30Days = 0;
  if (patientIds.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const { count, error: checkinErr } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .in("patient_id", patientIds)
      .gte("date", cutoffStr);
    if (checkinErr) logErr("loadAdminOrgUsage(checkins)", checkinErr);
    checkinsLast30Days = count ?? 0;
  }

  // Laatste login binnen de organisatie = meest recente last_sign_in_at van
  // haar leden (medewerkers). Nog altijd leeg zolang memberships leeg is —
  // dat is correct, er zijn nog geen medewerkers.
  const members = await loadAdminOrgMembers(orgId);
  const lastSignInAt = members
    .map((m) => m.lastSignInAt)
    .filter((v): v is string => !!v)
    .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return { lastSignInAt, checkinsLast30Days };
}
