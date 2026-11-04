"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { DocStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { uploadGedObject, removeGedObject } from "@/lib/ged/storage";
import { ensureCollaboratorSubfolder } from "@/lib/ged/tree";

/** Après compression client (~700 Ko) ; garde-fou serveur. */
const MAX_BYTES = 1.5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function revalidateAvatar(employeeId: string) {
  revalidatePath("/espace");
  revalidatePath("/espace/profil");
  revalidatePath(`/rh/collaborateurs/${employeeId}`);
}

/**
 * Photo profil — immédiat, sans validation RH.
 */
export async function uploadAvatarAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "self.profile.edit")) {
    return { ok: false, error: "Permission refusée" };
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });
  if (!employee) return { ok: false, error: "Aucune fiche RH liée" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Sélectionnez une image" };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Formats acceptés : JPEG, PNG, WebP" };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: "Image trop lourde après compression — choisissez une autre photo",
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const folder = await ensureCollaboratorSubfolder(
    employee.firstName,
    employee.lastName,
    "01_IDENTITE_ADMIN",
    new Date().getFullYear(),
    user.id,
  );
  const storageFile = `avatar-${employee.id}.${ext}`;
  const displayName = `Photo de profil.${ext}`;
  const storagePath = `${folder.path.replace(/^\//, "")}/${storageFile}`;
  await uploadGedObject(storagePath, bytes, file.type, { upsert: true });
  const checksum = createHash("sha256").update(bytes).digest("hex");

  const oldId = employee.avatarDocumentId;
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: displayName,
      mime: file.type,
      size: bytes.byteLength,
      checksum,
      status: DocStatus.ACTIVE,
      createdById: user.id,
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

  await writeAudit({
    actorId: user.id,
    action: "rh.avatar.upload",
    entityType: "RhEmployee",
    entityId: employee.id,
    metadata: { documentId: doc.id },
  });

  revalidateAvatar(employee.id);
  return { ok: true, message: "Photo mise à jour" };
}

export async function removeAvatarAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "self.profile.edit")) {
    return { ok: false, error: "Permission refusée" };
  }
  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });
  if (!employee?.avatarDocumentId) {
    return { ok: false, error: "Aucune photo" };
  }

  const oldId = employee.avatarDocumentId;
  await prisma.rhEmployee.update({
    where: { id: employee.id },
    data: { avatarDocumentId: null },
  });
  const old = await prisma.document.findUnique({
    where: { id: oldId },
    select: { storagePath: true },
  });
  await prisma.document.update({
    where: { id: oldId },
    data: { status: DocStatus.ARCHIVED, softDeletedAt: new Date() },
  });
  if (old?.storagePath) {
    try {
      await removeGedObject(old.storagePath);
    } catch {
      /* ignore */
    }
  }

  await writeAudit({
    actorId: user.id,
    action: "rh.avatar.remove",
    entityType: "RhEmployee",
    entityId: employee.id,
  });

  revalidateAvatar(employee.id);
  return { ok: true, message: "Photo retirée" };
}
