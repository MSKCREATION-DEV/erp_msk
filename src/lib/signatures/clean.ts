import sharp from "sharp";

/** Suffixe Storage — bump = force re-nettoyage des anciennes versions. */
export const SIGNATURE_CLEAN_SUFFIX = "_cleaned_v2.png";

/**
 * Nettoyage signature / cachet → PNG fond transparent.
 *
 * Conçu pour photos/scans (papier gris, crème, ombres légères) :
 * 1. Estime la couleur papier (médiane bordure)
 * 2. Alpha soft = écart au papier (luminance + Distance RGB)
 * 3. Préserve encre bleue / rouge
 * 4. Recadrage + ink un peu renforcé pour le PDF
 */
export async function cleanSignatureImage(
  input: Buffer,
  opts?: { maxEdge?: number },
): Promise<Buffer> {
  const maxEdge = opts?.maxEdge ?? 1600;

  const { data, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .ensureAlpha()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels < 4) {
    throw new Error("Image alpha manquante après ensureAlpha");
  }

  const paper = sampleBorderPaper(data, width, height);
  // Seuil relatif : tout ce qui est proche du papier disparaît
  const killDist = 22; // RGB moyen vs papier
  const softDist = 72;
  const killDark = 14; // papierLum - lum
  const softDark = 70;

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    let r = out[i]!;
    let g = out[i + 1]!;
    let b = out[i + 2]!;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);

    const isBlueInk = b > r + 15 && b > g + 10 && chroma > 18;
    const isRedInk = r > g + 18 && r > b + 18 && chroma > 22;
    const coloredInk = isBlueInk || isRedInk;

    const dist =
      (Math.abs(r - paper.r) + Math.abs(g - paper.g) + Math.abs(b - paper.b)) /
      3;
    const darkness = paper.lum - lum;

    let alpha: number;
    if (coloredInk) {
      alpha = 255;
    } else if (darkness < killDark && dist < killDist) {
      alpha = 0;
    } else if (darkness >= softDark || dist >= softDist) {
      alpha = 255;
    } else {
      // Soft : max des deux critères (ombre vs teinte)
      const aDark =
        darkness <= killDark
          ? 0
          : Math.round(
              255 * ((darkness - killDark) / (softDark - killDark)),
            );
      const aDist =
        dist <= killDist
          ? 0
          : Math.round(255 * ((dist - killDist) / (softDist - killDist)));
      alpha = Math.max(0, Math.min(255, Math.max(aDark, aDist)));
    }

    // Zones quasi-papier (texture scan) même un peu plus sombres
    if (
      !coloredInk &&
      darkness < 28 &&
      dist < 32 &&
      chroma < 14 &&
      alpha < 110
    ) {
      alpha = 0;
    }

    // Très clair = jamais d’encre
    if (!coloredInk && lum > paper.lum - 6) {
      alpha = 0;
    }

    out[i + 3] = alpha;

    if (alpha > 40) {
      // Sur fond transparent, on assombrit le trait (évite halo gris)
      const t = alpha / 255;
      const inkR = coloredInk && isBlueInk ? Math.min(r, 40) : Math.min(r, 28);
      const inkG = coloredInk && isBlueInk ? Math.min(g, 55) : Math.min(g, 28);
      const inkB = coloredInk && isBlueInk ? Math.min(b, 140) : Math.min(b, 32);
      out[i] = Math.round(r * (1 - t) + inkR * t);
      out[i + 1] = Math.round(g * (1 - t) + inkG * t);
      out[i + 2] = Math.round(b * (1 - t) + inkB * t);
      // Alpha un peu plus franc pour le PDF
      if (alpha > 90) out[i + 3] = 255;
      else if (alpha > 40) out[i + 3] = Math.min(255, Math.round(alpha * 1.35));
    }
  }

  try {
    return await sharp(out, {
      raw: { width, height, channels: 4 },
    })
      .png({ compressionLevel: 9 })
      .trim({ threshold: 12, lineArt: true })
      .toBuffer();
  } catch {
    return sharp(out, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }
}

function sampleBorderPaper(
  data: Buffer,
  width: number,
  height: number,
): { r: number; g: number; b: number; lum: number } {
  const samples: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    samples.push(data[i]!, data[i + 1]!, data[i + 2]!);
  };

  const stepX = Math.max(1, Math.floor(width / 40));
  const stepY = Math.max(1, Math.floor(height / 40));
  for (let x = 0; x < width; x += stepX) {
    push(x, 1);
    push(x, 2);
    push(x, height - 2);
    push(x, height - 3);
  }
  for (let y = 0; y < height; y += stepY) {
    push(1, y);
    push(2, y);
    push(width - 2, y);
    push(width - 3, y);
  }

  if (samples.length < 9) {
    return { r: 240, g: 240, b: 238, lum: 240 };
  }

  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let i = 0; i < samples.length; i += 3) {
    rs.push(samples[i]!);
    gs.push(samples[i + 1]!);
    bs.push(samples[i + 2]!);
  }
  const r = median(rs);
  const g = median(gs);
  const b = median(bs);
  return { r, g, b, lum: 0.299 * r + 0.587 * g + 0.114 * b };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}
