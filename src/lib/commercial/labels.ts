import type {
  ComInvoiceStatus,
  ComPaymentMethod,
  ComQuoteStatus,
} from "@prisma/client";

export const QUOTE_STATUS_LABELS: Record<ComQuoteStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
  ANNULE: "Annulé",
};

export const INVOICE_STATUS_LABELS: Record<ComInvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export const PAYMENT_METHOD_LABELS: Record<ComPaymentMethod, string> = {
  ESPECES: "Espèces",
  VIREMENT: "Virement",
  MOBILE_MONEY: "Mobile Money",
  AUTRE: "Autre",
};

export function formatComMoney(
  amount: number | null | undefined,
  currency: string = "XOF",
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  if (currency === "EUR") {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function normalizeClientName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
