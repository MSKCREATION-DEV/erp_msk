import { createHash } from "crypto";
import { DocStatus } from "@/generated/prisma/client";
import { uploadGedObject, removeGedObject } from "@/lib/ged/storage";
import { ensureCollaboratorSubfolder } from "@/lib/ged/tree";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UpsertAvatarInput = {
  employeeId: string;
  firstName: string;
  lastName: string;
  actorUserId: string;
  bytes: Uint8Array;
  mime: string;
};

/**
 * Écrit / remplace la photo profil GED + `RhEmployee.avatarDocumentId`.
 * Source de vérité unique pour sidebar, espace, organigramme, admin.
 */
export async function upsertEmployeeAvatar(
  input: UpsertAvatarInput,
): Promise<{ documentId: string }> {
  if (!ALLOWED.has(input.mime)) {
    throw new Error("Formats acceptés : JPEG, PNG, WebP");
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, avatarDocumentId: true },
  });
  if (!employee) throw new Error("Fiche RH introuvable");

  const ext =
    input.mime === "image/png"
      ? "png"
      : input.mime === "image/webp"
        ? "webp"
        : "jpg";
  const folder = await ensureCollaboratorSubfolder(
    input.firstName,
    input.lastName,
    "01_IDENTITE_ADMIN",
    new Date().getFullYear(),
    input.actorUserId,
  );
  const storageFile = `avatar-${employee.id}.${ext}`;
  const displayName = `Photo de profil.${ext}`;
  const storagePath = `${folder.path.replace(/^\//, "")}/${storageFile}`;
  await uploadGedObject(storagePath, input.bytes, input.mime, {
    upsert: true,
  });
  const checksum = createHash("sha256").update(input.bytes).digest("hex");

  const oldId = employee.avatarDocumentId;
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: displayName,
      mime: input.mime,
      size: input.bytes.byteLength,
      checksum,
      status: DocStatus.ACTIVE,
      createdById: input.actorUserId,
    },
  });

  await prisma.rhEmployee.update({
    where: { id: employee.id },
    data: { avatarDocumentId: doc.id },
  });

  if (oldId && oldId !== doc.id) {
    const old = await prisma.document.findUnique({
      where: { id: oldId },
      select: { storagePath: true },
    });
    await prisma.document.update({
      where: { id: oldId },
      data: { status: DocStatus.ARCHIVED, softDeletedAt: new Date() },
    });
    if (old?.storagePath && old.storagePath !== storagePath) {
      try {
        await removeGedObject(old.storagePath);
      } catch {
        /* ignore */
      }
    }
  }

  return { documentId: doc.id };
}
