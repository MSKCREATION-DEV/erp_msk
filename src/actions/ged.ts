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
import { ensureYearTree } from "@/lib/ged/tree";
import type { ActionResult } from "@/actions/auth";

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

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.status === DocStatus.TRASH) {
    return { ok: false, error: "Document introuvable" };
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
