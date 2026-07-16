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
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  locationId: string | null;
  locationName: string | null;
  therapistId: string | null;
  therapistName: string | null;
  protocolId: string | null;
  protocolName: string | null;
  treatmentStartDate: string | null;
  surgeryDate: string | null;
  status: string;
  createdAt: string;
  hasAccount: boolean;
  invitedAt: string | null;
  lastCheckinDate: string | null;
}

export interface PortalProtocolOption {
  id: string;
  name: string;
}

/**
 * Rollen die patiëntdossiers mogen beheren (aanmaken/bewerken/archiveren/
 * verwijderen) — moet in sync blijven met can_manage_org_patients() in
 * migratie 034. Puur voor UI-gating (knoppen tonen/verbergen); RLS is de
 * echte handhaving.
 */
export const MANAGE_PATIENTS_ROLES = ["organization_owner", "organization_admin", "location_manager", "therapist", "reception"];

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
    .select("id, user_id, location_id, status, created_at, first_name, last_name, email, phone, gender, date_of_birth, invited_at, assigned_therapist_id, protocol_id, treatment_start_date, surgery_date")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) { logErr("loadPortalPatients", error); return []; }

  const rows = data ?? [];
  const patientIds = rows.map((r) => r.id as string);
  const userIds = [...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))];
  const therapistIds = [...new Set(rows.map((r) => r.assigned_therapist_id).filter((v): v is string => !!v))];
  const profileIds = [...new Set([...userIds, ...therapistIds])];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter((v): v is string => !!v))];
  const protocolIds = [...new Set(rows.map((r) => r.protocol_id).filter((v): v is string => !!v))];

  const [profilesRes, locationsRes, protocolsRes, checkinsRes] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[], error: null }),
    locationIds.length > 0
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    protocolIds.length > 0
      ? supabase.from("protocols").select("id, name").in("id", protocolIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    patientIds.length > 0
      ? supabase.from("checkins").select("patient_id, date").in("patient_id", patientIds).order("date", { ascending: false })
      : Promise.resolve({ data: [] as { patient_id: string; date: string }[], error: null }),
  ]);
  if (profilesRes.error) logErr("loadPortalPatients(profiles)", profilesRes.error);
  if (locationsRes.error) logErr("loadPortalPatients(locations)", locationsRes.error);
  if (protocolsRes.error) logErr("loadPortalPatients(protocols)", protocolsRes.error);
  if (checkinsRes.error) logErr("loadPortalPatients(checkins)", checkinsRes.error);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const locationMap = new Map((locationsRes.data ?? []).map((l) => [l.id, l.name]));
  const protocolMap = new Map((protocolsRes.data ?? []).map((p) => [p.id, p.name]));
  const lastCheckinMap = new Map<string, string>();
  for (const c of checkinsRes.data ?? []) {
    if (!lastCheckinMap.has(c.patient_id)) lastCheckinMap.set(c.patient_id, c.date);
  }

  return rows.map((r) => {
    const profile = r.user_id ? profileMap.get(r.user_id) : undefined;
    const dossierName = [r.first_name, r.last_name].filter(Boolean).join(" ") || null;
    const therapist = r.assigned_therapist_id ? profileMap.get(r.assigned_therapist_id) : undefined;
    return {
      id: r.id as string,
      fullName: profile?.full_name ?? dossierName,
      email: profile?.email ?? (r.email as string | null),
      phone: r.phone as string | null,
      gender: r.gender as string | null,
      dateOfBirth: r.date_of_birth as string | null,
      locationId: r.location_id as string | null,
      locationName: r.location_id ? locationMap.get(r.location_id) ?? null : null,
      therapistId: r.assigned_therapist_id as string | null,
      therapistName: therapist?.full_name ?? null,
      protocolId: r.protocol_id as string | null,
      protocolName: r.protocol_id ? protocolMap.get(r.protocol_id) ?? null : null,
      treatmentStartDate: r.treatment_start_date as string | null,
      surgeryDate: r.surgery_date as string | null,
      status: r.status as string,
      createdAt: r.created_at as string,
      hasAccount: !!r.user_id,
      invitedAt: r.invited_at as string | null,
      lastCheckinDate: lastCheckinMap.get(r.id as string) ?? null,
    };
  });
}

