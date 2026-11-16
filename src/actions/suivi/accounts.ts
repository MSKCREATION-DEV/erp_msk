"use server";

import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  countsTowardBalanceForDate,
  getSvAccountByKind,
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

export type SvAccountActionState = { ok: false; error: string } | null;

const paymentModeSchema = z.enum(SV_PAYMENT_MODES);

const entrySchema = z
  .object({
    accountId: z.string().min(1),
    op: z.enum(["CREDIT", "DEBIT", "TRANSFER_TO_PHYSICAL", "TRANSFER_TO_BANK"]),
    amount: z.coerce.number().int().positive().max(100_000_000),
    movedAt: z.string().min(1),
    category: z.string().trim().min(1).max(120),
    categoryOther: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    paymentMethodMode: paymentModeSchema.optional().or(z.literal("")),
    paymentMethod: z.string().trim().max(80).optional().or(z.literal("")),
    paymentMethodOther: z.string().trim().max(80).optional().or(z.literal("")),
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

function revalidateAccounts(accountId: string) {
  revalidatePath("/suivi/comptes");
  revalidatePath(`/suivi/comptes/${accountId}`);
  revalidatePath("/suivi/mouvements");
  revalidatePath("/suivi");
}

export async function createSvAccountEntry(
  _prev: SvAccountActionState,
  formData: FormData,
): Promise<SvAccountActionState> {
  const user = await requireUser();
  if (
    !hasPermission(user, "sv.accounts.manage") &&
    !user.isSuperAdmin
  ) {
    return { ok: false, error: "Droit insuffisant." };
  }

  const parsed = entrySchema.safeParse({
    accountId: formData.get("accountId"),
    op: formData.get("op"),
    amount: formData.get("amount"),
    movedAt: formData.get("movedAt"),
    category: formData.get("category"),
    categoryOther: formData.get("categoryOther") ?? "",
    description: formData.get("description") ?? "",
    paymentMethodMode: formData.get("paymentMethodMode") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    paymentMethodOther: formData.get("paymentMethodOther") ?? "",
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

  const account = await prisma.svAccount.findUnique({
    where: { id: parsed.data.accountId },
  });
  if (!account) {
    return { ok: false, error: "Compte introuvable." };
  }

  const desc = emptyToNull(parsed.data.description);
  const modeCard = parsed.data.paymentMethodMode || "";
  const method = emptyToNull(
    modeCard
      ? resolveSvPaymentMethod(modeCard, parsed.data.paymentMethodOther) ||
          parsed.data.paymentMethod
      : parsed.data.paymentMethod,
  );
  const category =
    parsed.data.category === "Autre"
      ? parsed.data.categoryOther!.trim()
      : parsed.data.category;
  const amount = parsed.data.amount;

  try {
    if (parsed.data.op === "CREDIT" || parsed.data.op === "DEBIT") {
      await prisma.$transaction(async (tx) => {
        const reference = await allocateCashMovementReference(tx, movedAt);
        await tx.svCashMovement.create({
          data: {
            accountId: account.id,
            movedAt,
            direction: parsed.data.op === "CREDIT" ? "IN" : "OUT",
            amount,
            category,
            description: desc,
            paymentMethod: method,
            reference,
            countsTowardBalance: countsTowardBalanceForDate(movedAt),
            createdById: user.id,
          },
        });
      });
    } else {
      const physical = await getSvAccountByKind("PHYSICAL", prisma);
      const bank = await getSvAccountByKind("BANK", prisma);
      const transferId = nanoid();
      const toPhysical = parsed.data.op === "TRANSFER_TO_PHYSICAL";

      if (toPhysical && account.kind !== "BANK") {
        return {
          ok: false,
          error: "Le retrait banque → physique se lance depuis le compte banque.",
        };
      }
      if (!toPhysical && account.kind !== "PHYSICAL") {
        return {
          ok: false,
          error: "Le versement physique → banque se lance depuis le compte physique.",
        };
      }

      const fromId = toPhysical ? bank.id : physical.id;
      const toId = toPhysical ? physical.id : bank.id;
      const transferCat = toPhysical
        ? "Banque / virement interne"
        : "Versement banque";
      const transferDesc =
        desc ??
        (toPhysical
          ? "Retrait banque → caisse physique"
          : "Versement caisse → banque");

      const towardBalance = countsTowardBalanceForDate(movedAt);
      await prisma.$transaction(async (tx) => {
        const reference = await allocateCashMovementReference(tx, movedAt);
        await tx.svCashMovement.create({
          data: {
            accountId: fromId,
            transferId,
            movedAt,
            direction: "OUT",
            amount,
            category: transferCat,
            description: transferDesc,
            paymentMethod: method ?? (toPhysical ? "Retrait" : "Versement"),
            reference,
            countsTowardBalance: towardBalance,
            createdById: user.id,
          },
        });
        await tx.svCashMovement.create({
          data: {
            accountId: toId,
            transferId,
            movedAt,
            direction: "IN",
            amount,
            category: transferCat,
            description: transferDesc,
            paymentMethod: method ?? (toPhysical ? "Retrait" : "Versement"),
            reference: `${reference}-R`,
            countsTowardBalance: towardBalance,
            createdById: user.id,
          },
        });
      });
    }
  } catch {
    return { ok: false, error: "Enregistrement impossible." };
  }

  revalidateAccounts(account.id);
  return redirectWithFlash(
    `/suivi/comptes/${account.id}`,
    "Écriture enregistrée.",
  );
}
