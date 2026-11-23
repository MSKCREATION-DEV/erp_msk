"use server";

import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import type { SvCountry } from "@/generated/prisma/client";
import {
  canSvCountry,
  parseSvCountryParam,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import {
  nextStockCodeFromExisting,
  nextStockQuantity,
  stockFamilyPrefix,
  SV_STOCK_FAMILIES,
  SV_STOCK_UNITS,
} from "@/lib/suivi/stock";

const unitSchema = z.enum(SV_STOCK_UNITS);
const familySchema = z.enum(SV_STOCK_FAMILIES);

const itemCreateSchema = z.object({
  family: familySchema,
  subFamily: z.string().trim().max(80).optional().or(z.literal("")),
  label: z.string().trim().min(1, "Libellé obligatoire").max(200),
  unit: unitSchema,
  location: z.string().trim().max(120).optional().or(z.literal("")),
  observations: z.string().trim().max(2000).optional().or(z.literal("")),
  initialQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

const itemUpdateSchema = z.object({
  family: familySchema,
  subFamily: z.string().trim().max(80).optional().or(z.literal("")),
  label: z.string().trim().min(1, "Libellé obligatoire").max(200),
  unit: unitSchema,
  location: z.string().trim().max(120).optional().or(z.literal("")),
  observations: z.string().trim().max(2000).optional().or(z.literal("")),
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

/**
 * Alloue un code `PREFIX-NNN` atomiquement (lecture préfixe en tx + retry P2002).
 */
async function allocateStockCode(
  tx: Prisma.TransactionClient,
  family: z.infer<typeof familySchema>,
  country: SvCountry,
): Promise<string> {
  const prefix = stockFamilyPrefix(family);
  if (!prefix) {
    throw new Error("Famille invalide");
  }
  const rows = await tx.svStockItem.findMany({
    where: { country, code: { startsWith: `${prefix}-` } },
    select: { code: true },
  });
  return nextStockCodeFromExisting(
    rows.map((r) => r.code),
    prefix,
  );
}

function requirePaysFromForm(
  formData: FormData,
  user: Parameters<typeof canSvCountry>[0],
): SvCountry | { ok: false; error: string } {
  const country = parseSvCountryParam(String(formData.get("pays") ?? ""));
  if (!country) return { ok: false, error: "Pays obligatoire." };
  if (!canSvCountry(user, country) && !user.isSuperAdmin) {
    return { ok: false, error: "Droit pays insuffisant." };
  }
  return country;
}

export async function createSvStockItem(
  _prev: SvStockActionState,
  formData: FormData,
): Promise<SvStockActionState> {
  const user = await requireUser();
  if (!canManage(user)) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const countryOrErr = requirePaysFromForm(formData, user);
  if (typeof countryOrErr === "object" && "ok" in countryOrErr) {
    return countryOrErr;
  }
  const country = countryOrErr;

  const parsed = itemCreateSchema.safeParse({
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
  const qty = d.initialQuantity ?? 0;
  let id: string;

  try {
    id = await prisma.$transaction(async (tx) => {
      let code = await allocateStockCode(tx, d.family, country);
      let row: { id: string } | null = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          row = await tx.svStockItem.create({
            data: {
              country,
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
          break;
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            const rows = await tx.svStockItem.findMany({
              where: {
                country,
                code: {
                  startsWith: `${stockFamilyPrefix(d.family)!}-`,
                },
              },
              select: { code: true },
            });
            code = nextStockCodeFromExisting(
              rows.map((r) => r.code),
              stockFamilyPrefix(d.family)!,
            );
            continue;
          }
          throw e;
        }
      }
      if (!row) {
        throw new Error("Collision code article");
      }
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
  } catch {
    return { ok: false, error: "Création impossible." };
  }

  revalidateStock(id);
  return redirectWithFlash(
    withSvCountryQuery(`/suivi/stocks/${id}`, country),
    "Article créé.",
  );
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

  const parsed = itemUpdateSchema.safeParse({
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

  const countryOrErr = requirePaysFromForm(formData, user);
  if (typeof countryOrErr === "object" && "ok" in countryOrErr) {
    return countryOrErr;
  }
  const country = countryOrErr;

  const existing = await prisma.svStockItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.archivedAt) {
    return { ok: false, error: "Article introuvable ou archivé." };
  }
  if (existing.country !== country) {
    return { ok: false, error: "Pays incohérent avec l’article." };
  }

  const d = parsed.data;

  try {
    await prisma.svStockItem.update({
      where: { id: itemId },
      data: {
        // Code inchangé (généré à la création — jamais réécrit).
        family: d.family,
        subFamily: emptyToNull(d.subFamily),
        label: d.label,
        unit: d.unit,
        location: emptyToNull(d.location),
        observations: emptyToNull(d.observations),
      },
    });
  } catch {
    return { ok: false, error: "Mise à jour impossible." };
  }

  revalidateStock(itemId);
  return redirectWithFlash(
    withSvCountryQuery(`/suivi/stocks/${itemId}`, country),
    "Article mis à jour.",
  );
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
  if (!canSvCountry(user, existing.country) && !user.isSuperAdmin) {
    return { ok: false, error: "Droit pays insuffisant." };
  }
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

  const countryOrErr = requirePaysFromForm(formData, user);
  if (typeof countryOrErr === "object" && "ok" in countryOrErr) {
    return countryOrErr;
  }
  const country = countryOrErr;

  const item = await prisma.svStockItem.findUnique({
    where: { id: parsed.data.itemId },
  });
  if (!item || item.archivedAt) {
    return { ok: false, error: "Article introuvable ou archivé." };
  }
  if (item.country !== country) {
    return { ok: false, error: "Mouvement inter-pays interdit." };
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
  return redirectWithFlash(
    withSvCountryQuery(`/suivi/stocks/${item.id}`, country),
    "Mouvement stock enregistré.",
  );
}
