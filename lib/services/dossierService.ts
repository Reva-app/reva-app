import { createClient } from "@/lib/supabaseClient";
import {
  dbToDossierDocument, dossierDocumentToDb,
  dbToFotoUpdate, fotoUpdateToDb,
  dbToContactpersoon, contactpersoonToDb,
} from "@/lib/db/mappers";
import type { DossierDocument, FotoUpdate, Contactpersoon } from "@/lib/data";

function logErr(fn: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(
    `[${fn}] Supabase error — message: "${error.message}" | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function loadDossierDocumenten(userId: string): Promise<DossierDocument[]> {
  const supabase = createClient();
  console.info("[loadDossierDocumenten] uid:", userId);
  const { data, error } = await supabase
    .from("dossier_documents")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { logErr("loadDossierDocumenten", error); return []; }
  console.info("[loadDossierDocumenten] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToDossierDocument);
}

export async function insertDossierDocument(d: DossierDocument, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = dossierDocumentToDb(d, userId);
  console.info("[insertDossierDocument] uid:", userId, "id:", d.id, "title:", d.title, "payload:", payload);

  const { data, error } = await supabase
    .from("dossier_documents")
    .insert(payload)
    .select();

  if (error) { logErr("insertDossierDocument", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "insertDossierDocument: 0 rows returned";
    console.error("[insertDossierDocument]", msg, "— uid:", userId, "id:", d.id);
    return { error: msg };
  }
  console.info("[insertDossierDocument] saved OK, rows:", data.length);
  return { error: null };
}

export async function updateDossierDocumentRecord(d: DossierDocument, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { id: _id, user_id: _uid, ...fields } = dossierDocumentToDb(d, userId);
  console.info("[updateDossierDocumentRecord] uid:", userId, "id:", d.id, "title:", d.title, "fields:", fields);

  const { data, error } = await supabase
    .from("dossier_documents")
    .update(fields)
    .eq("id", d.id)
    .eq("user_id", userId)
    .select();

  if (error) { logErr("updateDossierDocumentRecord", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "updateDossierDocumentRecord: geen rij gevonden";
    console.error("[updateDossierDocumentRecord]", msg, "— uid:", userId, "id:", d.id);
    return { error: msg };
  }
  console.info("[updateDossierDocumentRecord] saved OK, rows:", data.length);
  return { error: null };
}

export async function upsertDossierDocument(d: DossierDocument, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = dossierDocumentToDb(d, userId);
  console.info("[upsertDossierDocument/migration] uid:", userId, "id:", d.id, "payload:", payload);

  const { data, error } = await supabase
    .from("dossier_documents")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) { logErr("upsertDossierDocument", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const insertResult = await insertDossierDocument(d, userId);
    if (insertResult.error) return updateDossierDocumentRecord(d, userId);
    return insertResult;
  }
  console.info("[upsertDossierDocument/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteDossierDocument(id: string): Promise<void> {
  const supabase = createClient();
  console.info("[deleteDossierDocument] id:", id);
  const { error } = await supabase.from("dossier_documents").delete().eq("id", id);
  if (error) logErr("deleteDossierDocument", error);
  else console.info("[deleteDossierDocument] deleted OK, id:", id);
}

// ─── Photo updates ────────────────────────────────────────────────────────────

export async function loadFotoUpdates(userId: string): Promise<FotoUpdate[]> {
  const supabase = createClient();
  console.info("[loadFotoUpdates] uid:", userId);
  const { data, error } = await supabase
    .from("dossier_photo_updates")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) { logErr("loadFotoUpdates", error); return []; }
  console.info("[loadFotoUpdates] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToFotoUpdate);
}

export async function insertFotoUpdate(f: FotoUpdate, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = fotoUpdateToDb(f, userId);
  console.info("[insertFotoUpdate] uid:", userId, "id:", f.id, "date:", f.date, "payload:", payload);

  const { data, error } = await supabase
    .from("dossier_photo_updates")
    .insert(payload)
    .select();

  if (error) { logErr("insertFotoUpdate", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "insertFotoUpdate: 0 rows returned";
    console.error("[insertFotoUpdate]", msg, "— uid:", userId, "id:", f.id);
    return { error: msg };
  }
  console.info("[insertFotoUpdate] saved OK, rows:", data.length);
  return { error: null };
}

export async function upsertFotoUpdate(f: FotoUpdate, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = fotoUpdateToDb(f, userId);
  console.info("[upsertFotoUpdate/migration] uid:", userId, "id:", f.id, "payload:", payload);

  const { data, error } = await supabase
    .from("dossier_photo_updates")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) { logErr("upsertFotoUpdate", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    return insertFotoUpdate(f, userId);
  }
  console.info("[upsertFotoUpdate/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteFotoUpdate(id: string): Promise<void> {
  const supabase = createClient();
  console.info("[deleteFotoUpdate] id:", id);
  const { error } = await supabase.from("dossier_photo_updates").delete().eq("id", id);
  if (error) logErr("deleteFotoUpdate", error);
  else console.info("[deleteFotoUpdate] deleted OK, id:", id);
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function loadContactpersonen(userId: string): Promise<Contactpersoon[]> {
  const supabase = createClient();
  console.info("[loadContactpersonen] uid:", userId);
  const { data, error } = await supabase
    .from("dossier_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) { logErr("loadContactpersonen", error); return []; }
  console.info("[loadContactpersonen] loaded", data?.length ?? 0, "rows for uid:", userId);
  return (data ?? []).map(dbToContactpersoon);
}

export async function insertContactpersoon(c: Contactpersoon, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = contactpersoonToDb(c, userId);
  console.info("[insertContactpersoon] uid:", userId, "id:", c.id, "naam:", c.naam, "payload:", payload);

  const { data, error } = await supabase
    .from("dossier_contacts")
    .insert(payload)
    .select();

  if (error) { logErr("insertContactpersoon", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "insertContactpersoon: 0 rows returned";
    console.error("[insertContactpersoon]", msg, "— uid:", userId, "id:", c.id);
    return { error: msg };
  }
  console.info("[insertContactpersoon] saved OK, rows:", data.length);
  return { error: null };
}

export async function updateContactpersoonRecord(c: Contactpersoon, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { id: _id, user_id: _uid, ...fields } = contactpersoonToDb(c, userId);
  console.info("[updateContactpersoonRecord] uid:", userId, "id:", c.id, "naam:", c.naam, "fields:", fields);

  const { data, error } = await supabase
    .from("dossier_contacts")
    .update(fields)
    .eq("id", c.id)
    .eq("user_id", userId)
    .select();

  if (error) { logErr("updateContactpersoonRecord", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const msg = "updateContactpersoonRecord: geen rij gevonden";
    console.error("[updateContactpersoonRecord]", msg, "— uid:", userId, "id:", c.id);
    return { error: msg };
  }
  console.info("[updateContactpersoonRecord] saved OK, rows:", data.length);
  return { error: null };
}

export async function upsertContactpersoon(c: Contactpersoon, userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const payload = contactpersoonToDb(c, userId);
  console.info("[upsertContactpersoon/migration] uid:", userId, "id:", c.id, "payload:", payload);

  const { data, error } = await supabase
    .from("dossier_contacts")
    .upsert(payload, { onConflict: "id" })
    .select();

  if (error) { logErr("upsertContactpersoon", error); return { error: error.message }; }
  if (!data || data.length === 0) {
    const insertResult = await insertContactpersoon(c, userId);
    if (insertResult.error) return updateContactpersoonRecord(c, userId);
    return insertResult;
  }
  console.info("[upsertContactpersoon/migration] saved OK, rows:", data.length);
  return { error: null };
}

export async function deleteContactpersoon(id: string): Promise<void> {
  const supabase = createClient();
  console.info("[deleteContactpersoon] id:", id);
  const { error } = await supabase.from("dossier_contacts").delete().eq("id", id);
  if (error) logErr("deleteContactpersoon", error);
  else console.info("[deleteContactpersoon] deleted OK, id:", id);
}
