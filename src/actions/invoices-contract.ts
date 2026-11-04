"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import {
  ComContractLineStatus,
  ComContractStatus,
  ComInvoiceSource,
  ComInvoiceStatus,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/actions/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import {
  buildPeriodInvoice,
  periodAlreadyInvoiced,
} from "@/lib/billing/invoice-engine";
import { dueDateForBillingDay, monthPeriod } from "@/lib/billing/period";
import { canAccessOwned } from "@/lib/commercial/scope";
import { prisma } from "@/lib/prisma";

/**
 * Génère une facture brouillon pour la période courante depuis un contrat.
 * Inclut la présentation des arriérés (soldes ouverts) sans double-comptage.
 */
export async function createInvoiceFromContractAction(
  formData: FormData,
): Promise<ActionResult & { invoiceId?: string }> {
  const actor = await requireUser({ permission: "com.factures.create" });
  const contractId = String(formData.get("contractId") ?? "").trim();
  if (!contractId) return { ok: false, error: "Contrat manquant" };

  const contract = await prisma.comContract.findUnique({
    where: { id: contractId },
    include: {
      lines: true,
      client: { select: { id: true } },
    },
  });
  if (!contract) return { ok: false, error: "Contrat introuvable" };
  if (!canAccessOwned(actor, contract.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (contract.status !== ComContractStatus.ACTIF) {
    return { ok: false, error: "Contrat non actif" };
  }

  const { periodStart, periodEnd, label } = monthPeriod(new Date());

  const existingPeriods = await prisma.comInvoice.findMany({
    where: {
      contractId,
      status: { not: ComInvoiceStatus.ANNULEE },
      periodStart: { not: null },
      periodEnd: { not: null },
    },
    select: { periodStart: true, periodEnd: true },
  });

  if (
    periodAlreadyInvoiced({
      periodStart,
      periodEnd,
      existingPeriods: existingPeriods
        .filter((p) => p.periodStart && p.periodEnd)
        .map((p) => ({
          periodStart: p.periodStart!,
          periodEnd: p.periodEnd!,
        })),
    })
  ) {
    return {
      ok: false,
      error: `Période déjà facturée (${label}). Intervention explicite requise pour forcer.`,
    };
  }

  const openInvoices = await prisma.comInvoice.findMany({
    where: {
      clientId: contract.clientId,
      status: {
        in: [
          ComInvoiceStatus.EMISE,
          ComInvoiceStatus.ENVOYEE,
          ComInvoiceStatus.PARTIELLEMENT_PAYEE,
          ComInvoiceStatus.EN_RETARD,
        ],
      },
    },
    include: {
      allocations: true,
      creditNotes: { select: { amount: true } },
    },
  });

  const built = buildPeriodInvoice({
    lines: contract.lines.map((l) => ({
      id: l.id,
      label: l.label,
      qty: l.qty,
      unitPrice: l.unitPrice,
      isTravel: l.billing === "COMPLEMENTAIRE",
      dueForPeriod:
        l.status === ComContractLineStatus.ACTIF &&
        (l.billing === "MONTHLY" ||
          l.billing === "RECURRING" ||
          l.billing === "COMPLEMENTAIRE"),
    })),
    vatEnabled: contract.vatEnabled,
    vatRate: contract.vatRate,
    includeTravel: true,
    priorOpenInvoices: openInvoices.map((inv) => ({
      invoiceId: inv.id,
      number: inv.number ?? inv.draftCode,
      totalTtc: inv.totalTtc,
      creditNotesApplied: inv.creditNotes.reduce((s, c) => s + c.amount, 0),
      allocations: inv.allocations.map((a) => ({
        paymentId: a.paymentId,
        invoiceId: a.invoiceId,
        amount: a.amount,
      })),
    })),
  });

  if (built.lines.length === 0) {
    return { ok: false, error: "Aucune prestation due pour la période" };
  }

  const dueDate = dueDateForBillingDay(periodEnd, contract.billingDay);
  const draftCode = `DRF-FAC-${nanoid(8)}`;

  let invoiceId: string;
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.comInvoice.create({
        data: {
          draftCode,
          number: null,
          status: ComInvoiceStatus.BROUILLON,
          source: ComInvoiceSource.CONTRACT,
          regime: contract.regime,
          currency: contract.currency,
          vatEnabled: contract.vatEnabled,
          vatRate: contract.vatRate,
          object: `Facturation ${label} — ${contract.reference}`,
          periodStart,
          periodEnd,
          dueDate,
          totalHt: built.periodHt,
          totalVat: built.periodVat,
          totalTtc: built.periodTtc,
          presentedNetPayable: built.net.netPayable,
          clientId: contract.clientId,
          contractId: contract.id,
          ownerId: actor.id,
          createdById: actor.id,
          lines: {
            create: built.lines.map((l, i) => ({
              sortOrder: i,
              label: l.label,
              qty: l.qty,
              unitPrice: l.unitPrice,
              isTravel: Boolean(l.isTravel),
              contractLineId: l.id,
              snapshotJson: {
                periodLabel: label,
                fromContractLineId: l.id,
              },
            })),
          },
          arrearsRefs: {
            create: built.net.arrearsRefs.map((r) => ({
              sourceInvoiceId: r.sourceInvoiceId,
              presentedAmount: r.presentedAmount,
              label: r.label ?? `Solde ${r.sourceInvoiceNumber}`,
            })),
          },
        },
      });

      // Avancer nextBillAt des lignes mensuelles
      for (const line of contract.lines) {
        if (
          line.status === ComContractLineStatus.ACTIF &&
          (line.billing === "MONTHLY" || line.billing === "RECURRING")
        ) {
          await tx.comContractLine.update({
            where: { id: line.id },
            data: { nextBillAt: periodEnd },
          });
        }
      }

      return created;
    });
    invoiceId = invoice.id;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec génération facture",
    };
  }

  await prisma.comClientEvent.create({
    data: {
      clientId: contract.clientId,
      type: "INVOICE_DRAFT_FROM_CONTRACT",
      summary: `Brouillon facture période ${label} (${built.net.netPayable} FCFA net présenté)`,
      entityType: "com_invoice",
      entityId: invoiceId,
      actorId: actor.id,
      metaJson: {
        periodTtc: built.periodTtc,
        arrearsPresented: built.net.arrearsPresented,
        netPayable: built.net.netPayable,
      },
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.invoice.from_contract",
    entityType: "com_invoice",
    entityId: invoiceId,
    metadata: { contractId, periodStart, periodEnd },
  });

  revalidatePath(`/commercial/contrats/${contractId}`);
  revalidatePath("/commercial/factures");
  revalidatePath(`/commercial/clients/${contract.clientId}`);
  redirect(`/commercial/factures/${invoiceId}`);
}
