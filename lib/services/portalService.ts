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
 * sessie-cookie, die kan achterlopen op een stille token-refresh (zelfde reden
 * als bij /api/delete-account).
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

export interface PortalMembership {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  locationId: string | null;
  locationName: string | null;
  roleKey: string;
  roleName: string;
  welcomedAt: string | null;
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
 * migratie 041. Puur voor UI-gating (knoppen tonen/verbergen); RLS is de
 * echte handhaving.
 */
export const MANAGE_PATIENTS_ROLES = ["organization_owner", "therapist", "practice_staff"];

export interface PortalDashboardStats {
  patientCount: number;
  colleagueCount: number;
  locationCount: number;
}

export interface PortalLocationOption {
  id: string;
  name: string;
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

/**
 * Statuslabel voor de medewerkersmodule. "invited" bestaat niet op
 * memberships zelf (dat is een openstaande membership_invites-rij) — deze
 * wordt in loadPortalStaffOverview() samengevoegd met "active"/"suspended".
 */
export type PortalStaffStatus = "invited" | "active" | "suspended";

export const PORTAL_STAFF_STATUS_LABELS: Record<PortalStaffStatus, string> = {
  invited: "Uitgenodigd",
  active: "Actief",
  suspended: "Geblokkeerd",
};

/**
 * Eén rij voor de medewerkersmodule (overzicht + detailpagina) — combineert
 * een echte membership (kind "member") met een openstaande uitnodiging
 * (kind "invite", nog geen auth.users/memberships-rij). Los van het oudere,
 * eenvoudigere PortalMember/loadPortalMembers (blijft ongewijzigd bestaan
 * voor de "Behandelend therapeut"-dropdowns elders in de app).
 */
export interface PortalStaffMember {
  id: string;
  kind: "member" | "invite";
  userId: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  bigNumber: string | null;
  avatarUrl: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  status: PortalStaffStatus;
  lastSignInAt: string | null;
  invitedAt: string | null;
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
    .select("id, organization_id, location_id, role_id, welcomed_at")
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
    membershipId: membership.id,
    organizationId: membership.organization_id,
    organizationName: orgRes.data?.name ?? "Onbekende organisatie",
    locationId: membership.location_id,
    locationName: locRes.data?.name ?? null,
    roleKey: roleRes.data?.key ?? "",
    roleName: roleRes.data?.name ?? "",
    welcomedAt: membership.welcomed_at,
  };
}

/**
 * Markeert het welkomstscherm als gezien voor deze membership. Werkt vandaag
 * alleen voor organization_owner: memberships-UPDATE is sinds migratie 041
 * can_manage_org_staff()-gated (self-update door andere rollen is bewust
 * geblokkeerd, zie de RLS-privilege-escalatiefix in die migratie) — als het
 * welkomstscherm ooit naar andere rollen uitbreidt, is een gerichte
 * SECURITY DEFINER RPC of een aparte additieve policy dan nodig.
 */
export async function markMembershipWelcomed(membershipId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("memberships").update({ welcomed_at: new Date().toISOString() }).eq("id", membershipId);
  if (error) { logErr("markMembershipWelcomed", error); return { error: "Bijwerken is niet gelukt." }; }
  return { error: null };
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function loadPortalDashboardStats(organizationId: string): Promise<PortalDashboardStats> {
  const supabase = createClient();
  const [patients, colleagues, locations] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("archived", false),
  ]);
  if (patients.error) logErr("loadPortalDashboardStats(patients)", patients.error);
  if (colleagues.error) logErr("loadPortalDashboardStats(memberships)", colleagues.error);
  if (locations.error) logErr("loadPortalDashboardStats(locations)", locations.error);
  return {
    patientCount: patients.count ?? 0,
    colleagueCount: colleagues.count ?? 0,
    locationCount: locations.count ?? 0,
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
    .eq("archived", false)
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
  organizationId: string,
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

  const { error: sendError } = await callSendInviteApi({ context: "portal-patient", organizationId, patientId });
  if (sendError) {
    return { outcome: "failed", error: sendError };
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
  return invitePortalPatient(id, organizationId, input.email);
}

// ─── Vestigingen (zelf-service) ─────────────────────────────────────────────

/**
 * Rollen die vestigingen mogen beheren (aanmaken/bewerken/archiveren/
 * verwijderen/hoofdvestiging wijzigen) — moet in sync blijven met
 * can_manage_org_locations() in migratie 041. Bewust beperkter dan
 * MANAGE_PATIENTS_ROLES: vestigingenbeheer is een organisatiebrede
 * structurele beslissing, geen dagelijkse patiëntenzorg-taak (zelfde
 * redenering als MANAGE_BRANDING_ROLES/MANAGE_STAFF_ROLES).
 */
export const MANAGE_LOCATIONS_ROLES = ["organization_owner"];

/** Alleen platform-admin-beheerd (via /admin), praktijken kunnen dit niet zelf verhogen. */
export async function loadPortalMaxLocations(organizationId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("max_locations")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) { logErr("loadPortalMaxLocations", error); return 0; }
  return data?.max_locations ?? 0;
}

const OPENING_HOURS_DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type PortalOpeningHoursDayKey = (typeof OPENING_HOURS_DAY_KEYS)[number];

export interface PortalOpeningHoursDay {
  open: boolean;
  from: string;
  to: string;
}

export type PortalOpeningHours = Record<PortalOpeningHoursDayKey, PortalOpeningHoursDay>;

export const OPENING_HOURS_DAY_LABELS: Record<PortalOpeningHoursDayKey, string> = {
  monday: "Maandag", tuesday: "Dinsdag", wednesday: "Woensdag", thursday: "Donderdag",
  friday: "Vrijdag", saturday: "Zaterdag", sunday: "Zondag",
};

const OPENING_HOURS_DAY_SHORT: Record<PortalOpeningHoursDayKey, string> = {
  monday: "Ma", tuesday: "Di", wednesday: "Wo", thursday: "Do", friday: "Vr", saturday: "Za", sunday: "Zo",
};

export const DEFAULT_OPENING_HOURS: PortalOpeningHours = OPENING_HOURS_DAY_KEYS.reduce((acc, day) => {
  acc[day] = { open: false, from: "09:00", to: "17:00" };
  return acc;
}, {} as PortalOpeningHours);

/** Korte, leesbare samenvatting van de openingstijden voor op de kaart, bv. "Ma–Vr 09:00–17:00". */
export function summarizeOpeningHours(hours: PortalOpeningHours): string {
  const openDays = OPENING_HOURS_DAY_KEYS.filter((d) => hours[d]?.open);
  if (openDays.length === 0) return "Gesloten";
  const first = hours[openDays[0]];
  const sameHours = openDays.every((d) => hours[d].from === first.from && hours[d].to === first.to);
  if (!sameHours) return "Wisselende tijden";
  const indices = openDays.map((d) => OPENING_HOURS_DAY_KEYS.indexOf(d));
  const isContiguous = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
  const rangeLabel = isContiguous && openDays.length > 1
    ? `${OPENING_HOURS_DAY_SHORT[openDays[0]]}–${OPENING_HOURS_DAY_SHORT[openDays[openDays.length - 1]]}`
    : openDays.map((d) => OPENING_HOURS_DAY_SHORT[d]).join(", ");
  return `${rangeLabel} ${first.from}–${first.to}`;
}

export interface PortalLocationCard {
  id: string;
  name: string;
  isMainLocation: boolean;
  archived: boolean;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  openingHours: PortalOpeningHours;
  employeeCount: number;
  patientCount: number;
}

export interface PortalLocationEmployee {
  membershipId: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  roleName: string;
}

export interface PortalLocationFull {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  isMainLocation: boolean;
  archived: boolean;
  openingHours: PortalOpeningHours;
  employees: PortalLocationEmployee[];
}

export interface PortalLocationInput {
  name: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  openingHours: PortalOpeningHours;
}

function locationInputToRow(input: PortalLocationInput) {
  return {
    name: input.name.trim(),
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    website: input.website.trim() || null,
    street: input.street.trim() || null,
    house_number: input.houseNumber.trim() || null,
    postal_code: input.postalCode.trim() || null,
    city: input.city.trim() || null,
    country: input.country.trim() || "Nederland",
    opening_hours: input.openingHours,
  };
}

export async function loadPortalLocationCards(organizationId: string): Promise<PortalLocationCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, is_main_location, archived, street, house_number, postal_code, city, opening_hours, memberships!memberships_location_id_fkey(count), patients(count)")
    .eq("organization_id", organizationId)
    .order("is_main_location", { ascending: false })
    .order("name");
  if (error) { logErr("loadPortalLocationCards", error); return []; }
  return ((data ?? []) as unknown as {
    id: string; name: string; is_main_location: boolean; archived: boolean;
    street: string | null; house_number: string | null; postal_code: string | null; city: string | null;
    opening_hours: PortalOpeningHours | null;
    memberships: { count: number }[] | null;
    patients: { count: number }[] | null;
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    isMainLocation: r.is_main_location,
    archived: r.archived,
    street: r.street,
    houseNumber: r.house_number,
    postalCode: r.postal_code,
    city: r.city,
    openingHours: r.opening_hours ?? DEFAULT_OPENING_HOURS,
    employeeCount: r.memberships?.[0]?.count ?? 0,
    patientCount: r.patients?.[0]?.count ?? 0,
  }));
}

