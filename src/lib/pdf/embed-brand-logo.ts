import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PDFDocument, PDFImage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getBrandConfigForDocument } from "@/lib/brand/config";
import {
  resolveFallbackLockupBytes,
  resolveLogoBytes,
} from "@/lib/brand/logo-bytes";

export type EmbedBrandLogoOptions = {
  /**
   * Id `BrandLogo` Charte. Doit être ACTIVE — sinon fallback logo documents
   * (jamais un asset inventé hors Charte).
   */
  logoId?: string | null;
};

async function embedBytes(
  pdf: PDFDocument,
  bytes: Buffer,
  mime: string,
): Promise<PDFImage | null> {
  if (mime === "image/png" || bytes[0] === 0x89) {
    return pdf.embedPng(bytes);
  }
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return pdf.embedJpg(bytes);
  }
  return null;
}

/**
 * Embed le logo documents depuis la Charte.
 * - `logoId` ACTIVE → ce logo
 * - sinon → défaut Charte / fallback `public/brand/lockup.png`
 * Ne modifie pas les PDF déjà générés — utilisé uniquement à la génération.
 */
export async function embedBrandLogo(
  pdf: PDFDocument,
  opts?: EmbedBrandLogoOptions,
): Promise<PDFImage | null> {
  const requestedId = opts?.logoId?.trim() || null;

  if (requestedId) {
    const logo = await prisma.brandLogo.findFirst({
      where: { id: requestedId, status: "ACTIVE" },
    });
    if (logo) {
      try {
        const resolved = await resolveLogoBytes(logo, "optimized");
        const embedded = await embedBytes(pdf, resolved.bytes, resolved.mime);
        if (embedded) return embedded;
      } catch {
        /* fallback default */
      }
    }
    // Id inconnu / inactif / non embedable → défaut Charte (pas d’erreur silencieuse d’asset fantôme)
  }

  try {
    const cfg = await getBrandConfigForDocument();
    const embedded = await embedBytes(pdf, cfg.logo.bytes, cfg.logo.mime);
    if (embedded) return embedded;
  } catch {
    /* fallback fichier */
  }

  try {
    const fallback = await resolveFallbackLockupBytes();
    return embedBytes(pdf, fallback.bytes, fallback.mime);
  } catch {
    try {
      const logoPath = path.join(process.cwd(), "public/brand/lockup.png");
      const bytes = await readFile(logoPath);
      return pdf.embedPng(bytes);
    } catch {
      return null;
    }
  }
}
