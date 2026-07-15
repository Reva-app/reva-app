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