export async function loadPortalLocationFull(locationId: string): Promise<PortalLocationFull | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, organization_id, name, phone, email, website, street, house_number, postal_code, city, country, is_main_location, archived, opening_hours")
    .eq("id", locationId)
    .maybeSingle();
  if (error) { logErr("loadPortalLocationFull", error); return null; }
  if (!data) return null;

  const { data: memberRows, error: memberErr } = await supabase
    .from("memberships")
    .select("id, user_id, role_id")
    .eq("location_id", locationId)
    .eq("status", "active");
  if (memberErr) logErr("loadPortalLocationFull(memberships)", memberErr);

  const rows = memberRows ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const roleIds = [...new Set(rows.map((r) => r.role_id as string))];

  const [profilesRes, rolesRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; avatar_url: string | null }[], error: null }),
    roleIds.length > 0
      ? supabase.from("roles").select("id, name").in("id", roleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const roleMap = new Map((rolesRes.data ?? []).map((r) => [r.id, r.name]));

  const employees: PortalLocationEmployee[] = rows.map((r) => {
    const profile = profileMap.get(r.user_id as string);
    return {
      membershipId: r.id as string,
      userId: r.user_id as string,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      roleName: roleMap.get(r.role_id as string) ?? "",
    };
  });

  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    website: data.website,
    street: data.street,
    houseNumber: data.house_number,
    postalCode: data.postal_code,
    city: data.city,
    country: data.country,
    isMainLocation: data.is_main_location,
    archived: data.archived,
    openingHours: (data.opening_hours as PortalOpeningHours | null) ?? DEFAULT_OPENING_HOURS,
    employees,
  };
}

