"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
} from "@/lib/ged/constants";
import { signedGedUrl, uploadGedObject } from "@/lib/ged/storage";
import {
  createChildFolder,
  deleteFolderSubtree,
  ensureYearTree,
  renameFolder,
} from "@/lib/ged/tree";
import { canViewFolderPath } from "@/lib/ged/scope";
import type { ActionResult } from "@/actions/auth";

const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Nom requis")
  .max(120, "Nom trop long")
  .refine((v) => !/[\\/]/.test(v), "Caractères / \\ interdits");

const createFolderSchema = z.object({
  parentId: z.string().min(1),
  name: folderNameSchema,
});

const renameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: folderNameSchema,
});

const deleteFolderSchema = z.object({
  folderId: z.string().min(1),
});

const uploadMeta = z.object({
  folderId: z.string().min(1),
  originalName: z.string().min(1).max(240),
  mime: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "ged.upload" });
  if (!hasPermission(actor, "ged.browse") && !hasPermission(actor, "ged.view_scoped")) {
    return { ok: false, error: "Permission GED insuffisante" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier manquant" };
  }

  const parsed = uploadMeta.safeParse({
    folderId: formData.get("folderId"),
    originalName: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Métadonnées invalides" };
  }

  if (!(ALLOWED_MIME as readonly string[]).includes(parsed.data.mime)) {
    return { ok: false, error: `Type non autorisé : ${parsed.data.mime}` };
  }

  const folder = await prisma.documentFolder.findUnique({
    where: { id: parsed.data.folderId },
  });
  if (!folder) return { ok: false, error: "Dossier introuvable" };
  if (!(await canViewFolderPath(actor, folder.path))) {
    return { ok: false, error: "Dossier hors de votre périmètre GED" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const safeName = parsed.data.originalName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const storagePath = `${folder.path.replace(/^\//, "")}/${Date.now()}_${safeName}`;

  try {
    await uploadGedObject(storagePath, bytes, parsed.data.mime);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec upload Storage",
    };
  }

  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: parsed.data.originalName,
      mime: parsed.data.mime,
      size: parsed.data.size,
      checksum,
      createdById: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "ged.upload",
    entityType: "document",
    entityId: doc.id,
    metadata: { name: doc.originalName, folderId: folder.id },
  });

  revalidatePath("/ged");
  return { ok: true, message: "Document déposé", documentId: doc.id };
}

export async function softDeleteDocumentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "ged.delete" });
  const id = String(formData.get("documentId") ?? "");
  if (!id) return { ok: false, error: "Document manquant" };

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { folder: { select: { path: true } } },
  });
  if (!doc) return { ok: false, error: "Document introuvable" };
  if (!(await canViewFolderPath(actor, doc.folder.path))) {
    return { ok: false, error: "Document hors de votre périmètre GED" };
  }

  await prisma.document.update({
    where: { id },
    data: { status: DocStatus.TRASH, softDeletedAt: new Date() },
  });

  await writeAudit({
    actorId: actor.id,
    action: "ged.soft_delete",
    entityType: "document",
    entityId: id,
  });

  revalidatePath("/ged");
  return { ok: true, message: "Document mis à la corbeille" };
}

export async function getDocumentDownloadUrlAction(
  documentId: string,
): Promise<ActionResult & { url?: string }> {
  const actor = await requireUser();
  if (
    !hasPermission(actor, "ged.browse") &&
    !hasPermission(actor, "ged.view_scoped")
  ) {
    return { ok: false, error: "Permission refusée" };
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { folder: { select: { path: true } } },
  });
  if (!doc || doc.status === DocStatus.TRASH) {
    return { ok: false, error: "Document introuvable" };
  }
  if (!(await canViewFolderPath(actor, doc.folder.path))) {
    return { ok: false, error: "Document hors de votre périmètre GED" };
  }

  try {
    const url = await signedGedUrl(doc.storagePath);
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "URL signée impossible",
    };
  }
}

export async function ensureGedYearAction(): Promise<ActionResult> {
  const actor = await requireUser({ permission: "ged.manage_folders" });
  await ensureYearTree(new Date().getFullYear(), actor.id);
  revalidatePath("/ged");
  return { ok: true, message: "Arborescence année prête" };
}

export async function createFolderAction(
  formData: FormData,
): Promise<ActionResult & { folderId?: string }> {
  const actor = await requireUser({ permission: "ged.manage_folders" });

  const parsed = createFolderSchema.safeParse({
    parentId: formData.get("parentId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  try {
    const folder = await createChildFolder({
      parentId: parsed.data.parentId,
      name: parsed.data.name,
      createdById: actor.id,
    });

    await writeAudit({
      actorId: actor.id,
      action: "ged.create_folder",
      entityType: "document_folder",
      entityId: folder.id,
      metadata: { name: folder.name, path: folder.path },
    });

    revalidatePath("/ged");
    return {
      ok: true,
      message: `Dossier « ${folder.name} » créé`,
      folderId: folder.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Création impossible",
    };
  }
}

export async function renameFolderAction(
  formData: FormData,
): Promise<ActionResult & { folderId?: string }> {
  const actor = await requireUser({ permission: "ged.manage_folders" });

  const parsed = renameFolderSchema.safeParse({
    folderId: formData.get("folderId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  try {
    const folder = await renameFolder({
      folderId: parsed.data.folderId,
      name: parsed.data.name,
    });

    await writeAudit({
      actorId: actor.id,
      action: "ged.rename_folder",
      entityType: "document_folder",
      entityId: folder.id,
      metadata: { name: folder.name, path: folder.path },
    });

    revalidatePath("/ged");
    return {
      ok: true,
      message: `Dossier renommé « ${folder.name} »`,
      folderId: folder.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Renommage impossible",
    };
  }
}

export async function deleteFolderAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "ged.manage_folders" });

  const parsed = deleteFolderSchema.safeParse({
    folderId: formData.get("folderId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }

  try {
    const folder = await deleteFolderSubtree(parsed.data.folderId);

    await writeAudit({
      actorId: actor.id,
      action: "ged.delete_folder",
      entityType: "document_folder",
      entityId: folder.id,
      metadata: { name: folder.name, path: folder.path },
    });

    revalidatePath("/ged");
    return {
      ok: true,
      message: `Dossier « ${folder.name} » supprimé`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Suppression impossible",
    };
  }
}