export async function loadPortalProtocols(organizationId: string): Promise<PortalProtocolOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) { logErr("loadPortalProtocols", error); return []; }
  return data ?? [];
}

export async function createPortalProtocol(organizationId: string, name: string): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("protocols")
    .insert({ organization_id: organizationId, name: name.trim() })
    .select("id")
    .single();
  if (error) { logErr("createPortalProtocol", error); return { id: null, error: "Aanmaken van het protocol is niet gelukt." }; }
  return { id: data.id, error: null };
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

export interface PortalPatientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string; // "man" | "vrouw" | "anders" | ""
  locationId: string | null;
  therapistId: string | null;
  protocolId: string | null;
  treatmentStartDate: string;
  surgeryDate: string;
}

function patientInputToRow(input: PortalPatientInput) {
  return {
    location_id: input.locationId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    gender: input.gender || null,
    assigned_therapist_id: input.therapistId,
    protocol_id: input.protocolId,
    treatment_start_date: input.treatmentStartDate || null,
    surgery_date: input.surgeryDate || null,
  };
}

export async function createPortalPatient(
  organizationId: string,
  input: PortalPatientInput
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...patientInputToRow(input), organization_id: organizationId, status: "active" })
    .select("id")
    .single();
  if (error) {
    logErr("createPortalPatient", error);
    return { id: null, error: "Aanmaken van het patiëntdossier is niet gelukt." };
  }
  return { id: data.id, error: null };
}

export async function updatePortalPatient(
  patientId: string,
  input: PortalPatientInput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("patients")
    .update(patientInputToRow(input))
    .eq("id", patientId);
  if (error) {
    logErr("updatePortalPatient", error);
    return { error: "Bijwerken van het patiëntdossier is niet gelukt." };
  }
  return { error: null };
}

export async function updatePortalPatientStatus(
  patientId: string,
  status: "active" | "inactive" | "archived"
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patients").update({ status }).eq("id", patientId);
  if (error) {
    logErr("updatePortalPatientStatus", error);
    return { error: "Bijwerken van de status is niet gelukt." };
  }
  return { error: null };
}

