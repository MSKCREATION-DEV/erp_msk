"use server";

import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  countsTowardBalanceForDate,
  getSvAccountByKind,
  inferAccountKindFromPaymentMethod,
} from "@/lib/suivi/accounts";
import {
  nextSvCashMovementReferenceFromExisting,
  svCashMovementReferencePrefix,
} from "@/lib/suivi/cash-reference";
import {
  isSvPaymentModeOther,
  resolveSvPaymentMethod,
  SV_PAYMENT_MODES,
} from "@/lib/suivi/payment-modes";

const paymentModeSchema = z.enum(SV_PAYMENT_MODES);

const movementSchema = z
  .object({
    direction: z.enum(["IN", "OUT"]),
    amount: z.coerce.number().int().positive().max(100_000_000),
    movedAt: z.string().min(1),
    category: z.string().trim().min(1).max(120),
    categoryOther: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    clientProject: z.string().trim().max(200).optional().or(z.literal("")),
    beneficiary: z.string().trim().max(200).optional().or(z.literal("")),
    paymentMethodMode: paymentModeSchema.optional().or(z.literal("")),
    paymentMethod: z.string().trim().max(80).optional().or(z.literal("")),
    paymentMethodOther: z.string().trim().max(80).optional().or(z.literal("")),
    paidBy: z.string().trim().max(120).optional().or(z.literal("")),
    accountKind: z.enum(["PHYSICAL", "BANK", ""]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "Autre" && !(data.categoryOther ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Précisez la catégorie (Autre).",
        path: ["categoryOther"],
      });
    }
    const mode = data.paymentMethodMode;
    if (
      mode &&
      isSvPaymentModeOther(mode) &&
      !(data.paymentMethodOther ?? "").trim() &&
      !(data.paymentMethod ?? "").trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Précisez le mode de paiement (Autre).",
        path: ["paymentMethodOther"],
      });
    }
  });

export type SvMovementActionState = { ok: false; error: string } | null;

function emptyToNull(v: string | undefined | null) {
  const t = v?.trim();
  return t ? t : null;
}

async function allocateCashMovementReference(
  tx: Prisma.TransactionClient,
  day: Date,
): Promise<string> {
  const prefix = svCashMovementReferencePrefix(day);
  const rows = await tx.svCashMovement.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  return nextSvCashMovementReferenceFromExisting(
    rows.map((r) => r.reference),
    day,
  );
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
    categoryOther: formData.get("categoryOther") ?? "",
    description: formData.get("description") ?? "",
    clientProject: formData.get("clientProject") ?? "",
    beneficiary: formData.get("beneficiary") ?? "",
    paymentMethodMode: formData.get("paymentMethodMode") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    paymentMethodOther: formData.get("paymentMethodOther") ?? "",
    paidBy: formData.get("paidBy") ?? "",
    accountKind: formData.get("accountKind") ?? "",
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

  const category =
    parsed.data.category === "Autre"
      ? parsed.data.categoryOther!.trim()
      : parsed.data.category;

  const modeCard = parsed.data.paymentMethodMode || "";
  const methodFinal = emptyToNull(
    modeCard
      ? resolveSvPaymentMethod(modeCard, parsed.data.paymentMethodOther) ||
          parsed.data.paymentMethod
      : parsed.data.paymentMethod,
  );

  const kind =
    parsed.data.accountKind === "PHYSICAL" ||
    parsed.data.accountKind === "BANK"
      ? parsed.data.accountKind
      : inferAccountKindFromPaymentMethod(methodFinal);

  try {
    const account = await getSvAccountByKind(kind, prisma);
    await prisma.$transaction(async (tx) => {
      let reference = await allocateCashMovementReference(tx, movedAt);
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          await tx.svCashMovement.create({
            data: {
              direction: parsed.data.direction,
              amount: parsed.data.amount,
              movedAt,
              category,
              description: emptyToNull(parsed.data.description),
              clientProject: emptyToNull(parsed.data.clientProject),
              beneficiary: emptyToNull(parsed.data.beneficiary),
              paymentMethod: methodFinal,
              paidBy: emptyToNull(parsed.data.paidBy),
              reference,
              accountId: account.id,
              countsTowardBalance: countsTowardBalanceForDate(movedAt),
              createdById: user.id,
            },
          });
          return;
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            const rows = await tx.svCashMovement.findMany({
              where: {
                reference: {
                  startsWith: svCashMovementReferencePrefix(movedAt),
                },
              },
              select: { reference: true },
            });
            reference = nextSvCashMovementReferenceFromExisting(
              rows.map((r) => r.reference),
              movedAt,
            );
            continue;
          }
          throw e;
        }
      }
      throw new Error("Collision référence mouvement");
    });
  } catch {
    return { ok: false, error: "Création mouvement impossible." };
  }

  revalidatePath("/suivi/mouvements");
  revalidatePath("/suivi/comptes");
  revalidatePath("/suivi");
  return redirectWithFlash("/suivi/mouvements", "Mouvement enregistré.");
}
