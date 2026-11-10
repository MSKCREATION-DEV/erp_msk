"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { deriveInvoiceStatus } from "@/lib/suivi/balances";
import {
  getSvAccountByKind,
  inferAccountKindFromPaymentMethod,
} from "@/lib/suivi/accounts";

export type SvInvoiceActionState = { ok: false; error: string } | null;

const lineSchema = z.object({
  label: z.string().trim().min(1).max(500),
  description: z.string().trim().max(2000).optional(),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().int().nonnegative(),
  vatRate: z.coerce.number().int().min(0).max(100).optional(),
});

const remixSchema = z.object({
  clientId: z.string().min(1),
  remixedFromId: z.string().optional().or(z.literal("")),
  object: z.string().trim().max(500).optional().or(z.literal("")),
  issue: z.enum(["brouillon", "emise"]).default("emise"),
  linesJson: z.string().min(2),
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

function lineTotals(
  lines: { qty: number; unitPrice: number; vatRate?: number }[],
  defaultVat: number,
) {
  let totalHt = 0;
  let totalVat = 0;
  for (const l of lines) {
    const ht = l.qty * l.unitPrice;
    const rate = l.vatRate ?? defaultVat;
    totalHt += ht;
    totalVat += Math.round((ht * rate) / 100);
  }
  return { totalHt, totalVat, totalTtc: totalHt + totalVat };
}

export async function createSvInvoiceRemix(
  _prev: SvInvoiceActionState,
  formData: FormData,
): Promise<SvInvoiceActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.invoices.manage") && !user.isSuperAdmin) {
    return { ok: false, error: "Permission refusée." };
  }

  const parsed = remixSchema.safeParse({
    clientId: formData.get("clientId"),
    remixedFromId: formData.get("remixedFromId") ?? "",
    object: formData.get("object") ?? "",
    issue: formData.get("issue") ?? "emise",
    linesJson: formData.get("linesJson"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(parsed.data.linesJson);
  } catch {
    return { ok: false, error: "Lignes invalides." };
  }
  const linesParsed = z.array(lineSchema).min(1).safeParse(linesRaw);
  if (!linesParsed.success) {
    return { ok: false, error: "Au moins une ligne valide requise." };
  }

  const client = await prisma.svClient.findUnique({
    where: { id: parsed.data.clientId },
  });
  if (!client) return { ok: false, error: "Client introuvable." };

  const remixedFromId = parsed.data.remixedFromId || null;
  if (remixedFromId) {
    const src = await prisma.svInvoice.findFirst({
      where: { id: remixedFromId, clientId: client.id },
    });
    if (!src) return { ok: false, error: "Facture source introuvable." };
  }

  const totals = lineTotals(linesParsed.data, 18);
  const status = parsed.data.issue === "brouillon" ? "BROUILLON" : "EMISE";

  let id: string;
  try {
    const row = await prisma.svInvoice.create({
      data: {
        clientId: client.id,
        status,
        issuedAt: status === "EMISE" ? new Date() : null,
        totalHt: totals.totalHt,
        totalVat: totals.totalVat,
        totalTtc: totals.totalTtc,
        amountPaid: 0,
        object: parsed.data.object || null,
        remixedFromId,
        createdById: user.id,
        lines: {
          create: linesParsed.data.map((l, i) => ({
            sortOrder: i,
            label: l.label,
            description: l.description,
            qty: l.qty,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate ?? 18,
          })),
        },
      },
    });
    id = row.id;
  } catch {
    return { ok: false, error: "Création facture impossible." };
  }

  revalidatePath("/suivi/factures");
  revalidatePath(`/suivi/clients/${client.id}`);
  redirect(`/suivi/factures/${id}`);
}

export async function recordSvPayment(
  _prev: SvInvoiceActionState,
  formData: FormData,
): Promise<SvInvoiceActionState> {
  const user = await requireUser();
  if (!hasPermission(user, "sv.invoices.manage") && !user.isSuperAdmin) {
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const invoice = await prisma.svInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
  });
  if (!invoice) return { ok: false, error: "Facture introuvable." };
  if (invoice.status === "ANNULEE" || invoice.status === "BROUILLON") {
    return { ok: false, error: "Paiement impossible sur ce statut." };
  }

  const reste = invoice.totalTtc - invoice.amountPaid;
  if (parsed.data.amount > reste) {
    return { ok: false, error: `Montant supérieur au reste (${reste} F).` };
  }

  const paidAt = new Date(parsed.data.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false, error: "Date de paiement invalide." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.svPayment.create({
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
      await tx.svInvoice.update({
        where: { id: invoice.id },
        data: { amountPaid, status },
      });

      // Décision E — miroir paiement → mouvement IN (optionnel, défaut ON)
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
            direction: "IN",
            amount: parsed.data.amount,
            category: "Encaissement client",
            description: `Paiement facture ${invoice.number ?? invoice.id}`,
            paymentMethod: parsed.data.method || null,
            reference: parsed.data.reference || null,
            accountId: account.id,
            linkedClientId: invoice.clientId,
            linkedInvoiceId: invoice.id,
            linkedPaymentId: payment.id,
            createdById: user.id,
          },
        });
      }
    });
  } catch {
    return { ok: false, error: "Enregistrement paiement impossible." };
  }

  revalidatePath(`/suivi/factures/${invoice.id}`);
  revalidatePath(`/suivi/clients/${invoice.clientId}`);
  revalidatePath("/suivi/factures");
  revalidatePath("/suivi/mouvements");
  revalidatePath("/suivi/comptes");
  revalidatePath("/suivi");
  redirect(`/suivi/factures/${invoice.id}`);
}
