import type {
  RhAbsenceStatus,
  RhContractStatus,
  RhContractType,
  RhEmployeeStatus,
  RhEmployeeType,
  RhLeaveStatus,
  RhLeaveType,
  RhReglementStatus,
  RhTimesheetStatus,
} from "@prisma/client";

/** Tons compatibles avec `Badge` (@/components/ui/badge). */
export type BadgeTone = "blue" | "ink" | "coral" | "muted" | "success";

export const EMPLOYEE_TYPE_LABEL: Record<RhEmployeeType, string> = {
  SALARIE: "Salarié",
  STAGIAIRE: "Stagiaire",
  PRESTATAIRE: "Prestataire",
  DIRIGEANT: "Dirigeant",
  AUTRE: "Autre",
};

export const EMPLOYEE_STATUS_LABEL: Record<RhEmployeeStatus, string> = {
  ACTIVE: "Actif",
  ONBOARDING: "Onboarding",
  OFFBOARDING: "Offboarding",
  ARCHIVED: "Archivé",
};

export function employeeStatusTone(status: RhEmployeeStatus): BadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "ONBOARDING":
      return "blue";
    case "OFFBOARDING":
      return "coral";
    case "ARCHIVED":
      return "muted";
  }
}

export const REGLEMENT_STATUS_LABEL: Record<RhReglementStatus, string> = {
  PENDING: "En attente",
  SIGNED: "Signé",
  WAIVED: "Dispensé",
};

export function reglementStatusTone(status: RhReglementStatus): BadgeTone {
  switch (status) {
    case "SIGNED":
      return "success";
    case "WAIVED":
      return "muted";
    case "PENDING":
      return "coral";
  }
}

export const CONTRACT_TYPE_LABEL: Record<RhContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  PRESTA: "Prestation",
  AVENANT: "Avenant",
  AUTRE: "Autre",
};

export const CONTRACT_STATUS_LABEL: Record<RhContractStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  ENDED: "Terminé",
  CANCELLED: "Annulé",
};

export function contractStatusTone(status: RhContractStatus): BadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "ink";
    case "ENDED":
      return "muted";
    case "CANCELLED":
      return "coral";
  }
}

export const LEAVE_TYPE_LABEL: Record<RhLeaveType, string> = {
  CONGES_PAYES: "Congés payés",
  SANS_SOLDE: "Sans solde",
  EXCEPTIONNEL: "Exceptionnel",
  MALADIE: "Maladie",
  AUTRE: "Autre",
};

export const LEAVE_STATUS_LABEL: Record<RhLeaveStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  CANCELLED: "Annulé",
};

export function leaveStatusTone(status: RhLeaveStatus): BadgeTone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "blue";
    case "REJECTED":
      return "coral";
    case "CANCELLED":
      return "muted";
  }
}

export const ABSENCE_STATUS_LABEL: Record<RhAbsenceStatus, string> = {
  DECLARED: "Déclarée",
  JUSTIFIED: "Justifiée",
  UNJUSTIFIED: "Injustifiée",
};

export function absenceStatusTone(status: RhAbsenceStatus): BadgeTone {
  switch (status) {
    case "JUSTIFIED":
      return "success";
    case "DECLARED":
      return "blue";
    case "UNJUSTIFIED":
      return "coral";
  }
}

export const TIMESHEET_STATUS_LABEL: Record<RhTimesheetStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

export function timesheetStatusTone(status: RhTimesheetStatus): BadgeTone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "SUBMITTED":
      return "blue";
    case "REJECTED":
      return "coral";
    case "DRAFT":
      return "muted";
  }
}

/** Minutes → libellé "7h30". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export const WEEKDAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;
