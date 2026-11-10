import type { SvInvoiceStatus } from "@/generated/prisma/client";
import type { BadgeTone } from "@/components/ui/badge";

export const SV_INVOICE_STATUS_LABEL: Record<SvInvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PARTIELLE: "Partielle",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export const SV_INVOICE_STATUS_TONE: Record<SvInvoiceStatus, BadgeTone> = {
  BROUILLON: "muted",
  EMISE: "blue",
  PARTIELLE: "coral",
  PAYEE: "success",
  ANNULEE: "ink",
};

export function formatSvXof(amount: number | null | undefined): string {
  const n = amount ?? 0;
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(n) + " F"
  );
}
