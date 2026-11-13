import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BrandLogo } from "@/generated/prisma/client";
import { downloadGedObject } from "@/lib/ged/storage";

export type LogoBytesResult = {
  bytes: Buffer;
  mime: string;
  source: "optimized" | "original" | "public";
  logoId: string | null;
  label: string;
};

const FALLBACK_PUBLIC = "/brand/lockup.png";

async function readPublicBrand(publicPath: string): Promise<Buffer> {
  const rel = publicPath.replace(/^\//, "");
  return readFile(path.join(process.cwd(), "public", rel));
}

/**
 * Résout les octets d’un logo pour PDF / download.
 * Préfère PNG optimisé Storage, puis original, puis fichier public.
 */
export async function resolveLogoBytes(
  logo: Pick<
    BrandLogo,
    | "id"
    | "label"
    | "mime"
    | "publicPath"
    | "storageOriginal"
    | "storageOptimized"
  >,
  prefer: "optimized" | "original" = "optimized",
): Promise<LogoBytesResult> {
  if (prefer === "optimized" && logo.storageOptimized) {
    try {
      const bytes = await downloadGedObject(logo.storageOptimized);
      return {
        bytes,
        mime: "image/png",
        source: "optimized",
        logoId: logo.id,
        label: logo.label,
      };
    } catch {
      /* fallback */
    }
  }

  if (logo.storageOriginal) {
    try {
      const bytes = await downloadGedObject(logo.storageOriginal);
      return {
        bytes,
        mime: logo.mime,
        source: "original",
        logoId: logo.id,
        label: logo.label,
      };
    } catch {
      /* fallback */
    }
  }

  if (logo.publicPath) {
    const bytes = await readPublicBrand(logo.publicPath);
    return {
      bytes,
      mime: logo.mime,
      source: "public",
      logoId: logo.id,
      label: logo.label,
    };
  }

  throw new Error(`Logo « ${logo.label} » sans fichier accessible`);
}

export async function resolveFallbackLockupBytes(): Promise<LogoBytesResult> {
  const bytes = await readPublicBrand(FALLBACK_PUBLIC);
  return {
    bytes,
    mime: "image/png",
    source: "public",
    logoId: null,
    label: "Lockup MSK (fichier public)",
  };
}