export async function createPortalLocationFull(
  organizationId: string,
  input: PortalLocationInput
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("locations")
    .insert({ ...locationInputToRow(input), organization_id: organizationId })
    .select("id")
    .single();
  if (error) {
    logErr("createPortalLocationFull", error);
    if (error.message?.includes("Maximum aantal vestigingen")) {
      return { id: null, error: "Je hebt het maximum aantal vestigingen voor je abonnement bereikt." };
    }
    return { id: null, error: "Aanmaken van de vestiging is niet gelukt." };
  }
  return { id: data.id, error: null };
}

export async function updatePortalLocationFull(
  locationId: string,
  input: PortalLocationInput
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("locations").update(locationInputToRow(input)).eq("id", locationId);
  if (error) {
    logErr("updatePortalLocationFull", error);
    return { error: "Bijwerken van de vestiging is niet gelukt." };
  }
  return { error: null };
}

export async function setPortalMainLocation(locationId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_main_location", { p_location_id: locationId });
  if (error) {
    logErr("setPortalMainLocation", error);
    return { error: error.message || "Instellen van de hoofdvestiging is niet gelukt." };
  }
  return { error: null };
}

export async function updatePortalLocationArchived(
  locationId: string,
  archived: boolean
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("locations").update({ archived }).eq("id", locationId);
  if (error) {
    logErr("updatePortalLocationArchived", error);
    if (error.message?.includes("hoofdvestiging")) {
      return { error: error.message };
    }
    return { error: "Bijwerken van de vestiging is niet gelukt." };
  }
  return { error: null };
}

