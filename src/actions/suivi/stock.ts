"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";

const stockMoveSchema = z.object({
  itemId: z.string().min(1),
  kind: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  movedAt: z.string().min(1),
});

export type SvStockActionState = { ok: false; error: string } | null;

export async function createSvStockMovement(
  _prev: SvStockActionState,
  formData: FormData,
): Promise<SvStockActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.stock.manage") && !user.isSuperAdmin) {
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const movedAt = new Date(parsed.data.movedAt);
  if (Number.isNaN(movedAt.getTime())) {
    return { ok: false, error: "Date invalide." };
  }

  const item = await prisma.svStockItem.findUnique({
    where: { id: parsed.data.itemId },
  });
  if (!item) return { ok: false, error: "Article introuvable." };

  if (parsed.data.kind !== "ADJUST" && parsed.data.quantity < 1) {
    return { ok: false, error: "Quantité invalide." };
  }

  let nextQty = item.quantity;
  if (parsed.data.kind === "IN") nextQty += parsed.data.quantity;
  else if (parsed.data.kind === "OUT") nextQty -= parsed.data.quantity;
  else nextQty = parsed.data.quantity; // ADJUST = niveau absolu

  if (nextQty < 0) {
    return { ok: false, error: "Stock insuffisant (quantité négative refusée)." };
  }

  const moveQty =
    parsed.data.kind === "ADJUST"
      ? Math.abs(nextQty - item.quantity)
      : parsed.data.quantity;

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

  revalidatePath("/suivi/stocks");
  revalidatePath(`/suivi/stocks/${item.id}`);
  revalidatePath("/suivi");
  redirect("/suivi/stocks");
}
