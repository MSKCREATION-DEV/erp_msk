import { assertMoneyInt, moneySum, type MoneyInt } from "./money";

export type AllocationInput = {
  paymentId: string;
  invoiceId: string;
  amount: MoneyInt;
};

export type InvoiceBalanceInput = {
  invoiceId: string;
  totalTtc: MoneyInt;
  /** Avoirs déjà imputés sur cette facture (positif = réduction) */
  creditNotesApplied?: MoneyInt;
  allocations: AllocationInput[];
};

export type InvoiceBalance = {
  invoiceId: string;
  totalTtc: MoneyInt;
  creditNotesApplied: MoneyInt;
  allocated: MoneyInt;
  /** max(0, ttc - credits - allocated) */
  openBalance: MoneyInt;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
};

export function computeInvoiceBalance(input: InvoiceBalanceInput): InvoiceBalance {
  const totalTtc = assertMoneyInt(input.totalTtc, "totalTtc");
  const creditNotesApplied = assertMoneyInt(
    input.creditNotesApplied ?? 0,
    "creditNotesApplied",
  );
  const allocated = moneySum(
    input.allocations
      .filter((a) => a.invoiceId === input.invoiceId)
      .map((a) => assertMoneyInt(a.amount, "allocation")),
  );
  const openBalance = Math.max(0, totalTtc - creditNotesApplied - allocated);
  return {
    invoiceId: input.invoiceId,
    totalTtc,
    creditNotesApplied,
    allocated,
    openBalance,
    isFullyPaid: openBalance === 0 && totalTtc - creditNotesApplied > 0,
    isPartiallyPaid:
      allocated > 0 && openBalance > 0 && totalTtc - creditNotesApplied > 0,
  };
}

/**
 * Répartit un paiement sur des factures (ordre fourni).
 * Retourne les allocations + reliquat non affecté (crédit client).
 */
export function allocatePaymentFifo(params: {
  paymentId: string;
  paymentAmount: MoneyInt;
  /** Factures ouvertes, ordonnées (ex. plus anciennes d’abord) */
  openInvoices: Array<{ invoiceId: string; openBalance: MoneyInt }>;
}): { allocations: AllocationInput[]; unallocated: MoneyInt } {
  let remaining = assertMoneyInt(params.paymentAmount, "paymentAmount");
  if (remaining < 0) {
    throw new Error("paymentAmount must be >= 0");
  }
  const allocations: AllocationInput[] = [];
  for (const inv of params.openInvoices) {
    if (remaining <= 0) break;
    const open = assertMoneyInt(inv.openBalance, "openBalance");
    if (open <= 0) continue;
    const take = Math.min(remaining, open);
    allocations.push({
      paymentId: params.paymentId,
      invoiceId: inv.invoiceId,
      amount: take,
    });
    remaining -= take;
  }
  return { allocations, unallocated: remaining };
}

export function assertAllocationsWithinPayment(
  paymentAmount: MoneyInt,
  allocations: AllocationInput[],
): void {
  const total = moneySum(allocations.map((a) => a.amount));
  if (total > assertMoneyInt(paymentAmount, "paymentAmount")) {
    throw new Error(
      `Allocations (${total}) exceed payment amount (${paymentAmount})`,
    );
  }
}
