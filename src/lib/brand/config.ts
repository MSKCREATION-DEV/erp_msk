import { prisma } from "@/lib/prisma";
import { colors as staticColors } from "@/lib/brand";
import {
  resolveFallbackLockupBytes,
  resolveLogoBytes,
  type LogoBytesResult,
} from "@/lib/brand/logo-bytes";
import { CSS_SYNC_TOKEN_KEYS } from "@/lib/brand/constants";
import { runSeries } from "@/lib/db/serial";

export type BrandColorSnapshot = {
  tokenKey: string;
  label: string;
  hex: string;
  category: string;
  isReference: boolean;
};

export type BrandConfigForDocument = {
  logo: LogoBytesResult;
  colors: {
    blue: string;
    ink: string;
    coral: string;
    chalk: string;
  };
  colorTokens: BrandColorSnapshot[];
  typography: {
    erpFamily: string | null;
    pdfFamily: string | null;
  };
  configId: string;
  logoIsPersistedDefault: boolean;
};

function pickHex(
  tokens: BrandColorSnapshot[],
  key: string,
  fallback: string,
): string {
  const hit = tokens.find((t) => t.tokenKey === key && t.hex);
  return hit?.hex ?? fallback;
}

/**
 * Config charte pour génération PDF / docs.
 * Ne rétroagit pas sur les PDF déjà générés (appel à la génération uniquement).
 */
export async function getBrandConfigForDocument(): Promise<BrandConfigForDocument> {
  const [config, activeColors, erpTypo, pdfTypo] = await runSeries([
    () =>
      prisma.brandConfiguration.findUnique({
        where: { id: "default" },
        include: { defaultDocumentsLogo: true },
      }),
    () =>
      prisma.brandColor.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ sortOrder: "asc" }, { tokenKey: "asc" }],
        select: {
          tokenKey: true,
          label: true,
          hex: true,
          category: true,
          isReference: true,
        },
      }),
    () =>
      prisma.brandTypography.findFirst({
        where: { status: "ACTIVE", isDefaultErp: true },
        select: { familyName: true },
      }),
    () =>
      prisma.brandTypography.findFirst({
        where: { status: "ACTIVE", isDefaultPdf: true },
        select: { familyName: true },
      }),
  ]);

  let logo: LogoBytesResult;
  let logoIsPersistedDefault = false;

  const defaultLogo =
    config?.defaultDocumentsLogo ??
    (await prisma.brandLogo.findFirst({
      where: { isDefaultDocuments: true, status: "ACTIVE" },
    }));

  if (defaultLogo && defaultLogo.status === "ACTIVE") {
    try {
      logo = await resolveLogoBytes(defaultLogo, "optimized");
      logoIsPersistedDefault = true;
    } catch {
      logo = await resolveFallbackLockupBytes();
    }
  } else {
    logo = await resolveFallbackLockupBytes();
  }

  const colorTokens = activeColors.map((c) => ({
    tokenKey: c.tokenKey,
    label: c.label,
    hex: c.hex,
    category: c.category,
    isReference: c.isReference,
  }));

  return {
    logo,
    colors: {
      blue: pickHex(colorTokens, "msk-blue", staticColors.blue),
      ink: pickHex(colorTokens, "msk-ink", staticColors.ink),
      coral: pickHex(colorTokens, "msk-coral", staticColors.coral),
      chalk: pickHex(colorTokens, "msk-chalk", staticColors.chalk),
    },
    colorTokens,
    typography: {
      erpFamily: erpTypo?.familyName ?? null,
      pdfFamily: pdfTypo?.familyName ?? null,
    },
    configId: config?.id ?? "default",
    logoIsPersistedDefault,
  };
}

/** Couleurs actives pour injection CSS runtime (tokens sync). */
export async function getActiveCssBrandTokens(): Promise<
  Record<string, string>
> {
  const rows = await prisma.brandColor.findMany({
    where: {
      status: "ACTIVE",
      tokenKey: { in: [...CSS_SYNC_TOKEN_KEYS] },
    },
    select: { tokenKey: true, hex: true },
  });
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[r.tokenKey] = r.hex;
  }
  return out;
}
