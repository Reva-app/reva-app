import { createClient } from "@/lib/supabaseClient";
import {
  dbToDossierDocument, dossierDocumentToDb,
  dbToFotoUpdate, fotoUpdateToDb,
  dbToContactpersoon, contactpersoonToDb,
} from "@/lib/db/mappers";
import type { DossierDocument, FotoUpdate, Contactpersoon } from "@/lib/data";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function loadDossierDocumenten(userId: string): Promise<DossierDocument[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dossier_documents")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { logErr("loadDossierDocumenten", error); return []; }
  return (data ?? []).map(dbToDossierDocument);
}

export async function upsertDossierDocument(d: DossierDocument, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("dossier_documents")
    .upsert(dossierDocumentToDb(d, userId), { onConflict: "id" });
  if (error) logErr("upsertDossierDocument", error);
}

export async function deleteDossierDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("dossier_documents").delete().eq("id", id);
  if (error) logErr("deleteDossierDocument", error);
}

// ─── Photo updates ────────────────────────────────────────────────────────────

export async function loadFotoUpdates(userId: string): Promise<FotoUpdate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dossier_photo_updates")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { logErr("loadFotoUpdates", error); return []; }
  return (data ?? []).map(dbToFotoUpdate);
}

export async function upsertFotoUpdate(f: FotoUpdate, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("dossier_photo_updates")
    .upsert(fotoUpdateToDb(f, userId), { onConflict: "id" });
  if (error) logErr("upsertFotoUpdate", error);
}

export async function deleteFotoUpdate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("dossier_photo_updates").delete().eq("id", id);
  if (error) logErr("deleteFotoUpdate", error);
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function loadContactpersonen(userId: string): Promise<Contactpersoon[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dossier_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) { logErr("loadContactpersonen", error); return []; }
  return (data ?? []).map(dbToContactpersoon);
}

export async function upsertContactpersoon(c: Contactpersoon, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("dossier_contacts")
    .upsert(contactpersoonToDb(c, userId), { onConflict: "id" });
  if (error) logErr("upsertContactpersoon", error);
}

export async function deleteContactpersoon(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("dossier_contacts").delete().eq("id", id);
  if (error) logErr("deleteContactpersoon", error);
}
