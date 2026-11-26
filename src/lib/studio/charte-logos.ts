/**
 * Logos Charte autorisés pour les documents / Playground.
 * Un logo hors Charte ACTIVE ne peut pas être choisi.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { brandLogoPreviewUrl } from "@/lib/brand/preview-url";
import { mapSeries } from "@/lib/db/serial";
import type { CharteLogoOption } from "@/lib/studio/charte-logo-types";

export type { CharteLogoOption };

/** Liste les logos ACTIVE — seule source de vérité pour le picker document. */
export async function listActiveCharteLogos(): Promise<CharteLogoOption[]> {
  const logos = await prisma.brandLogo.findMany({
    where: { status: "ACTIVE" },
    orderBy: [
      { isDefaultDocuments: "desc" },
      { sortOrder: "asc" },
      { label: "asc" },
    ],
    select: {
      id: true,
      code: true,
      label: true,
      kind: true,
      isDefaultDocuments: true,
      storageOptimized: true,
      storageOriginal: true,
      publicPath: true,
    },
  });

  return mapSeries(logos, async (logo) => ({
    id: logo.id,
    code: logo.code,
    label: logo.label,
    kind: logo.kind,
    isDefaultDocuments: logo.isDefaultDocuments,
    previewUrl: await brandLogoPreviewUrl({
      storageOptimized: logo.storageOptimized,
      storageOriginal: logo.storageOriginal,
      publicPath: logo.publicPath,
    }),
  }));
}

/** Valide qu’un logoId est ACTIVE en Charte (sinon null = défaut). */
export async function assertActiveCharteLogoId(
  logoId: string | null | undefined,
): Promise<string | null> {
  if (!logoId) return null;
  const hit = await prisma.brandLogo.findFirst({
    where: { id: logoId, status: "ACTIVE" },
    select: { id: true },
  });
  return hit?.id ?? null;
}
