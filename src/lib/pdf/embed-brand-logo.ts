import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PDFDocument, PDFImage } from "pdf-lib";
import { getBrandConfigForDocument } from "@/lib/brand/config";

/**
 * Embed le logo documents depuis la config Charte (fallback public/brand/lockup.png).
 * Ne modifie pas les PDF déjà générés — utilisé uniquement à la génération.
 */
export async function embedBrandLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const cfg = await getBrandConfigForDocument();
    const { bytes, mime } = cfg.logo;
    if (mime === "image/png" || bytes[0] === 0x89) {
      return pdf.embedPng(bytes);
    }
    if (mime === "image/jpeg" || mime === "image/jpg") {
      return pdf.embedJpg(bytes);
    }
    // SVG / WebP non supportés nativement par pdf-lib → fallback fichier public
  } catch {
    /* fallback */
  }

  try {
    const logoPath = path.join(process.cwd(), "public/brand/lockup.png");
    const bytes = await readFile(logoPath);
    return pdf.embedPng(bytes);
  } catch {
    return null;
  }
}
