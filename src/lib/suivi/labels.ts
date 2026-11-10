import type { SvInvoiceStatus } from "@/generated/prisma/client";

export const SV_INVOICE_STATUS_LABEL: Record<SvInvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PARTIELLE: "Partielle",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export const SV_INVOICE_STATUS_TONE: Record<
  SvInvoiceStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  BROUILLON: "neutral",
  EMISE: "info",
  PARTIELLE: "warning",
  PAYEE: "success",
  ANNULEE: "danger",
};

export function formatSvXof(amount: number | null | undefined): string {
  const n = amount ?? 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n) + " F";
}
