import { createClient } from "@/lib/supabaseClient";

const PHOTOS_BUCKET = "dossier-photos";
const DOCS_BUCKET   = "dossier-documents";

// ─── Photo upload ─────────────────────────────────────────────────────────────

export async function uploadPhoto(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error("[uploadPhoto] Storage error:", error.message);
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  console.info("[uploadPhoto] uploaded OK:", data.publicUrl);
  return { url: data.publicUrl, error: null };
}

// ─── Document upload ──────────────────────────────────────────────────────────

export async function uploadDocument(
  userId: string,
  file: File
): Promise<{ url: string | null; name: string; error: string | null }> {
  const supabase = createClient();
  // Sanitize filename to avoid path issues
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error("[uploadDocument] Storage error:", error.message);
    return { url: null, name: file.name, error: error.message };
  }

  const { data } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(path);
  console.info("[uploadDocument] uploaded OK:", data.publicUrl);
  return { url: data.publicUrl, name: file.name, error: null };
}

// ─── Delete helpers ───────────────────────────────────────────────────────────

export async function deleteStorageFile(bucket: "dossier-photos" | "dossier-documents", url: string): Promise<void> {
  const supabase = createClient();
  // Extract path from public URL: everything after /storage/v1/object/public/<bucket>/
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error("[deleteStorageFile] error:", error.message);
  else console.info("[deleteStorageFile] deleted:", path);
}
