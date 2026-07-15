import { createClient } from "@/lib/supabaseClient";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
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
  address: string | null;
  supportNotes: string | null;
  lastContactAt: string | null;
  createdAt: string;
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
  address?: string | null;
  supportNotes?: string | null;
  lastContactAt?: string | null;
}

export interface AdminOrgLocation {
  id: string;
  name: string;
  city: string | null;
  status: string;
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
    .select("id, name, status, logo_path, kvk_number, btw_number, website, contact_name, contact_email, contact_phone, address, support_notes, last_contact_at, created_at")
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
    address: data.address,
    supportNotes: data.support_notes,
    lastContactAt: data.last_contact_at,
    createdAt: data.created_at,
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
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.supportNotes !== undefined) dbPatch.support_notes = patch.supportNotes;
  if (patch.lastContactAt !== undefined) dbPatch.last_contact_at = patch.lastContactAt;

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
    .select("id, name, city, status, patients(count)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error) { logErr("loadAdminOrgLocations", error); return []; }
  return ((data ?? []) as unknown as { id: string; name: string; city: string | null; status: string; patients: { count: number }[] | null }[]).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    status: row.status,
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