export async function deletePortalLocationChecked(locationId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const [membersRes, patientsRes] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("location_id", locationId),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("location_id", locationId),
  ]);
  const memberCount = membersRes.count ?? 0;
  const patientCount = patientsRes.count ?? 0;
  if (memberCount > 0 || patientCount > 0) {
    const parts: string[] = [];
    if (memberCount > 0) parts.push(`${memberCount} ${memberCount === 1 ? "medewerker" : "medewerkers"}`);
    if (patientCount > 0) parts.push(`${patientCount} ${patientCount === 1 ? "patiënt" : "patiënten"}`);
    const verb = memberCount + patientCount === 1 ? "is" : "zijn";
    return { error: `Deze vestiging kan niet verwijderd worden: er ${verb} nog ${parts.join(" en ")} aan gekoppeld.` };
  }

  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) {
    logErr("deletePortalLocationChecked", error);
    if (error.message?.includes("hoofdvestiging")) {
      return { error: error.message };
    }
    return { error: "Verwijderen van de vestiging is niet gelukt." };
  }
  return { error: null };
}

// ─── Medewerkers (zelf-service) ─────────────────────────────────────────────

/**
 * Rollen die medewerkers mogen beheren (uitnodigen/bewerken/blokkeren/
 * verwijderen) — moet in sync blijven met can_manage_org_staff() in
 * migratie 041. Uitsluitend de Practice Owner: dit is de fundering van het
 * autorisatiesysteem, geen dagelijkse taak voor andere rollen.
 */
export const MANAGE_STAFF_ROLES = ["organization_owner"];

/** De drie canonieke rollen (organization_owner/therapist/practice_staff) — zie migratie 041. */
const CANONICAL_ROLE_KEYS = ["organization_owner", "therapist", "practice_staff"];

/** Precies de 3 canonieke rollen — de overige 5 rolrijen blijven in de database staan maar worden niet meer aangeboden (migratie 041). */
export async function loadPortalRoles(): Promise<PortalRoleOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, name")
    .in("key", CANONICAL_ROLE_KEYS)
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

/** Alleen platform-admin-beheerd (via /admin), praktijken kunnen dit niet zelf verhogen. */
export async function loadPortalMaxMembers(organizationId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("max_members")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) { logErr("loadPortalMaxMembers", error); return 0; }
  return (data?.max_members as number | null) ?? 0;
}

type RawStaffInvite = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  location_id: string | null;
  invited_at: string;
};

async function loadPortalStaffInvites(organizationId: string): Promise<PortalStaffMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membership_invites")
    .select("id, email, first_name, last_name, role_id, location_id, invited_at")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("invited_at", { ascending: false });
  if (error) { logErr("loadPortalStaffInvites", error); return []; }

  const rows = (data ?? []) as RawStaffInvite[];
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
      kind: "invite",
      userId: null,
      fullName: `${r.first_name} ${r.last_name}`.trim(),
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: null,
      title: null,
      bigNumber: null,
      avatarUrl: null,
      roleId: r.role_id,
      roleKey: role?.key ?? "",
      roleName: role?.name ?? "",
      locationId: r.location_id,
      locationName: r.location_id ? locationMap.get(r.location_id) ?? null : null,
      status: "invited",
      lastSignInAt: null,
      invitedAt: r.invited_at,
    };
  });
}