export async function deletePortalPatient(patientId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("patients").delete().eq("id", patientId);
  if (error) {
    logErr("deletePortalPatient", error);
    return { error: "Verwijderen van het patiëntdossier is niet gelukt." };
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

/** Voor de intake-wizard: maakt het dossier aan en stuurt in één stap de uitnodiging. */
export async function createAndInvitePortalPatient(
  organizationId: string,
  input: PortalPatientInput
): Promise<InvitePortalPatientResult> {
  const { id, error: createError } = await createPortalPatient(organizationId, input);
  if (createError || !id) {
    return { outcome: "failed", error: createError ?? "Aanmaken van het patiëntdossier is niet gelukt." };
  }
  return invitePortalPatient(id, input.email);
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

// ─── Patiënt-detailpagina: "in één oogopslag" gegevens ─────────────────────

export interface PortalCheckinTrendPoint {
  date: string;
  dayScore: number;
  painScore: number | null;
  mobilityScore: number | null;
  energyScore: number | null;
  moodScore: number | null;
  sleepScore: number | null;
  swelling: boolean | null;
  note: string | null;
}

export interface PortalLatestMedication {
  date: string;
  time: string | null;
  medicationName: string;
  dosage: string | null;
  quantity: string | null;
  reason: string | null;
  effect: string | null;
}

export interface PortalLatestPhoto {
  date: string;
  imagePath: string | null;
  note: string | null;
}

export interface PortalUpcomingAppointment {
  title: string;
  appointmentType: string | null;
  date: string;
  time: string | null;
  location: string | null;
}

export interface PortalTrainingWeekSummary {
  completed: number;
  total: number;
}

export interface PortalRecentMilestone {
  title: string;
  completedAt: string;
}

export interface PortalMainGoal {
  icon: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface PortalPatientExtras {
  checkinTrend: PortalCheckinTrendPoint[]; // oudste → nieuwste, max 14
  latestMedication: PortalLatestMedication | null;
  latestPhoto: PortalLatestPhoto | null;
  upcomingAppointment: PortalUpcomingAppointment | null;
  trainingWeek: PortalTrainingWeekSummary;
  recentMilestone: PortalRecentMilestone | null;
  mainGoal: PortalMainGoal | null;
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

/**
 * Aanvullende gegevens voor de patiënt-detailpagina: check-in trend,
 * laatste medicatie-inname, laatste foto-update, eerstvolgende afspraak,
 * trainingsvoortgang deze week, de meest recente behaalde mijlpaal en de
 * hoofddoelstelling. Bewust apart van `loadPortalPatients` gehouden — die
 * functie levert de basisgegevens (naam, therapeut, protocol, ...) al
 * correct, dit is puur de nieuwe "oogopslag"-laag erbovenop.
 */
export async function loadPortalPatientExtras(patientId: string): Promise<PortalPatientExtras> {
  const supabase = createClient();
  const today = dateStr(new Date());
  const weekAgo = daysAgoStr(6);

  const [checkinsRes, medRes, photoRes, apptRes, trainingRes, milestoneRes, goalRes] = await Promise.all([
    supabase
      .from("checkins")
      .select("date, day_score, pain_score, mobility_score, energy_score, mood_score, sleep_score, swelling, note")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("medication_logs")
      .select("date, time, medication_name, dosage, quantity, reason, effect")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .order("time", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("dossier_photo_updates")
      .select("date, image_url, note")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("title, appointment_type, date, time, location")
      .eq("patient_id", patientId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("training_logs")
      .select("completed")
      .eq("patient_id", patientId)
      .gte("date", weekAgo),
    supabase
      .from("milestones")
      .select("title, completed_at")
      .eq("patient_id", patientId)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("goals")
      .select("icon, title, description, target_date, completed, completed_at")
      .eq("patient_id", patientId)
      .eq("goal_type", "main")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (checkinsRes.error) logErr("loadPortalPatientExtras(checkins)", checkinsRes.error);
  if (medRes.error) logErr("loadPortalPatientExtras(medicatie)", medRes.error);
  if (photoRes.error) logErr("loadPortalPatientExtras(foto)", photoRes.error);
  if (apptRes.error) logErr("loadPortalPatientExtras(afspraak)", apptRes.error);
  if (trainingRes.error) logErr("loadPortalPatientExtras(training)", trainingRes.error);
  if (milestoneRes.error) logErr("loadPortalPatientExtras(mijlpaal)", milestoneRes.error);
  if (goalRes.error) logErr("loadPortalPatientExtras(hoofddoel)", goalRes.error);

  const checkinTrend: PortalCheckinTrendPoint[] = (checkinsRes.data ?? [])
    .map((c) => ({
      date: c.date as string,
      dayScore: c.day_score as number,
      painScore: c.pain_score as number | null,
      mobilityScore: c.mobility_score as number | null,
      energyScore: c.energy_score as number | null,
      moodScore: c.mood_score as number | null,
      sleepScore: c.sleep_score as number | null,
      swelling: c.swelling as boolean | null,
      note: c.note as string | null,
    }))
    .reverse();

  const med = medRes.data;
  const photo = photoRes.data;
  const appt = apptRes.data;
  const milestone = milestoneRes.data;
  const goal = goalRes.data;
  const trainingRows = trainingRes.data ?? [];

  return {
    checkinTrend,
    latestMedication: med
      ? {
          date: med.date as string,
          time: med.time as string | null,
          medicationName: med.medication_name as string,
          dosage: med.dosage as string | null,
          quantity: med.quantity as string | null,
          reason: med.reason as string | null,
          effect: med.effect as string | null,
        }
      : null,
    latestPhoto: photo
      ? { date: photo.date as string, imagePath: photo.image_url as string | null, note: photo.note as string | null }
      : null,
    upcomingAppointment: appt
      ? {
          title: appt.title as string,
          appointmentType: appt.appointment_type as string | null,
          date: appt.date as string,
          time: appt.time as string | null,
          location: appt.location as string | null,
        }
      : null,
    trainingWeek: {
      completed: trainingRows.filter((r) => r.completed).length,
      total: trainingRows.length,
    },
    recentMilestone: milestone
      ? { title: milestone.title as string, completedAt: milestone.completed_at as string }
      : null,
    mainGoal: goal
      ? {
          icon: goal.icon as string,
          title: goal.title as string,
          description: goal.description as string | null,
          targetDate: goal.target_date as string | null,
          completed: goal.completed as boolean,
          completedAt: goal.completed_at as string | null,
        }
      : null,
  };
}
