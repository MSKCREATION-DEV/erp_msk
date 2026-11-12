"use server";

import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  countsTowardBalanceForDate,
  getSvAccountByKind,
  inferAccountKindFromPaymentMethod,
} from "@/lib/suivi/accounts";

const movementSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  amount: z.coerce.number().int().positive().max(100_000_000),
  movedAt: z.string().min(1),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  clientProject: z.string().trim().max(200).optional().or(z.literal("")),
  beneficiary: z.string().trim().max(200).optional().or(z.literal("")),
  paymentMethod: z.string().trim().max(80).optional().or(z.literal("")),
  paidBy: z.string().trim().max(120).optional().or(z.literal("")),
  reference: z.string().trim().max(80).optional().or(z.literal("")),
  accountKind: z.enum(["PHYSICAL", "BANK", ""]).optional(),
});

export type SvMovementActionState = { ok: false; error: string } | null;

function emptyToNull(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

export async function createSvCashMovement(
  _prev: SvMovementActionState,
  formData: FormData,
): Promise<SvMovementActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.movements.manage") && !user.isSuperAdmin) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const parsed = movementSchema.safeParse({
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    movedAt: formData.get("movedAt"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    clientProject: formData.get("clientProject") ?? "",
    beneficiary: formData.get("beneficiary") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    paidBy: formData.get("paidBy") ?? "",
    reference: formData.get("reference") ?? "",
    accountKind: formData.get("accountKind") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const movedAt = new Date(parsed.data.movedAt);
  if (Number.isNaN(movedAt.getTime())) {
    return { ok: false, error: "Date invalide." };
  }

  const kind =
    parsed.data.accountKind === "PHYSICAL" ||
    parsed.data.accountKind === "BANK"
      ? parsed.data.accountKind
      : inferAccountKindFromPaymentMethod(parsed.data.paymentMethod);

  try {
    const account = await getSvAccountByKind(kind, prisma);
    await prisma.svCashMovement.create({
      data: {
        direction: parsed.data.direction,
        amount: parsed.data.amount,
        movedAt,
        category: parsed.data.category,
        description: emptyToNull(parsed.data.description),
        clientProject: emptyToNull(parsed.data.clientProject),
        beneficiary: emptyToNull(parsed.data.beneficiary),
        paymentMethod: emptyToNull(parsed.data.paymentMethod),
        paidBy: emptyToNull(parsed.data.paidBy),
        reference: emptyToNull(parsed.data.reference),
        accountId: account.id,
        countsTowardBalance: countsTowardBalanceForDate(movedAt),
        createdById: user.id,
      },
    });
  } catch {
    return { ok: false, error: "Création mouvement impossible." };
  }

  revalidatePath("/suivi/mouvements");
  revalidatePath("/suivi/comptes");
  revalidatePath("/suivi");
  return redirectWithFlash("/suivi/mouvements", "Mouvement enregistré.");
}
