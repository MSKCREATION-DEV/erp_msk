import sharp from "sharp";
import { SignatureStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  downloadGedObject,
  uploadGedObject,
} from "@/lib/ged/storage";
import {
  cleanSignatureImage,
  SIGNATURE_CLEAN_SUFFIX,
} from "@/lib/signatures/clean";

function isCurrentCleanPath(path: string | null | undefined): boolean {
  return Boolean(path?.endsWith(SIGNATURE_CLEAN_SUFFIX));
}

/**
 * Bytes PNG prêts pour PDF / aperçu.
 * Re-nettoie si pas encore de v2 (anciennes versions gardaient le fond gris).
 */
export async function getSignaturePngBytes(opts: {
  ownerUserId?: string;
  /** Force même si v2 déjà présente */
  forceReclean?: boolean;
}): Promise<{ bytes: Buffer; label: string } | null> {
  const row = await prisma.signatureAsset.findFirst({
    where: {
      status: SignatureStatus.ACTIVE,
      ...(opts.ownerUserId
        ? { ownerUserId: opts.ownerUserId }
        : { OR: [{ orgOwned: true }, { ownerUserId: { not: null } }] }),
    },
    orderBy: [{ orgOwned: "desc" }, { updatedAt: "desc" }],
  });
  if (!row) return null;

  if (
    !opts.forceReclean &&
    isCurrentCleanPath(row.storageCleaned) &&
    row.storageCleaned
  ) {
    try {
      const bytes = await downloadGedObject(row.storageCleaned);
      return { bytes, label: row.label };
    } catch {
      // re-clean
    }
  }

  const original = await downloadGedObject(row.storageOriginal);
  let cleaned: Buffer;
  try {
    cleaned = await cleanSignatureImage(original);
  } catch (e) {
    console.error("[signature] clean failed, PNG fallback", e);
    cleaned = await sharp(original, { failOn: "none" })
      .rotate()
      .png()
      .toBuffer();
  }

  const cleanedPath = `signatures/${row.ownerUserId ?? "org"}/${row.id}${SIGNATURE_CLEAN_SUFFIX}`;
  try {
    await uploadGedObject(cleanedPath, cleaned, "image/png", { upsert: true });
    await prisma.signatureAsset.update({
      where: { id: row.id },
      data: { storageCleaned: cleanedPath },
    });
  } catch (e) {
    console.error("[signature] persist cleaned failed", e);
  }

  return { bytes: cleaned, label: row.label };
}

/** Retraite toutes les signatures ACTIVE (admin / backfill). */
export async function recleanActiveSignatures(limit = 50): Promise<number> {
  const rows = await prisma.signatureAsset.findMany({
    where: {
      status: SignatureStatus.ACTIVE,
      OR: [
        { storageCleaned: null },
        { NOT: { storageCleaned: { endsWith: SIGNATURE_CLEAN_SUFFIX } } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  let n = 0;
  for (const row of rows) {
    try {
      const original = await downloadGedObject(row.storageOriginal);
      const cleaned = await cleanSignatureImage(original);
      const cleanedPath = `signatures/${row.ownerUserId ?? "org"}/${row.id}${SIGNATURE_CLEAN_SUFFIX}`;
      await uploadGedObject(cleanedPath, cleaned, "image/png", {
        upsert: true,
      });
      await prisma.signatureAsset.update({
        where: { id: row.id },
        data: { storageCleaned: cleanedPath },
      });
      n += 1;
    } catch (e) {
      console.error(`[signature] reclean ${row.id}`, e);
    }
  }
  return n;
}
