"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SignatureStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import {
  MAX_SIGNATURE_BYTES,
  SIGNATURE_MIME,
} from "@/lib/ged/constants";
import { uploadGedObject } from "@/lib/ged/storage";
import { cleanSignatureImage } from "@/lib/signatures/clean";
import type { ActionResult } from "@/actions/auth";

export async function uploadSignatureAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "self.signature.manage" });
  const file = formData.get("file");
  const label = String(formData.get("label") ?? "Ma signature").slice(0, 80);

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Image manquante" };
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 5 Mo)" };
  }
  const mime = file.type || "application/octet-stream";
  if (!(SIGNATURE_MIME as readonly string[]).includes(mime)) {
    return { ok: false, error: "Formats acceptés : PNG, JPEG, WebP" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const stamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const storagePath = `signatures/${actor.id}/${stamp}_${safeName}`;
  const cleanedPath = `signatures/${actor.id}/${stamp}_cleaned.png`;

  try {
    await uploadGedObject(storagePath, bytes, mime);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec upload",
    };
  }

  let storageCleaned: string | null = null;
  try {
    const cleaned = await cleanSignatureImage(bytes);
    await uploadGedObject(cleanedPath, cleaned, "image/png");
    storageCleaned = cleanedPath;
  } catch (e) {
    console.error("[signature] nettoyage échoué — original conservé", e);
  }

  await prisma.signatureAsset.updateMany({
    where: { ownerUserId: actor.id, status: SignatureStatus.ACTIVE },
    data: { status: SignatureStatus.DRAFT },
  });

  const row = await prisma.signatureAsset.create({
    data: {
      ownerUserId: actor.id,
      label,
      kind: "UPLOAD",
      storageOriginal: storagePath,
      storageCleaned,
      mime,
      status: SignatureStatus.ACTIVE,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "signature.upload",
    entityType: "signature",
    entityId: row.id,
    metadata: { cleaned: Boolean(storageCleaned) },
  });

  revalidatePath("/administration/signatures");
  revalidatePath("/profil/signature");
  return {
    ok: true,
    message: storageCleaned
      ? "Signature enregistrée (fond nettoyé)"
      : "Signature enregistrée (nettoyage non appliqué — original utilisé)",
  };
}

export async function revokeSignatureAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "cfg.signatures" });
  const id = String(formData.get("signatureId") ?? "");
  if (!id) return { ok: false, error: "Signature manquante" };

  await prisma.signatureAsset.update({
    where: { id },
    data: { status: SignatureStatus.REVOKED },
  });

  await writeAudit({
    actorId: actor.id,
    action: "signature.revoke",
    entityType: "signature",
    entityId: id,
  });

  revalidatePath("/administration/signatures");
  return { ok: true, message: "Signature révoquée" };
}

const labelSchema = z.string().min(1).max(80);
void labelSchema;
