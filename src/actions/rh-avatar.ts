"use server";

import { revalidatePath } from "next/cache";
import { DocStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";
import { removeGedObject } from "@/lib/ged/storage";
import { upsertEmployeeAvatar } from "@/lib/rh/upsert-avatar";

/** Après compression client (~700 Ko) ; garde-fou serveur. */
const MAX_BYTES = 1.5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function revalidateAvatar(employeeId: string) {
  revalidatePath("/espace");
  revalidatePath("/espace/profil");
  revalidatePath("/organisation");
  revalidatePath(`/rh/collaborateurs/${employeeId}`);
  revalidatePath("/accueil");
}

/**
 * Photo profil — immédiat, sans validation RH.
 * Source unique GED → sidebar, espace, organigramme, admin.
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
  const { documentId } = await upsertEmployeeAvatar({
    employeeId: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    actorUserId: user.id,
    bytes,
    mime: file.type,
  });

  await writeAudit({
    actorId: user.id,
    action: "rh.avatar.upload",
    entityType: "RhEmployee",
    entityId: employee.id,
    metadata: { documentId },
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
