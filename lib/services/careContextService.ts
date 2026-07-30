import { createClient } from "@/lib/supabaseClient";

/**
 * Voor de patiëntenkant: organisatie-/locatie-/behandelaarnaam via een
 * beveiligde RPC (migratie 058), zelfde patroon als brandingService.ts.
 * Een patiënt heeft geen directe SELECT-rechten op `organizations`/
 * `locations`/`profiles` van anderen — de RPC geeft alleen deze drie namen
 * terug, niets anders.
 */
export interface PatientCareContext {
  organizationName: string | null;
  locationName: string | null;
  therapistName: string | null;
  injuryType: string | null;
  injuryDate: string | null;
  surgeryDate: string | null;
  therapistPhone: string | null;
  therapistEmail: string | null;
}

export async function loadPatientCareContext(): Promise<PatientCareContext | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("patient_care_context");
  if (error) {
    console.error(`[loadPatientCareContext] Supabase error — message: "${error.message}"`);
    return null;
  }
  const row = (data as {
    organization_name: string | null; location_name: string | null; therapist_name: string | null; injury_type: string | null;
    injury_date: string | null; surgery_date: string | null;
    therapist_phone: string | null; therapist_email: string | null;
  }[] | null)?.[0];
  if (!row) return null;

  return {
    organizationName: row.organization_name,
    locationName: row.location_name,
    therapistName: row.therapist_name,
    injuryType: row.injury_type,
    injuryDate: row.injury_date,
    surgeryDate: row.surgery_date,
    therapistPhone: row.therapist_phone,
    therapistEmail: row.therapist_email,
  };
}
