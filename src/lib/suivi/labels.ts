import type {
  SvAbsenceReason,
  SvAbsenceStatus,
  SvExpenseCategory,
  SvInvoiceStatus,
  SvLateStatus,
} from "@/generated/prisma/client";
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

/** Libellés charges (factures internes) — EMISE = à payer côté fournisseur. */
export const SV_EXPENSE_STATUS_LABEL: Record<SvInvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Non payée",
  PARTIELLE: "Partielle",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export const SV_EXPENSE_STATUS_TONE: Record<SvInvoiceStatus, BadgeTone> =
  SV_INVOICE_STATUS_TONE;

export const SV_EXPENSE_CATEGORY_LABEL: Record<SvExpenseCategory, string> = {
  ORANGE_INTERNET: "Wi‑Fi / Internet Orange",
  EDM_ELECTRICITE: "EDM électricité",
  LOYER: "Location appartement",
  AUTRE: "Autre charge",
};

export const SV_EXPENSE_CATEGORY_OPTIONS: {
  value: SvExpenseCategory;
  label: string;
}[] = (
  Object.keys(SV_EXPENSE_CATEGORY_LABEL) as SvExpenseCategory[]
).map((value) => ({
  value,
  label: SV_EXPENSE_CATEGORY_LABEL[value],
}));

export function formatSvXof(amount: number | null | undefined): string {
  const n = amount ?? 0;
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(n) + " F"
  );
}

export const SV_ABSENCE_REASON_LABEL: Record<SvAbsenceReason, string> = {
  MALADIE: "Maladie",
  PERSONNEL: "Personnel",
  AUTORISEE: "Autorisée",
  FORMATION: "Formation",
  AUTRE: "Autre",
};

export const SV_ABSENCE_REASON_OPTIONS: {
  value: SvAbsenceReason;
  label: string;
}[] = (Object.keys(SV_ABSENCE_REASON_LABEL) as SvAbsenceReason[]).map(
  (value) => ({ value, label: SV_ABSENCE_REASON_LABEL[value] }),
);

export const SV_ABSENCE_STATUS_LABEL: Record<SvAbsenceStatus, string> = {
  ENREGISTREE: "Enregistrée",
  JUSTIFIEE: "Justifiée",
  NON_JUSTIFIEE: "Non justifiée",
  ANNULEE: "Annulée",
};

export const SV_ABSENCE_STATUS_TONE: Record<SvAbsenceStatus, BadgeTone> = {
  ENREGISTREE: "blue",
  JUSTIFIEE: "success",
  NON_JUSTIFIEE: "coral",
  ANNULEE: "ink",
};

export const SV_LATE_STATUS_LABEL: Record<SvLateStatus, string> = {
  ENREGISTRE: "Enregistré",
  ANNULE: "Annulé",
};

export const SV_LATE_STATUS_TONE: Record<SvLateStatus, BadgeTone> = {
  ENREGISTRE: "coral",
  ANNULE: "ink",
};
