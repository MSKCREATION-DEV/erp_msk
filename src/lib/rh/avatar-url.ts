import "server-only";

import { DocStatus } from "@/generated/prisma/client";
import { mapSeries } from "@/lib/db/serial";
import { signedGedUrl } from "@/lib/ged/storage";
import { prisma } from "@/lib/prisma";
import { coalescePhotoSrc } from "@/lib/rh/avatar-display";

export { coalescePhotoSrc };

export async function signedAvatarUrlFromDocumentId(
  documentId: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!documentId) return null;
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { storagePath: true, status: true, softDeletedAt: true },
  });
  if (
    !doc?.storagePath ||
    doc.status !== DocStatus.ACTIVE ||
    doc.softDeletedAt
  ) {
    return null;
  }
  try {
    return await signedGedUrl(doc.storagePath, expiresIn);
  } catch {
    return null;
  }
}

/** Avatar du collab lié au compte (sidebar, espace, admin). */
export async function resolveAvatarUrlForUserId(
  userId: string,
  expiresIn = 3600,
): Promise<string | null> {
  const emp = await prisma.rhEmployee.findUnique({
    where: { userId },
    select: { avatarDocumentId: true },
  });
  return signedAvatarUrlFromDocumentId(emp?.avatarDocumentId, expiresIn);
}

type OrgAvatarSource = {
  userId: string | null;
  photoPath: string | null;
  avatarDocumentId: string | null;
};

/**
 * Résout les `src` photo pour l’organigramme (GED → fallback static).
 * Séquentiel (pool Prisma max=1).
 */
export async function resolveOrgPhotoSrcs(
  nodes: OrgAvatarSource[],
  expiresIn = 3600,
): Promise<string[]> {
  const docIds = [
    ...new Set(
      nodes
        .map((n) => n.avatarDocumentId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const docs =
    docIds.length === 0
      ? []
      : await prisma.document.findMany({
          where: {
            id: { in: docIds },
            status: DocStatus.ACTIVE,
            softDeletedAt: null,
          },
          select: { id: true, storagePath: true },
        });

  const pathByDocId = new Map(
    docs
      .filter((d) => Boolean(d.storagePath))
      .map((d) => [d.id, d.storagePath!] as const),
  );

  const uniquePaths = [...new Set([...pathByDocId.values()])];
  const signedByPath = new Map<string, string>();
  await mapSeries(uniquePaths, async (storagePath) => {
    try {
      signedByPath.set(storagePath, await signedGedUrl(storagePath, expiresIn));
    } catch {
      /* fallback static plus bas */
    }
  });

  const signedByDocId = new Map<string, string>();
  for (const [docId, path] of pathByDocId) {
    const url = signedByPath.get(path);
    if (url) signedByDocId.set(docId, url);
  }

  return nodes.map((n) =>
    coalescePhotoSrc(
      n.avatarDocumentId
        ? (signedByDocId.get(n.avatarDocumentId) ?? null)
        : null,
      n.photoPath,
    ) ?? "",
  );
}
