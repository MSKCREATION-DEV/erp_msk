"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, StkPurchaseStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { postPurchaseToCpt } from "@/lib/stocks/post-purchase-to-cpt";

type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

function revalidatePurchases(id?: string) {
  revalidatePath("/stocks");
  revalidatePath("/stocks/achats");
  revalidatePath("/stocks/articles");
  revalidatePath("/stocks/mouvements");
  if (id) revalidatePath(`/stocks/achats/${id}`);
}

async function nextPurchaseNumber() {
  const year = new Date().getFullYear();
  const prefix = `ACH-${year}-`;
  const last = await prisma.stkPurchase.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createPurchaseAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "stk.achats.manage")) {
    return { ok: false, error: "Permission refusée" };
  }

  const supplierName = String(formData.get("supplierName") ?? "").trim();
  const supplierContact =
    String(formData.get("supplierContact") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const linesRaw = String(formData.get("linesJson") ?? "[]");
  let lines: Array<{
    articleId?: string;
    label: string;
    quantity: number;
    unitPriceXof: number;
  }>;
  try {
    lines = z
      .array(
        z.object({
          articleId: z.string().cuid().optional(),
          label: z.string().trim().min(1),
          quantity: z.number().positive(),
          unitPriceXof: z.number().int().min(0),
        }),
      )
      .min(1)
      .parse(JSON.parse(linesRaw));
  } catch {
    return { ok: false, error: "Lignes d’achat invalides" };
  }
  if (!supplierName) return { ok: false, error: "Fournisseur requis" };

  const number = await nextPurchaseNumber();
  const purchase = await prisma.stkPurchase.create({
    data: {
      number,
      supplierName,
      supplierContact,
      notes,
      status: "DRAFT",
      createdById: user.id,
      lines: {
        create: lines.map((l, i) => ({
          articleId: l.articleId ?? null,
          label: l.label,
          quantity: new Prisma.Decimal(l.quantity.toFixed(3)),
          unitPriceXof: l.unitPriceXof,
          sortOrder: i,
        })),
      },
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "stk.purchase.create",
    entityType: "StkPurchase",
    entityId: purchase.id,
  });
  revalidatePurchases(purchase.id);
  return { ok: true, id: purchase.id, message: "Achat créé" };
}

export async function updatePurchaseStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "stk.achats.manage")) {
    return { ok: false, error: "Permission refusée" };
  }
  const id = z.string().cuid().safeParse(formData.get("purchaseId"));
  const status = z.nativeEnum(StkPurchaseStatus).safeParse(formData.get("status"));
  if (!id.success || !status.success) {
    return { ok: false, error: "Données invalides" };
  }

  const purchase = await prisma.stkPurchase.findUnique({
    where: { id: id.data },
    include: { lines: true },
  });
  if (!purchase) return { ok: false, error: "Achat introuvable" };

  if (status.data === "ORDERED") {
    if (purchase.status !== "DRAFT") {
      return { ok: false, error: "Seul un brouillon peut être commandé" };
    }
    await prisma.stkPurchase.update({
      where: { id: purchase.id },
      data: { status: "ORDERED", orderedAt: new Date() },
    });
    revalidatePurchases(purchase.id);
    return { ok: true, message: "Commande passée" };
  }

  if (status.data === "CANCELLED") {
    if (purchase.status === "RECEIVED") {
      return { ok: false, error: "Impossible d’annuler une réception" };
    }
    await prisma.stkPurchase.update({
      where: { id: purchase.id },
      data: { status: "CANCELLED" },
    });
    revalidatePurchases(purchase.id);
    return { ok: true, message: "Achat annulé" };
  }

  if (status.data === "RECEIVED") {
    if (purchase.status !== "ORDERED" && purchase.status !== "DRAFT") {
      return { ok: false, error: "Réception impossible dans cet état" };
    }

    const now = new Date();
    let total = 0;

    await prisma.$transaction(async (tx) => {
      for (const line of purchase.lines) {
        const lineTotal =
          Math.round(Number(line.quantity) * line.unitPriceXof);
        total += lineTotal;
        if (!line.articleId) continue;

        const article = await tx.stkArticle.findUnique({
          where: { id: line.articleId },
        });
        if (!article) continue;

        const before = new Prisma.Decimal(article.qtyOnHand);
        const after = before.add(line.quantity);
        await tx.stkArticle.update({
          where: { id: article.id },
          data: { qtyOnHand: after },
        });
        await tx.stkMovement.create({
          data: {
            articleId: article.id,
            type: "ENTREE",
            quantity: line.quantity,
            qtyBefore: before,
            qtyAfter: after,
            reason: `Réception ${purchase.number}`,
            createdById: user.id,
            movedAt: now,
          },
        });
      }

      await tx.stkPurchase.update({
        where: { id: purchase.id },
        data: { status: "RECEIVED", receivedAt: now },
      });
    });

    const cpt = await postPurchaseToCpt({
      actorId: user.id,
      purchaseId: purchase.id,
      label: `Achat ${purchase.number} — ${purchase.supplierName}`,
      entryDate: now,
      amountXof: total,
    });
    if (cpt) {
      await prisma.stkPurchase.update({
        where: { id: purchase.id },
        data: { cptEntryId: cpt.entryId },
      });
    }

    await writeAudit({
      actorId: user.id,
      action: "stk.purchase.receive",
      entityType: "StkPurchase",
      entityId: purchase.id,
      metadata: { cptEntryId: cpt?.entryId ?? null, total },
    });
    revalidatePurchases(purchase.id);
    revalidatePath("/comptabilite/ecritures");
    return {
      ok: true,
      message: cpt
        ? `Réception OK — écriture ${cpt.number} (brouillon)`
        : "Réception OK (écriture AC non créée — comptes manquants)",
    };
  }

  return { ok: false, error: "Transition non supportée" };
}
