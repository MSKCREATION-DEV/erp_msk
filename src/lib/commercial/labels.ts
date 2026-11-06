import type {
  ComContractFamily,
  ComInvoiceStatus,
  ComPaymentMethod,
  ComQuoteStatus,
  ComServiceKind,
} from "@/generated/prisma/client";

/** Analyse contrats §6.1 — libellés famille document. */
export const CONTRACT_FAMILY_LABELS: Record<ComContractFamily, string> = {
  PRESTATION_ABONNEMENT: "Prestation / abonnement",
  ENGAGEMENT_CDC: "Engagement / cahier des charges",
};

/** Analyse contrats §6.1 — libellés nature de prestation. */
export const SERVICE_KIND_LABELS: Record<ComServiceKind, string> = {
  RESEAUX_SOCIAUX: "Réseaux sociaux",
  APPLICATION_WEB: "Application web",
  SITE_VITRINE: "Site vitrine",
  CHARTE_GRAPHIQUE: "Charte graphique",
  AUTRE: "Autre",
  BUNDLE: "Multi-prestations (bundle)",
};

/** Famille document attendue par défaut pour une nature de prestation. */
export const SERVICE_KIND_DEFAULT_FAMILY: Record<
  ComServiceKind,
  ComContractFamily
> = {
  RESEAUX_SOCIAUX: "PRESTATION_ABONNEMENT",
  APPLICATION_WEB: "ENGAGEMENT_CDC",
  SITE_VITRINE: "ENGAGEMENT_CDC",
  CHARTE_GRAPHIQUE: "ENGAGEMENT_CDC",
  AUTRE: "PRESTATION_ABONNEMENT",
  BUNDLE: "ENGAGEMENT_CDC",
};

export const QUOTE_STATUS_LABELS: Record<ComQuoteStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émis",
  ENVOYE: "Envoyé",
  CONSULTE: "Consulté",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
  ANNULE: "Annulé",
};

export const INVOICE_STATUS_LABELS: Record<ComInvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  ENVOYEE: "Envoyée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
  AVOIREE: "Avoirée",
};

export const PAYMENT_METHOD_LABELS: Record<ComPaymentMethod, string> = {
  ESPECES: "Espèces",
  VIREMENT: "Virement",
  ORANGE_MONEY: "Orange Money",
  WAVE: "Wave",
  MOBILE_MONEY: "Mobile Money",
  CHEQUE: "Chèque",
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

export type ComBadgeTone = "muted" | "success" | "coral" | "blue";

export function quoteStatusTone(status: string): ComBadgeTone {
  if (status === "ACCEPTE") return "success";
  if (status === "REFUSE" || status === "ANNULE") return "coral";
  if (status === "ENVOYE" || status === "EMISE" || status === "CONSULTE") {
    return "blue";
  }
  return "muted";
}

export function invoiceStatusTone(status: string): ComBadgeTone {
  if (status === "PAYEE") return "success";
  if (status === "ANNULEE" || status === "EN_RETARD") return "coral";
  if (
    status === "EMISE" ||
    status === "ENVOYEE" ||
    status === "PARTIELLEMENT_PAYEE" ||
    status === "AVOIREE"
  ) {
    return "blue";
  }
  return "muted";
}
