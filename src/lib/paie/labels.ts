import type { RhPayrollPeriodStatus, RhPayslipStatus } from "@prisma/client";
import type { BadgeTone } from "@/lib/rh/labels";

export const PERIOD_STATUS_LABEL: Record<RhPayrollPeriodStatus, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouverte",
  CALCULATED: "Calculée",
  APPROVED: "Approuvée",
  CLOSED: "Clôturée",
};

export function periodStatusTone(s: RhPayrollPeriodStatus): BadgeTone {
  switch (s) {
    case "APPROVED":
      return "success";
    case "CALCULATED":
      return "blue";
    case "CLOSED":
      return "muted";
    default:
      return "ink";
  }
}

export const PAYSLIP_STATUS_LABEL: Record<RhPayslipStatus, string> = {
  DRAFT: "Brouillon",
  CALCULATED: "Calculé",
  APPROVED: "Approuvé",
  PAID: "Payé",
  CANCELLED: "Annulé",
};

export function monthLabel(month: number) {
  return new Date(2026, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
  });
}
