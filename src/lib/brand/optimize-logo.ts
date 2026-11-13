import sharp from "sharp";
import { isSvgMime, sanitizeSvg } from "@/lib/brand/svg-sanitize";

export type OptimizedLogo = {
  originalBytes: Buffer;
  optimizedPng: Buffer;
  mime: string;
  widthPx: number | null;
  heightPx: number | null;
};

/**
 * Prépare un logo : SVG sanitizé + PNG optimisé (PDF / aperçus).
 */
export async function prepareLogoBytes(
  bytes: Buffer,
  mime: string,
): Promise<OptimizedLogo> {
  let original = bytes;
  let workMime = mime;

  if (isSvgMime(mime)) {
    const sanitized = sanitizeSvg(bytes.toString("utf8"));
    original = Buffer.from(sanitized, "utf8");
    workMime = "image/svg+xml";
  }

  const pipeline = sharp(original, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const optimizedPng = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 8, palette: false })
    .toBuffer();

  return {
    originalBytes: original,
    optimizedPng,
    mime: workMime,
    widthPx: meta.width ?? null,
    heightPx: meta.height ?? null,
  };
}
