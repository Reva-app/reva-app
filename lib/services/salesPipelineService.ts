import { createClient } from "@/lib/supabaseClient";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

export type SalesLeadStage = "nieuw" | "contact_gelegd" | "demo_gepland" | "onderhandeling" | "gewonnen" | "verloren";

export interface SalesLead {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  stage: SalesLeadStage;
  estimatedValue: number | null;
  notes: string | null;
  lastContactDate: string | null;
  nextActionDate: string | null;
  createdAt: string;
}

export interface SalesLeadInput {
  companyName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  stage?: SalesLeadStage;
  estimatedValue?: number | null;
  notes?: string | null;
  lastContactDate?: string | null;
  nextActionDate?: string | null;
}

const SELECT_FIELDS = "id, company_name, contact_name, contact_email, contact_phone, stage, estimated_value, notes, last_contact_date, next_action_date, created_at";

function mapRow(r: {
  id: string; company_name: string; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; stage: string; estimated_value: number | null; notes: string | null;
  last_contact_date: string | null; next_action_date: string | null; created_at: string;
}): SalesLead {
  return {
    id: r.id, companyName: r.company_name, contactName: r.contact_name, contactEmail: r.contact_email,
    contactPhone: r.contact_phone, stage: r.stage as SalesLeadStage, estimatedValue: r.estimated_value,
    notes: r.notes, lastContactDate: r.last_contact_date, nextActionDate: r.next_action_date, createdAt: r.created_at,
  };
}

export async function loadSalesLeads(): Promise<SalesLead[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("sales_leads").select(SELECT_FIELDS).order("created_at", { ascending: false });
  if (error) { logErr("loadSalesLeads", error); return []; }
  return (data ?? []).map(mapRow);
}

export async function createSalesLead(input: SalesLeadInput): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales_leads")
    .insert({
      company_name: input.companyName.trim(),
      contact_name: input.contactName?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      stage: input.stage ?? "nieuw",
      estimated_value: input.estimatedValue ?? null,
      notes: input.notes?.trim() || null,
      last_contact_date: input.lastContactDate || null,
      next_action_date: input.nextActionDate || null,
    })
    .select("id")
    .single();
  if (error) { logErr("createSalesLead", error); return { id: null, error: "Aanmaken van het bedrijf is niet gelukt." }; }
  return { id: data.id, error: null };
}

export async function updateSalesLeadStage(id: string, stage: SalesLeadStage): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("sales_leads").update({ stage }).eq("id", id);
  if (error) { logErr("updateSalesLeadStage", error); return { error: "Verplaatsen is niet gelukt." }; }
  return { error: null };
}

export async function updateSalesLead(id: string, patch: Partial<SalesLeadInput>): Promise<{ error: string | null }> {
  const supabase = createClient();
  const updates: Record<string, unknown> = {};
  if (patch.companyName !== undefined) updates.company_name = patch.companyName.trim();
  if (patch.contactName !== undefined) updates.contact_name = patch.contactName?.trim() || null;
  if (patch.contactEmail !== undefined) updates.contact_email = patch.contactEmail?.trim() || null;
  if (patch.contactPhone !== undefined) updates.contact_phone = patch.contactPhone?.trim() || null;
  if (patch.stage !== undefined) updates.stage = patch.stage;
  if (patch.estimatedValue !== undefined) updates.estimated_value = patch.estimatedValue;
  if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;
  if (patch.lastContactDate !== undefined) updates.last_contact_date = patch.lastContactDate || null;
  if (patch.nextActionDate !== undefined) updates.next_action_date = patch.nextActionDate || null;

  const { error } = await supabase.from("sales_leads").update(updates).eq("id", id);
  if (error) { logErr("updateSalesLead", error); return { error: "Bijwerken is niet gelukt." }; }
  return { error: null };
}

export async function deleteSalesLead(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("sales_leads").delete().eq("id", id);
  if (error) { logErr("deleteSalesLead", error); return { error: "Verwijderen is niet gelukt." }; }
  return { error: null };
}

const OPEN_STAGES = ["nieuw", "contact_gelegd", "demo_gepland", "onderhandeling"] as const;

/** Pure helper, hergebruikt door zowel de Pijplijn-pagina als het dashboard-widgetje. */
export function summarizeSalesLeads(leads: SalesLead[]): {
  openCount: number;
  openByStage: Record<(typeof OPEN_STAGES)[number], number>;
  totalEstimatedValueOpen: number;
} {
  const openByStage = { nieuw: 0, contact_gelegd: 0, demo_gepland: 0, onderhandeling: 0 };
  let totalEstimatedValueOpen = 0;
  let openCount = 0;
  for (const lead of leads) {
    if ((OPEN_STAGES as readonly string[]).includes(lead.stage)) {
      openByStage[lead.stage as (typeof OPEN_STAGES)[number]] += 1;
      totalEstimatedValueOpen += lead.estimatedValue ?? 0;
      openCount += 1;
    }
  }
  return { openCount, openByStage, totalEstimatedValueOpen };
}