async function loadPortalActiveStaff(organizationId: string): Promise<PortalStaffMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_list_org_members", { org_id: organizationId });
  if (error) { logErr("loadPortalActiveStaff", error); return []; }
  return ((data ?? []) as {
    membership_id: string;
    user_id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
    big_number: string | null;
    avatar_url: string | null;
    role_id: string;
    role_key: string;
    role_name: string;
    location_id: string | null;
    location_name: string | null;
    membership_status: string;
    last_sign_in_at: string | null;
  }[]).map((row) => ({
    id: row.membership_id,
    kind: "member",
    userId: row.user_id,
    fullName: row.full_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    bigNumber: row.big_number,
    avatarUrl: row.avatar_url,
    roleId: row.role_id,
    roleKey: row.role_key,
    roleName: row.role_name,
    locationId: row.location_id,
    locationName: row.location_name,
    status: row.membership_status === "suspended" ? "suspended" : "active",
    lastSignInAt: row.last_sign_in_at,
    invitedAt: null,
  }));
}

/** Combineert actieve/geblokkeerde medewerkers met openstaande uitnodigingen tot één lijst (uitgenodigd eerst). */
export async function loadPortalStaffOverview(organizationId: string): Promise<PortalStaffMember[]> {
  const [active, invites] = await Promise.all([
    loadPortalActiveStaff(organizationId),
    loadPortalStaffInvites(organizationId),
  ]);
  return [...invites, ...active];
}

export interface StaffInviteInput {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  locationId: string | null;
}

export type InviteStaffMemberResult =
  | { outcome: "linked"; error: null }
  | { outcome: "invited"; error: null }
  | { outcome: "failed"; error: string };

/**
 * Nodigt een medewerker uit: bestaat er al een REVA-account met dit
 * e-mailadres, dan wordt direct een actieve membership aangemaakt; anders
 * komt er een membership_invites-rij + een echte magic-link e-mail. De
 * koppeling voltooit zichzelf zodra iemand die link gebruikt en zelf een
 * wachtwoord kiest (zie migratie 041, ensure_personal_organization).
 */
export async function inviteStaffMember(
  organizationId: string,
  input: StaffInviteInput
): Promise<InviteStaffMemberResult> {
  const supabase = createClient();
  const trimmedEmail = input.email.trim().toLowerCase();
  if (!trimmedEmail) return { outcome: "failed", error: "Vul een e-mailadres in." };

  const { data: found, error: lookupError } = await supabase.rpc("portal_find_user_by_email", {
    p_email: trimmedEmail,
  });
  if (lookupError) { logErr("inviteStaffMember(lookup)", lookupError); return { outcome: "failed", error: lookupError.message }; }
  const existingProfile = (found as { id: string; full_name: string | null }[] | null)?.[0];

  if (existingProfile) {
    const { data: existing, error: existingError } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", existingProfile.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (existingError) logErr("inviteStaffMember(existing check)", existingError);
    if (existing) return { outcome: "failed", error: "Deze persoon is al gekoppeld aan jouw organisatie." };

    const { error: insertError } = await supabase.from("memberships").insert({
      user_id: existingProfile.id,
      organization_id: organizationId,
      role_id: input.roleId,
      location_id: input.locationId,
      status: "active",
    });
    if (insertError) {
      logErr("inviteStaffMember(link)", insertError);
      if (insertError.message?.includes("medewerkers")) return { outcome: "failed", error: insertError.message };
      return { outcome: "failed", error: "Koppelen van het account is niet gelukt." };
    }
    return { outcome: "linked", error: null };
  }

  const { data: newInvite, error: inviteInsertError } = await supabase
    .from("membership_invites")
    .insert({
      organization_id: organizationId,
      email: trimmedEmail,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      role_id: input.roleId,
      location_id: input.locationId,
    })
    .select("id")
    .single();
  if (inviteInsertError || !newInvite) {
    logErr("inviteStaffMember(invite insert)", inviteInsertError);
    if (inviteInsertError?.code === "23505") return { outcome: "failed", error: "Er staat al een openstaande uitnodiging voor dit e-mailadres." };
    if (inviteInsertError?.message?.includes("medewerkers")) return { outcome: "failed", error: inviteInsertError.message };
    return { outcome: "failed", error: "Aanmaken van de uitnodiging is niet gelukt." };
  }

  const { error: sendError } = await callSendInviteApi({ context: "portal-staff", inviteId: newInvite.id });
  if (sendError) {
    return { outcome: "failed", error: "Uitnodiging aangemaakt, maar het versturen van de e-mail is niet gelukt. Probeer 'Opnieuw uitnodigen'." };
  }

  return { outcome: "invited", error: null };
}

