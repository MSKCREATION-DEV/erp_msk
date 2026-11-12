"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { deriveInvoiceStatus, invoiceReste } from "@/lib/suivi/balances";
import {
  countsTowardBalanceForDate,
  getSvAccountByKind,
  inferAccountKindFromPaymentMethod,
} from "@/lib/suivi/accounts";
import { uploadSvExpenseBytes } from "@/lib/suivi/ged";
import { redirectWithFlash } from "@/lib/toast/flash";
import type { SvExpenseCategory } from "@/generated/prisma/client";

export type SvExpenseActionState = { ok: false; error: string } | null;

const CATEGORIES = [
  "ORANGE_INTERNET",
  "EDM_ELECTRICITE",
  "LOYER",
  "AUTRE",
] as const;

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  vendorName: z.string().trim().min(1).max(200),
  vendorRef: z.string().trim().max(200).optional().or(z.literal("")),
  number: z.string().trim().max(80).optional().or(z.literal("")),
  issuedAt: z.string().min(1),
  dueAt: z.string().optional().or(z.literal("")),
  periodStart: z.string().optional().or(z.literal("")),
  periodEnd: z.string().optional().or(z.literal("")),
  periodLabel: z.string().trim().max(120).optional().or(z.literal("")),
  totalHt: z.coerce.number().int().nonnegative(),
  totalVat: z.coerce.number().int().nonnegative(),
  totalTtc: z.coerce.number().int().positive(),
  object: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  paidAt: z.string().min(1),
  method: z.string().trim().max(80).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  mirrorMovement: z.enum(["0", "1"]).default("1"),
});

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function movementCategoryFor(category: SvExpenseCategory): string {
  switch (category) {
    case "ORANGE_INTERNET":
      return "Téléphone / Internet";
    case "EDM_ELECTRICITE":
      return "Électricité / EDM";
    case "LOYER":
      return "Loyer";
    default:
      return "Autre";
  }
}

function parseOptionalDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createSvExpenseInvoice(
  _prev: SvExpenseActionState,
  formData: FormData,
): Promise<SvExpenseActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.expenses.manage") && !user.isSuperAdmin) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = createSchema.safeParse({
    category: formData.get("category"),
    vendorName: formData.get("vendorName"),
    vendorRef: formData.get("vendorRef") ?? "",
    number: formData.get("number") ?? "",
    issuedAt: formData.get("issuedAt"),
    dueAt: formData.get("dueAt") ?? "",
    periodStart: formData.get("periodStart") ?? "",
    periodEnd: formData.get("periodEnd") ?? "",
    periodLabel: formData.get("periodLabel") ?? "",
    totalHt: formData.get("totalHt") ?? 0,
    totalVat: formData.get("totalVat") ?? 0,
    totalTtc: formData.get("totalTtc"),
    object: formData.get("object") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const issuedAt = parseOptionalDate(parsed.data.issuedAt);
  if (!issuedAt) {
    return { ok: false, error: "Date d’émission invalide." };
  }

  const file = formData.get("file");
  let fileBytes: Buffer | null = null;
  let fileName: string | null = null;
  let fileMime: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, error: "Fichier trop volumineux (max 12 Mo)." };
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return {
        ok: false,
        error: "Type de fichier non autorisé (PDF ou image).",
      };
    }
    fileBytes = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
    fileMime = mime;
  }

  let invoiceId: string;
  try {
    const invoice = await prisma.svExpenseInvoice.create({
      data: {
        category: parsed.data.category,
        status: "EMISE",
        vendorName: parsed.data.vendorName,
        vendorRef: parsed.data.vendorRef || null,
        number: parsed.data.number || null,
        issuedAt,
        dueAt: parseOptionalDate(parsed.data.dueAt),
        periodStart: parseOptionalDate(parsed.data.periodStart),
        periodEnd: parseOptionalDate(parsed.data.periodEnd),
        periodLabel: parsed.data.periodLabel || null,
        totalHt: parsed.data.totalHt,
        totalVat: parsed.data.totalVat,
        totalTtc: parsed.data.totalTtc,
        amountPaid: 0,
        object: parsed.data.object || null,
        notes: parsed.data.notes || null,
        createdById: user.id,
      },
    });
    invoiceId = invoice.id;

    if (fileBytes && fileName && fileMime) {
      await uploadSvExpenseBytes({
        expenseId: invoice.id,
        category: invoice.category,
        originalName: fileName,
        mime: fileMime,
        bytes: fileBytes,
        createdById: user.id,
      });
    }
  } catch {
    return { ok: false, error: "Création de la charge impossible." };
  }

  revalidatePath("/suivi/charges");
  revalidatePath("/suivi");
  return redirectWithFlash(`/suivi/charges/${invoiceId}`, "Charge enregistrée.");
}

export async function recordSvExpensePayment(
  _prev: SvExpenseActionState,
  formData: FormData,
): Promise<SvExpenseActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.expenses.manage") && !user.isSuperAdmin) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = paymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method") ?? "",
    reference: formData.get("reference") ?? "",
    note: formData.get("note") ?? "",
    mirrorMovement: formData.get("mirrorMovement") ?? "1",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const invoice = await prisma.svExpenseInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
  });
  if (!invoice || invoice.status === "ANNULEE" || invoice.status === "BROUILLON") {
    return { ok: false, error: "Paiement impossible sur cette charge." };
  }

  const reste = invoiceReste(invoice);
  if (parsed.data.amount > reste) {
    return { ok: false, error: `Montant supérieur au reste (${reste} F).` };
  }

  const paidAt = parseOptionalDate(parsed.data.paidAt);
  if (!paidAt) return { ok: false, error: "Date de paiement invalide." };

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.svExpensePayment.create({
        data: {
          invoiceId: invoice.id,
          amount: parsed.data.amount,
          paidAt,
          method: parsed.data.method || null,
          reference: parsed.data.reference || null,
          note: parsed.data.note || null,
        },
      });
      const amountPaid = invoice.amountPaid + parsed.data.amount;
      const status = deriveInvoiceStatus(
        invoice.totalTtc,
        amountPaid,
        invoice.status,
      );
      await tx.svExpenseInvoice.update({
        where: { id: invoice.id },
        data: { amountPaid, status },
      });

      if (parsed.data.mirrorMovement === "1") {
        if (!hasPermission(user, "sv.movements.manage") && !user.isSuperAdmin) {
          return;
        }
        const account = await getSvAccountByKind(
          inferAccountKindFromPaymentMethod(parsed.data.method),
          prisma,
        );
        await tx.svCashMovement.create({
          data: {
            movedAt: paidAt,
            direction: "OUT",
            amount: parsed.data.amount,
            category: movementCategoryFor(invoice.category),
            description:
              invoice.object ??
              `Paiement charge ${invoice.number ?? invoice.vendorName}`,
            beneficiary: invoice.vendorName,
            paymentMethod: parsed.data.method || null,
            reference: parsed.data.reference || null,
            accountId: account.id,
            countsTowardBalance: countsTowardBalanceForDate(paidAt),
            linkedExpenseInvoiceId: invoice.id,
            linkedExpensePaymentId: payment.id,
            createdById: user.id,
          },
        });
      }
    });
  } catch {
    return { ok: false, error: "Enregistrement du paiement impossible." };
  }

  revalidatePath(`/suivi/charges/${invoice.id}`);
  revalidatePath("/suivi/charges");
  revalidatePath("/suivi/mouvements");
  revalidatePath("/suivi/comptes");
  revalidatePath("/suivi");
  return redirectWithFlash(
    `/suivi/charges/${invoice.id}`,
    "Paiement enregistré.",
  );
}
