"use server";

import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { nextStockQuantity, SV_STOCK_UNITS } from "@/lib/suivi/stock";

const unitSchema = z.enum(SV_STOCK_UNITS);

const itemSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code trop court")
    .max(32)
    .regex(/^[A-Za-z0-9\-]+$/, "Code : lettres, chiffres, tirets"),
  family: z.string().trim().min(1, "Famille obligatoire").max(80),
  subFamily: z.string().trim().max(80).optional().or(z.literal("")),
  label: z.string().trim().min(1, "Libellé obligatoire").max(200),
  unit: unitSchema,
  location: z.string().trim().max(120).optional().or(z.literal("")),
  observations: z.string().trim().max(2000).optional().or(z.literal("")),
  initialQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

const stockMoveSchema = z.object({
  itemId: z.string().min(1),
  kind: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  movedAt: z.string().min(1),
});

export type SvStockActionState = { ok: false; error: string } | null;

function emptyToNull(v: string | undefined) {
  const t = v?.trim();
  return t ? t : null;
}

function canManage(user: Parameters<typeof hasPermission>[0]) {
  return hasPermission(user, "sv.stock.manage");
}

function revalidateStock(itemId?: string) {
  revalidatePath("/suivi/stocks");
  revalidatePath("/suivi");
  if (itemId) {
    revalidatePath(`/suivi/stocks/${itemId}`);
    revalidatePath(`/suivi/stocks/${itemId}/edit`);
  }
}

export async function createSvStockItem(
  _prev: SvStockActionState,
  formData: FormData,
): Promise<SvStockActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const parsed = itemSchema.safeParse({
    code: formData.get("code"),
    family: formData.get("family"),
    subFamily: formData.get("subFamily") ?? "",
    label: formData.get("label"),
    unit: formData.get("unit"),
    location: formData.get("location") ?? "",
    observations: formData.get("observations") ?? "",
    initialQuantity: formData.get("initialQuantity") ?? 0,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const d = parsed.data;
  const code = d.code.toUpperCase();
  const qty = d.initialQuantity ?? 0;
  let id: string;

  try {
    id = await prisma.$transaction(async (tx) => {
      const row = await tx.svStockItem.create({
        data: {
          code,
          family: d.family,
          subFamily: emptyToNull(d.subFamily),
          label: d.label,
          unit: d.unit,
          quantity: qty,
          location: emptyToNull(d.location),
          observations: emptyToNull(d.observations),
        },
      });
      if (qty > 0) {
        await tx.svStockMovement.create({
          data: {
            itemId: row.id,
            kind: "ADJUST",
            quantity: qty,
            note: "Ouverture article",
            createdById: user.id,
          },
        });
      }
      return row.id;
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "Ce code article existe déjà." };
    }
    return { ok: false, error: "Création impossible." };
  }

  revalidateStock(id);
  return redirectWithFlash(`/suivi/stocks/${id}`, "Article créé.");
}

export async function updateSvStockItem(
  itemId: string,
  _prev: SvStockActionState,
  formData: FormData,
): Promise<SvStockActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const parsed = itemSchema.omit({ initialQuantity: true }).safeParse({
    code: formData.get("code"),
    family: formData.get("family"),
    subFamily: formData.get("subFamily") ?? "",
    label: formData.get("label"),
    unit: formData.get("unit"),
    location: formData.get("location") ?? "",
    observations: formData.get("observations") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const existing = await prisma.svStockItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.archivedAt) {
    return { ok: false, error: "Article introuvable ou archivé." };
  }

  const d = parsed.data;
  const code = d.code.toUpperCase();

  try {
    await prisma.svStockItem.update({
      where: { id: itemId },
      data: {
        code,
        family: d.family,
        subFamily: emptyToNull(d.subFamily),
        label: d.label,
        unit: d.unit,
        location: emptyToNull(d.location),
        observations: emptyToNull(d.observations),
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "Ce code article existe déjà." };
    }
    return { ok: false, error: "Mise à jour impossible." };
  }

  revalidateStock(itemId);
  return redirectWithFlash(`/suivi/stocks/${itemId}`, "Article mis à jour.");
}

export async function archiveSvStockItem(
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const existing = await prisma.svStockItem.findUnique({ where: { id: itemId } });
  if (!existing) return { ok: false, error: "Article introuvable." };
  if (existing.archivedAt) {
    revalidateStock(itemId);
    return { ok: true };
  }

  try {
    await prisma.svStockItem.update({
      where: { id: itemId },
      data: {
        archivedAt: new Date(),
        observations: [
          existing.observations,
          `Archivé par ${user.email}`,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    });
  } catch {
    return { ok: false, error: "Archivage impossible." };
  }

  revalidateStock(itemId);
  return { ok: true };
}

export async function createSvStockMovement(
  _prev: SvStockActionState,
  formData: FormData,
): Promise<SvStockActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const parsed = stockMoveSchema.safeParse({
    itemId: formData.get("itemId"),
    kind: formData.get("kind"),
    quantity: formData.get("quantity"),
    note: formData.get("note") ?? "",
    movedAt: formData.get("movedAt"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const movedAt = new Date(parsed.data.movedAt);
  if (Number.isNaN(movedAt.getTime())) {
    return { ok: false, error: "Date invalide." };
  }

  const item = await prisma.svStockItem.findUnique({
    where: { id: parsed.data.itemId },
  });
  if (!item || item.archivedAt) {
    return { ok: false, error: "Article introuvable ou archivé." };
  }

  if (parsed.data.kind !== "ADJUST" && parsed.data.quantity < 1) {
    return { ok: false, error: "Quantité invalide." };
  }

  const { nextQty, moveQty } = nextStockQuantity(
    item.quantity,
    parsed.data.kind,
    parsed.data.quantity,
  );

  if (nextQty < 0) {
    return {
      ok: false,
      error: "Quantité insuffisante — on ne peut pas descendre en négatif.",
    };
  }
  if (parsed.data.kind === "ADJUST" && moveQty === 0) {
    return { ok: false, error: "Quantité déjà à la cible — aucun mouvement." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.svStockMovement.create({
        data: {
          itemId: item.id,
          movedAt,
          kind: parsed.data.kind,
          quantity: moveQty,
          note: parsed.data.note || null,
          createdById: user.id,
        },
      });
      await tx.svStockItem.update({
        where: { id: item.id },
        data: { quantity: nextQty },
      });
    });
  } catch {
    return { ok: false, error: "Mouvement stock impossible." };
  }

  revalidateStock(item.id);
  return redirectWithFlash(`/suivi/stocks/${item.id}`, "Mouvement stock enregistré.");
}
