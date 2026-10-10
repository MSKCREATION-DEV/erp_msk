"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, StkMovementType } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

function revalidateStocks(articleId?: string) {
  revalidatePath("/stocks");
  revalidatePath("/stocks/articles");
  revalidatePath("/stocks/mouvements");
  if (articleId) revalidatePath(`/stocks/articles/${articleId}`);
}

function parseQty(raw: unknown, field: string) {
  const n = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field}_INVALID`);
  }
  return new Prisma.Decimal(n.toFixed(3));
}

const articleSchema = z.object({
  id: z.string().cuid().optional(),
  code: z.string().trim().min(1).max(64),
  family: z.string().trim().min(1).max(120),
  subFamily: z.string().trim().max(120).optional(),
  designation: z.string().trim().min(1).max(240),
  unit: z.string().trim().min(1).max(32).default("U"),
  stockMin: z.coerce.number().min(0),
  location: z.string().trim().max(120).optional(),
  unitCostXof: z.coerce.number().int().min(0).optional(),
  observations: z.string().trim().max(2000).optional(),
  active: z.boolean().default(true),
});

export async function upsertArticleAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "stk.articles.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const parsed = articleSchema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    family: formData.get("family"),
    subFamily: String(formData.get("subFamily") ?? "").trim() || undefined,
    designation: formData.get("designation"),
    unit: formData.get("unit") || "U",
    stockMin: formData.get("stockMin") ?? 0,
    location: String(formData.get("location") ?? "").trim() || undefined,
    unitCostXof: String(formData.get("unitCostXof") ?? "").trim()
      ? Number(formData.get("unitCostXof"))
      : undefined,
    observations: String(formData.get("observations") ?? "").trim() || undefined,
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) return { ok: false, error: "Données article invalides" };

  const data = {
    code: parsed.data.code.toUpperCase(),
    family: parsed.data.family,
    subFamily: parsed.data.subFamily ?? null,
    designation: parsed.data.designation,
    unit: parsed.data.unit,
    stockMin: new Prisma.Decimal(parsed.data.stockMin.toFixed(3)),
    location: parsed.data.location ?? null,
    unitCostXof: parsed.data.unitCostXof ?? null,
    observations: parsed.data.observations ?? null,
    active: parsed.data.active,
  };

  try {
    if (parsed.data.id) {
      const row = await prisma.stkArticle.update({
        where: { id: parsed.data.id },
        data,
      });
      await writeAudit({
        actorId: user.id,
        action: "stk.article.update",
        entityType: "StkArticle",
        entityId: row.id,
      });
      revalidateStocks(row.id);
      return { ok: true, id: row.id, message: "Article mis à jour" };
    }

    const row = await prisma.stkArticle.create({
      data: {
        ...data,
        qtyOnHand: new Prisma.Decimal(0),
        createdById: user.id,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "stk.article.create",
      entityType: "StkArticle",
      entityId: row.id,
    });
    revalidateStocks(row.id);
    return { ok: true, id: row.id, message: "Article créé" };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "Code article déjà utilisé" };
    }
    throw e;
  }
}

export async function createMovementAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "stk.moves.create")) {
    return { ok: false, error: "Permission refusée" };
  }

  const typeParsed = z.nativeEnum(StkMovementType).safeParse(formData.get("type"));
  const articleId = z.string().cuid().safeParse(formData.get("articleId"));
  if (!typeParsed.success || !articleId.success) {
    return { ok: false, error: "Mouvement invalide" };
  }
  const type = typeParsed.data;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  let quantityInput: Prisma.Decimal;
  let targetQty: Prisma.Decimal | null = null;
  try {
    if (type === "AJUSTEMENT") {
      targetQty = parseQty(formData.get("targetQty"), "targetQty");
      quantityInput = targetQty;
    } else {
      quantityInput = parseQty(formData.get("quantity"), "quantity");
      if (quantityInput.lte(0)) {
        return { ok: false, error: "La quantité doit être > 0" };
      }
    }
  } catch {
    return { ok: false, error: "Quantité invalide" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const article = await tx.stkArticle.findUnique({
        where: { id: articleId.data },
      });
      if (!article || !article.active) {
        throw new Error("ARTICLE_INTROUVABLE");
      }

      const before = new Prisma.Decimal(article.qtyOnHand);
      let after: Prisma.Decimal;
      let recordedQty: Prisma.Decimal;

      if (type === "ENTREE") {
        after = before.add(quantityInput);
        recordedQty = quantityInput;
      } else if (type === "SORTIE") {
        if (before.lt(quantityInput)) {
          throw new Error("STOCK_INSUFFISANT");
        }
        after = before.sub(quantityInput);
        recordedQty = quantityInput;
      } else {
        after = targetQty!;
        recordedQty = after.sub(before).abs();
        if (recordedQty.eq(0)) {
          throw new Error("AUCUN_CHANGEMENT");
        }
      }

      await tx.stkArticle.update({
        where: { id: article.id },
        data: { qtyOnHand: after },
      });

      const move = await tx.stkMovement.create({
        data: {
          articleId: article.id,
          type,
          quantity: recordedQty,
          qtyBefore: before,
          qtyAfter: after,
          reason,
          createdById: user.id,
          movedAt: new Date(),
        },
      });

      return { moveId: move.id, articleId: article.id };
    });

    await writeAudit({
      actorId: user.id,
      action: "stk.movement.create",
      entityType: "StkMovement",
      entityId: result.moveId,
      metadata: { type, articleId: result.articleId },
    });
    revalidateStocks(result.articleId);
    return { ok: true, id: result.moveId, message: "Mouvement enregistré" };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "STOCK_INSUFFISANT") {
        return { ok: false, error: "Stock insuffisant pour cette sortie" };
      }
      if (e.message === "ARTICLE_INTROUVABLE") {
        return { ok: false, error: "Article introuvable ou inactif" };
      }
      if (e.message === "AUCUN_CHANGEMENT") {
        return { ok: false, error: "Quantité déjà à la cible — aucun mouvement" };
      }
    }
    throw e;
  }
}
