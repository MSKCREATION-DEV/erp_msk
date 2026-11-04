import { computeInvoiceBalance, type AllocationInput } from "./allocations";
import {
  computeNetPayable,
  type ArrearsPresentationRef,
  type NetPayableBreakdown,
} from "./arrears";
import { computeLineTotals, type BillableLine } from "./line-totals";
import type { MoneyInt } from "./money";

export type ContractLineForBilling = BillableLine & {
  id: string;
  label: string;
  /** true si la ligne est due sur la période (statut actif, nextBillAt dans période…) */
  dueForPeriod: boolean;
};

export type BuildPeriodInvoiceInput = {
  lines: ContractLineForBilling[];
  vatEnabled: boolean;
  vatRate: number;
  includeTravel?: boolean;
  /** Factures antérieures encore ouvertes → présentation arriérés */
  priorOpenInvoices?: Array<{
    invoiceId: string;
    number: string;
    totalTtc: MoneyInt;
    creditNotesApplied?: MoneyInt;
    allocations: AllocationInput[];
  }>;
};

export type BuiltPeriodInvoice = {
  lines: Array<{
    id: string;
    label: string;
    qty: number;
    unitPrice: MoneyInt;
    isTravel?: boolean;
  }>;
  periodHt: MoneyInt;
  periodVat: MoneyInt;
  periodTtc: MoneyInt;
  net: NetPayableBreakdown;
};

/**
 * Construit une facture de période à partir des lignes contractuelles dues
 * + présentation des arriérés (sans double-comptage).
 */
export function buildPeriodInvoice(
  input: BuildPeriodInvoiceInput,
): BuiltPeriodInvoice {
  const dueLines = input.lines.filter((l) => l.dueForPeriod);
  const totals = computeLineTotals({
    lines: dueLines,
    vatEnabled: input.vatEnabled,
    vatRate: input.vatRate,
    includeTravel: input.includeTravel ?? true,
  });

  const arrearsRefs: ArrearsPresentationRef[] = [];
  for (const prior of input.priorOpenInvoices ?? []) {
    const bal = computeInvoiceBalance({
      invoiceId: prior.invoiceId,
      totalTtc: prior.totalTtc,
      creditNotesApplied: prior.creditNotesApplied,
      allocations: prior.allocations,
    });
    if (bal.openBalance > 0) {
      arrearsRefs.push({
        sourceInvoiceId: prior.invoiceId,
        sourceInvoiceNumber: prior.number,
        presentedAmount: bal.openBalance,
        label: `Solde restant ${prior.number}`,
      });
    }
  }

  const net = computeNetPayable({
    periodTtc: totals.ttc,
    arrearsRefs,
  });

  return {
    lines: dueLines.map((l) => ({
      id: l.id,
      label: l.label,
      qty: l.qty,
      unitPrice: l.unitPrice,
      isTravel: l.isTravel,
    })),
    periodHt: totals.ht,
    periodVat: totals.vatAmount,
    periodTtc: totals.ttc,
    net,
  };
}

/**
 * Détecte si une période a déjà été facturée pour un contrat
 * (évite double facturation silencieuse).
 */
export function periodAlreadyInvoiced(params: {
  periodStart: Date;
  periodEnd: Date;
  existingPeriods: Array<{ periodStart: Date; periodEnd: Date }>;
}): boolean {
  const start = params.periodStart.getTime();
  const end = params.periodEnd.getTime();
  return params.existingPeriods.some((p) => {
    const ps = p.periodStart.getTime();
    const pe = p.periodEnd.getTime();
    // chevauchement
    return start < pe && end > ps;
  });
}
