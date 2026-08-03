"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Trash2 } from "lucide-react";
import { resolveSignedUrl } from "@/lib/services/storageService";
import { uploadExerciseMedia } from "@/lib/services/protocolService";

/**
 * Grote, bewerkbare media-preview voor de oefening-detailpagina — bewust los
 * van ExerciseThumb (die blijft een kleine vaste-grootte alleen-lezen
 * thumbnail voor lijsten/kaarten elders). Persisteert meteen bij upload of
 * verwijderen (via onChange), niet pas bij een aparte "Opslaan"-klik.
 */
export function ExerciseMediaEditor({
  mediaPath, mediaType, organizationId, exerciseId, canEdit, onChange,
}: {
  mediaPath: string | null;
  mediaType: string | null;
  organizationId: string;
  exerciseId: string;
  canEdit: boolean;
  onChange: (mediaPath: string | null, mediaType: string | null) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mediaPath) return;
    let cancelled = false;
    resolveSignedUrl("protocol-media", mediaPath).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => { cancelled = true; };
  }, [mediaPath]);

  // mediaPath is de bron van waarheid — bij null (bv. na "Media verwijderen")
  // negeren we een eventueel nog aanwezige oude signed url in plaats van die
  // via een synchrone setState in het effect hierboven te resetten.
  const displayUrl = mediaPath ? url : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    const { mediaPath: newPath, mediaType: newType, error: uploadErr } = await uploadExerciseMedia(organizationId, exerciseId, file);
    setUploading(false);
    if (uploadErr) { setError(uploadErr); return; }
    onChange(newPath, newType);
  }

  return (
    <div>
      <div
        className="rounded-xl flex items-center justify-center overflow-hidden mb-3"
        style={{ height: 280, background: "#f8f7f4" }}
      >
        {displayUrl ? (
          mediaType === "video" ? (
            <video src={displayUrl} controls muted playsInline className="max-w-full max-h-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="max-w-full max-h-full object-contain" />
          )
        ) : (
          <Dumbbell size={40} className="text-gray-300" />
        )}
      </div>
      {error && <p className="text-xs mb-2" style={{ color: "#dc2626" }}>{error}</p>}
      {canEdit && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium cursor-pointer" style={{ color: "var(--brand-accent, #e8632a)" }}>
            {uploading ? "Uploaden…" : mediaPath ? "Media wijzigen" : "Media uploaden"}
            <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={handleFileChange} />
          </label>
          {mediaPath && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={12} /> Media verwijderen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
