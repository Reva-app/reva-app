import { createClient } from "@/lib/supabaseClient";

const PHOTOS_BUCKET = "dossier-photos";
const DOCS_BUCKET   = "dossier-documents";

// Signed URLs are short-lived on purpose — the underlying files are private.
// A fresh one is generated every time the app loads dossier data.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Normalizes a stored value (which may be a bare storage path, a legacy public
 * URL from before the buckets were made private, or a signed URL) down to the
 * bare path within the bucket. This is what should ever be persisted to the DB.
 */
export function pathFromStorageValue(bucket: string, value: string): string {
  const publicMarker = `/object/public/${bucket}/`;
  const signMarker    = `/object/sign/${bucket}/`;

  for (const marker of [publicMarker, signMarker]) {
    const idx = value.indexOf(marker);
    if (idx !== -1) {
      const rest = value.slice(idx + marker.length);
      return rest.split("?")[0]; // strip any ?token=... query string
    }
  }

  // Already a bare path (new uploads store this directly).
  return value.split("?")[0];
}

// ─── Signed URL resolution (read side) ─────────────────────────────────────────

/** Resolves one stored value (path or legacy URL) to a fresh, working signed URL. */
export async function resolveSignedUrl(
  bucket: "dossier-photos" | "dossier-documents" | "protocol-media",
  storedValue: string
): Promise<string | null> {
  const supabase = createClient();
  const path = pathFromStorageValue(bucket, storedValue);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("[resolveSignedUrl] error:", error.message);
    return null;
  }
  return data.signedUrl;
}

/** Resolves many stored values in one batch call (used when loading a list). */
export async function resolveSignedUrls(
  bucket: "dossier-photos" | "dossier-documents" | "protocol-media",
  storedValues: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (storedValues.length === 0) return result;

  const supabase = createClient();
  const paths = storedValues.map((v) => pathFromStorageValue(bucket, v));

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("[resolveSignedUrls] error:", error.message);
    return result;
  }

  data.forEach((entry, i) => {
    if (entry.signedUrl) result.set(storedValues[i], entry.signedUrl);
  });
  return result;
}

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

  // Return a signed URL for immediate on-screen use. Only the bare `path`
  // (extracted from it at the DB-write boundary) is ever persisted.
  const url = await resolveSignedUrl(PHOTOS_BUCKET, path);
  return { url, error: null };
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

  const url = await resolveSignedUrl(DOCS_BUCKET, path);
  return { url, name: file.name, error: null };
}

// ─── Delete helpers ───────────────────────────────────────────────────────────

export async function deleteStorageFile(bucket: "dossier-photos" | "dossier-documents", storedValue: string): Promise<void> {
  const supabase = createClient();
  const path = pathFromStorageValue(bucket, storedValue);
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.error("[deleteStorageFile] error:", error.message);
  else console.info("[deleteStorageFile] deleted:", path);
}
