"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CatalogBilling, CatalogPillar } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import type { ActionResult } from "@/actions/auth";

const offerSchema = z.object({
  sku: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  pillar: z.nativeEnum(CatalogPillar),
  billing: z.nativeEnum(CatalogBilling),
  priceXof: z.coerce.number().int().min(0).nullable(),
});

export async function upsertCatalogOfferAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.catalogue.manage" });
  const id = String(formData.get("id") ?? "").trim() || null;

  const parsed = offerSchema.safeParse({
    sku: String(formData.get("sku") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    pillar: String(formData.get("pillar") ?? ""),
    billing: String(formData.get("billing") ?? "ONE_SHOT"),
    priceXof: String(formData.get("priceXof") ?? "").replace(/\s/g, "") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Champs catalogue invalides" };
  }

  if (id) {
    await prisma.catalogOffer.update({
      where: { id },
      data: {
        ...parsed.data,
        description: parsed.data.description ?? null,
      },
    });
  } else {
    await prisma.catalogOffer.create({
      data: {
        ...parsed.data,
        description: parsed.data.description ?? null,
      },
    });
  }

  await writeAudit({
    actorId: actor.id,
    action: id ? "catalogue.update" : "catalogue.create",
    entityType: "catalog_offer",
    entityId: id ?? parsed.data.sku,
  });

  revalidatePath("/catalogue");
  return { ok: true, message: "Offre enregistrée" };
}

export async function toggleCatalogOfferAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireUser({ permission: "com.catalogue.manage" });
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { ok: false, error: "Offre manquante" };

  await prisma.catalogOffer.update({
    where: { id },
    data: { active },
  });
  revalidatePath("/catalogue");
  return { ok: true, message: active ? "Offre activée" : "Offre désactivée" };
}
