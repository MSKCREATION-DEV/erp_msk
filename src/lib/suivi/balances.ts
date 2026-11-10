import type { SvInvoiceStatus } from "@/generated/prisma/client";

export type InvoiceBalanceInput = {
  totalTtc: number;
  amountPaid: number;
  status: SvInvoiceStatus;
  dueAt?: Date | null;
  issuedAt?: Date | null;
};

const ACTIVE: SvInvoiceStatus[] = ["BROUILLON", "EMISE", "PARTIELLE", "PAYEE"];

/** Soldes dérivés — pas de double écriture inventée. */
export function clientBalance(invoices: InvoiceBalanceInput[]) {
  const active = invoices.filter((i) => i.status !== "ANNULEE");
  const totale = active.reduce((s, i) => s + i.totalTtc, 0);
  const paye = active.reduce((s, i) => s + i.amountPaid, 0);
  const restant = totale - paye;

  const now = Date.now();
  const aVenir = active
    .filter((i) => {
      if (i.status === "BROUILLON") return true;
      if (i.dueAt && i.dueAt.getTime() > now && i.amountPaid < i.totalTtc) {
        return true;
      }
      return false;
    })
    .reduce((s, i) => s + Math.max(0, i.totalTtc - i.amountPaid), 0);

  return { totale, paye, restant, aVenir };
}

export function invoiceReste(invoice: {
  totalTtc: number;
  amountPaid: number;
}): number {
  return Math.max(0, invoice.totalTtc - invoice.amountPaid);
}

export function deriveInvoiceStatus(
  totalTtc: number,
  amountPaid: number,
  current: SvInvoiceStatus,
): SvInvoiceStatus {
  if (current === "ANNULEE" || current === "BROUILLON") return current;
  if (amountPaid <= 0) return "EMISE";
  if (amountPaid >= totalTtc) return "PAYEE";
  return "PARTIELLE";
}

export function isActiveInvoiceStatus(status: SvInvoiceStatus): boolean {
  return ACTIVE.includes(status);
}
