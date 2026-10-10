"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PatAssetStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

function revalidatePat(id?: string) {
  revalidatePath("/patrimoine");
  if (id) revalidatePath(`/patrimoine/${id}`);
}

export async function upsertAssetAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "pat.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = z
    .object({
      id: z.string().cuid().optional(),
      code: z.string().trim().min(1).max(64),
      designation: z.string().trim().min(1).max(240),
      category: z.string().trim().min(1).max(120),
      acquiredAt: z.string().min(8),
      valueXof: z.coerce.number().int().min(0),
      location: z.string().trim().max(120).optional(),
      assignedToId: z.string().uuid().optional().or(z.literal("")),
      amortYears: z.coerce.number().int().min(1).max(50).default(5),
    })
    .safeParse({
      id: formData.get("id") || undefined,
      code: formData.get("code"),
      designation: formData.get("designation"),
      category: formData.get("category"),
      acquiredAt: formData.get("acquiredAt"),
      valueXof: formData.get("valueXof"),
      location: String(formData.get("location") ?? "").trim() || undefined,
      assignedToId: String(formData.get("assignedToId") ?? "").trim() || undefined,
      amortYears: formData.get("amortYears") ?? 5,
    });
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const data = {
    code: parsed.data.code.toUpperCase(),
    designation: parsed.data.designation,
    category: parsed.data.category,
    acquiredAt: new Date(parsed.data.acquiredAt),
    valueXof: parsed.data.valueXof,
    location: parsed.data.location ?? null,
    assignedToId: parsed.data.assignedToId || null,
    amortYears: parsed.data.amortYears,
  };

  try {
    if (parsed.data.id) {
      const row = await prisma.patAsset.update({
        where: { id: parsed.data.id },
        data,
      });
      await writeAudit({
        actorId: user.id,
        action: "pat.asset.update",
        entityType: "PatAsset",
        entityId: row.id,
      });
      revalidatePat(row.id);
      return { ok: true, id: row.id, message: "Bien mis à jour" };
    }
    const row = await prisma.patAsset.create({
      data: { ...data, createdById: user.id },
    });
    await writeAudit({
      actorId: user.id,
      action: "pat.asset.create",
      entityType: "PatAsset",
      entityId: row.id,
    });
    revalidatePat(row.id);
    return { ok: true, id: row.id, message: "Bien créé" };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "Code déjà utilisé" };
    }
    throw e;
  }
}

export async function disposeAssetAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "pat.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = z.string().cuid().safeParse(formData.get("assetId"));
  const note = String(formData.get("disposeNote") ?? "").trim() || null;
  if (!id.success) return { ok: false, error: "Bien manquant" };

  const asset = await prisma.patAsset.findUnique({ where: { id: id.data } });
  if (!asset || asset.status === "DISPOSED") {
    return { ok: false, error: "Bien introuvable ou déjà sorti" };
  }

  await prisma.patAsset.update({
    where: { id: asset.id },
    data: {
      status: "DISPOSED" satisfies PatAssetStatus,
      disposeNote: note,
      disposedAt: new Date(),
      assignedToId: null,
    },
  });
  await writeAudit({
    actorId: user.id,
    action: "pat.asset.dispose",
    entityType: "PatAsset",
    entityId: asset.id,
  });
  revalidatePat(asset.id);
  return { ok: true, message: "Bien sorti du patrimoine" };
}