export async function resendStaffInvite(inviteId: string): Promise<{ error: string | null }> {
  return callSendInviteApi({ context: "portal-staff", inviteId });
}

export async function deleteStaffInvite(inviteId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("membership_invites").delete().eq("id", inviteId);
  if (error) { logErr("deleteStaffInvite", error); return { error: "Verwijderen van de uitnodiging is niet gelukt." }; }
  return { error: null };
}

/** Rol/hoofdvestiging/status van een medewerker bijwerken — hergebruikt updatePortalMember. */
export async function updateStaffMember(
  membershipId: string,
  patch: { roleId?: string; locationId?: string | null; status?: "active" | "suspended" }
): Promise<{ error: string | null }> {
  return updatePortalMember(membershipId, patch);
}

export async function deleteStaffMember(membershipId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) {
    logErr("deleteStaffMember", error);
    if (error.message?.includes("Practice Owner")) return { error: error.message };
    return { error: "Verwijderen van de medewerker is niet gelukt." };
  }
  return { error: null };
}

export async function loadMembershipLocations(membershipId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("membership_locations")
    .select("location_id")
    .eq("membership_id", membershipId);
  if (error) { logErr("loadMembershipLocations", error); return []; }
  return (data ?? []).map((r) => r.location_id as string);
}

export async function updateMembershipLocations(membershipId: string, locationIds: string[]): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error: delError } = await supabase.from("membership_locations").delete().eq("membership_id", membershipId);
  if (delError) { logErr("updateMembershipLocations(delete)", delError); return { error: "Bijwerken van de vestigingen is niet gelukt." }; }
  if (locationIds.length === 0) return { error: null };
  const { error: insError } = await supabase
    .from("membership_locations")
    .insert(locationIds.map((locationId) => ({ membership_id: membershipId, location_id: locationId })));
  if (insError) { logErr("updateMembershipLocations(insert)", insError); return { error: "Bijwerken van de vestigingen is niet gelukt." }; }
  return { error: null };
}

export type PortalWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface PortalWorkDay {
  isOff: boolean;
  startTime: string;
  endTime: string;
}

export type PortalWorkSchedule = Record<PortalWeekday, PortalWorkDay>;

const WEEKDAY_KEYS: PortalWeekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const WEEKDAY_LABELS: Record<PortalWeekday, string> = {
  monday: "Maandag",
  tuesday: "Dinsdag",
  wednesday: "Woensdag",
  thursday: "Donderdag",
  friday: "Vrijdag",
  saturday: "Zaterdag",
  sunday: "Zondag",
};

export const DEFAULT_WORK_SCHEDULE: PortalWorkSchedule = WEEKDAY_KEYS.reduce((acc, day) => {
  acc[day] = { isOff: true, startTime: "09:00", endTime: "17:00" };
  return acc;
}, {} as PortalWorkSchedule);

export async function loadWorkSchedule(membershipId: string): Promise<PortalWorkSchedule> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_schedules")
    .select("weekday, start_time, end_time, is_off")
    .eq("membership_id", membershipId);
  if (error) { logErr("loadWorkSchedule", error); return { ...DEFAULT_WORK_SCHEDULE }; }
  const schedule = { ...DEFAULT_WORK_SCHEDULE };
  for (const row of (data ?? []) as { weekday: string; start_time: string | null; end_time: string | null; is_off: boolean }[]) {
    const day = row.weekday as PortalWeekday;
    schedule[day] = {
      isOff: row.is_off,
      startTime: row.start_time ?? "09:00",
      endTime: row.end_time ?? "17:00",
    };
  }
  return schedule;
}

