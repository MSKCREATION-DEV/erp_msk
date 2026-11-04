import { computeAging, type AgingSummary } from "./ar-aging";
import { computeInvoiceBalance } from "./allocations";
import type { MoneyInt } from "./money";

export type ClientInvoiceInput = {
  id: string;
  status: string;
  totalTtc: MoneyInt;
  amountPaid: MoneyInt;
  dueDate: Date | null;
  issuedAt: Date | null;
  createdAt: Date;
  allocations: Array<{ paymentId: string; invoiceId: string; amount: number }>;
  creditNotesApplied: MoneyInt;
};

export type ClientPaymentInput = {
  id: string;
  amount: MoneyInt;
  paidAt: Date;
  allocationsSum: MoneyInt;
};

export type ClientFinancialSnapshot = {
  totalInvoiced: MoneyInt;
  totalPaidAllocated: MoneyInt;
  openReceivable: MoneyInt;
  overdueAmount: MoneyInt;
  unpaidCount: number;
  paidCount: number;
  partialCount: number;
  unallocatedCredit: MoneyInt;
  lastPaymentAt: Date | null;
  nextDueDate: Date | null;
  aging: AgingSummary;
};

const OPEN_STATUSES = new Set([
  "EMISE",
  "ENVOYEE",
  "PARTIELLEMENT_PAYEE",
  "EN_RETARD",
]);

export function computeClientFinancials(params: {
  invoices: ClientInvoiceInput[];
  payments: ClientPaymentInput[];
  asOf?: Date;
}): ClientFinancialSnapshot {
  const asOf = params.asOf ?? new Date();
  let totalInvoiced = 0;
  let totalPaidAllocated = 0;
  let openReceivable = 0;
  let overdueAmount = 0;
  let unpaidCount = 0;
  let paidCount = 0;
  let partialCount = 0;
  let nextDueDate: Date | null = null;

  const agingInvoices: Array<{
    invoiceId: string;
    openBalance: number;
    dueDate: Date;
  }> = [];

  for (const inv of params.invoices) {
    if (inv.status === "ANNULEE" || inv.status === "BROUILLON") continue;
    totalInvoiced += inv.totalTtc;

    const bal = computeInvoiceBalance({
      invoiceId: inv.id,
      totalTtc: inv.totalTtc,
      creditNotesApplied: inv.creditNotesApplied,
      allocations: inv.allocations,
    });
    totalPaidAllocated += bal.allocated;

    if (inv.status === "PAYEE" || bal.openBalance === 0) {
      paidCount += 1;
      continue;
    }
    if (OPEN_STATUSES.has(inv.status) || bal.openBalance > 0) {
      openReceivable += bal.openBalance;
      unpaidCount += 1;
      if (bal.isPartiallyPaid) partialCount += 1;

      const due =
        inv.dueDate ?? inv.issuedAt ?? inv.createdAt;
      agingInvoices.push({
        invoiceId: inv.id,
        openBalance: bal.openBalance,
        dueDate: due,
      });
      if (due < asOf) overdueAmount += bal.openBalance;
      if (!nextDueDate || due < nextDueDate) nextDueDate = due;
    }
  }

  let unallocatedCredit = 0;
  let lastPaymentAt: Date | null = null;
  for (const p of params.payments) {
    unallocatedCredit += Math.max(0, p.amount - p.allocationsSum);
    if (!lastPaymentAt || p.paidAt > lastPaymentAt) lastPaymentAt = p.paidAt;
  }

  return {
    totalInvoiced,
    totalPaidAllocated,
    openReceivable,
    overdueAmount,
    unpaidCount,
    paidCount,
    partialCount,
    unallocatedCredit,
    lastPaymentAt,
    nextDueDate,
    aging: computeAging(agingInvoices, asOf),
  };
}
