import { assertMoneyInt, type MoneyInt } from "./money";

export type AgingBucket = "0_30" | "31_60" | "61_90" | "90_PLUS";

export type AgingInvoice = {
  invoiceId: string;
  openBalance: MoneyInt;
  /** Date d’échéance (ou émission si pas d’échéance) */
  dueDate: Date;
};

export type AgingRow = {
  invoiceId: string;
  openBalance: MoneyInt;
  daysPastDue: number;
  bucket: AgingBucket;
};

export type AgingSummary = {
  rows: AgingRow[];
  byBucket: Record<AgingBucket, MoneyInt>;
  totalOpen: MoneyInt;
};

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function agingBucket(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 30) return "0_30";
  if (daysPastDue <= 60) return "31_60";
  if (daysPastDue <= 90) return "61_90";
  return "90_PLUS";
}

export function computeAging(
  invoices: AgingInvoice[],
  asOf: Date = new Date(),
): AgingSummary {
  const byBucket: Record<AgingBucket, MoneyInt> = {
    "0_30": 0,
    "31_60": 0,
    "61_90": 0,
    "90_PLUS": 0,
  };
  const rows: AgingRow[] = [];
  let totalOpen = 0;

  for (const inv of invoices) {
    const open = assertMoneyInt(inv.openBalance, "openBalance");
    if (open <= 0) continue;
    const daysPastDue = Math.max(0, daysBetween(inv.dueDate, asOf));
    const bucket = agingBucket(daysPastDue);
    rows.push({
      invoiceId: inv.invoiceId,
      openBalance: open,
      daysPastDue,
      bucket,
    });
    byBucket[bucket] += open;
    totalOpen += open;
  }

  return { rows, byBucket, totalOpen };
}