export async function updateWorkSchedule(membershipId: string, schedule: PortalWorkSchedule): Promise<{ error: string | null }> {
  const supabase = createClient();
  const rows = WEEKDAY_KEYS.map((day) => ({
    membership_id: membershipId,
    weekday: day,
    is_off: schedule[day].isOff,
    start_time: schedule[day].isOff ? null : schedule[day].startTime,
    end_time: schedule[day].isOff ? null : schedule[day].endTime,
  }));
  const { error } = await supabase.from("work_schedules").upsert(rows, { onConflict: "membership_id,weekday" });
  if (error) { logErr("updateWorkSchedule", error); return { error: "Bijwerken van de werkuren is niet gelukt." }; }
  return { error: null };
}

/**
 * Werkt profielvelden (Tab 1) van een medewerker bij. Eigen profiel: altijd
 * toegestaan (bestaande zelf-only RLS). Collega's profiel: alleen de
 * Practice Owner (migratie 043 — additieve RLS-policy). full_name wordt
 * afgeleid meegestuurd zodat de 12+ bestaande call sites die daarop
 * vertrouwen niet stil achterblijven.
 */
export async function updateStaffProfile(
  userId: string,
  patch: { firstName: string; lastName: string; phone: string | null; title: string | null; bigNumber: string | null }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const fullName = `${patch.firstName.trim()} ${patch.lastName.trim()}`.trim();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: patch.firstName.trim(),
      last_name: patch.lastName.trim(),
      full_name: fullName,
      phone: patch.phone,
      title: patch.title,
      big_number: patch.bigNumber,
    })
    .eq("id", userId);
  if (error) { logErr("updateStaffProfile", error); return { error: "Bijwerken van de gegevens is niet gelukt." }; }
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

// ─── Huisstijl (branding) ───────────────────────────────────────────────────

const LOGO_BUCKET = "organization-logos";
const LOGO_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Rollen die de huisstijl (naam/kleur/logo) van de organisatie mogen
 * beheren — moet in sync blijven met can_manage_org_branding() in migratie
 * 041. Bewust beperkter dan MANAGE_PATIENTS_ROLES: branding is een
 * organisatiebrede instelling, geen dagelijkse patiëntenzorg-taak.
 */
export const MANAGE_BRANDING_ROLES = ["organization_owner"];

export interface PortalBranding {
  name: string;
  primaryColor: string | null;
  logoPath: string | null;
  logoUrl: string | null;
}

export async function loadPortalBranding(organizationId: string): Promise<PortalBranding | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("name, primary_color, logo_path")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) { logErr("loadPortalBranding", error); return null; }
  if (!data) return null;

  let logoUrl: string | null = null;
  if (data.logo_path) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(data.logo_path, LOGO_SIGNED_URL_TTL_SECONDS);
    if (signErr) logErr("loadPortalBranding(logo)", signErr);
    logoUrl = signed?.signedUrl ?? null;
  }

  return {
    name: data.name,
    primaryColor: data.primary_color,
    logoPath: data.logo_path,
    logoUrl,
  };
}

export async function updatePortalBranding(
  organizationId: string,
  patch: { name?: string; primaryColor?: string | null }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.primaryColor !== undefined) dbPatch.primary_color = patch.primaryColor;

  const { error } = await supabase.from("organizations").update(dbPatch).eq("id", organizationId);
  if (error) {
    logErr("updatePortalBranding", error);
    return { error: "Bijwerken van de huisstijl is niet gelukt." };
  }
  return { error: null };
}

export async function uploadPortalLogo(
  organizationId: string,
  file: File
): Promise<{ logoUrl: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${organizationId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) {
    logErr("uploadPortalLogo(upload)", uploadError);
    return { logoUrl: null, error: "Uploaden van het logo is niet gelukt." };
  }

  const { error: updateError } = await supabase.from("organizations").update({ logo_path: path }).eq("id", organizationId);
  if (updateError) {
    logErr("uploadPortalLogo(update)", updateError);
    return { logoUrl: null, error: "Opslaan van het logo is niet gelukt." };
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(LOGO_BUCKET)
    .createSignedUrl(path, LOGO_SIGNED_URL_TTL_SECONDS);
  if (signErr) { logErr("uploadPortalLogo(sign)", signErr); return { logoUrl: null, error: null }; }

  return { logoUrl: signed.signedUrl, error: null };
}
