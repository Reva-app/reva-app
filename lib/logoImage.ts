/**
 * Zet een geüpload praktijklogo in de browser om naar een nette PNG:
 *   - altijd PNG (ook SVG/JPEG/WebP) — nodig voor e-mail (geen SVG-steun) en
 *     voor /api/org-logo, dat om veiligheidsredenen alleen PNG serveert;
 *   - verkleind tot maximaal 600×240 px (nooit vergroot), verhouding intact;
 *   - transparantie blijft behouden.
 */

const MAX_WIDTH = 600;
const MAX_HEIGHT = 240;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export async function normalizeLogo(file: File): Promise<{ blob: Blob | null; error: string | null }> {
  if (!LOGO_ACCEPT.split(",").includes(file.type)) {
    return { blob: null, error: "Kies een PNG-, JPG-, WebP- of SVG-bestand." };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return { blob: null, error: "Dit bestand is te groot (maximaal 5 MB)." };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("load"));
      el.src = url;
    });

    // SVG's zonder width/height-attribuut melden soms 0×0.
    const naturalWidth = img.naturalWidth || 600;
    const naturalHeight = img.naturalHeight || 240;
    const scale = Math.min(1, MAX_WIDTH / naturalWidth, MAX_HEIGHT / naturalHeight);
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: null, error: "Je browser kon het logo niet verwerken." };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? { blob, error: null } : { blob: null, error: "Je browser kon het logo niet verwerken." };
  } catch {
    return { blob: null, error: "Dit bestand kon niet als afbeelding worden gelezen." };
  } finally {
    URL.revokeObjectURL(url);
  }
}
