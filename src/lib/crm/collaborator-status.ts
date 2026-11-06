import type { UserStatus } from "@/generated/prisma/client";
import { USER_STATUS_LABEL } from "@/lib/users/status";

/**
 * Règles métier communes — statut collaborateur CRM.
 * Source unique pour filtres, objectifs, affectations, Vue Équipe.
 */

/** Peut recevoir une nouvelle affectation / objectifs opérationnels. */
export function isOperationalCrmStatus(status: UserStatus): boolean {
  return status === "ACTIVE" || status === "MUST_CHANGE_PASSWORD";
}

/** Alias métier explicite. */
export function canReceiveCrmAssignment(status: UserStatus): boolean {
  return isOperationalCrmStatus(status);
}

/** Objectifs opérationnels « actuels » (pas historique). */
export function canHaveOperationalGoals(status: UserStatus): boolean {
  return isOperationalCrmStatus(status);
}

/** Suspendu ou archivé — consultation historique uniquement. */
export function isHistoricalCrmStatus(status: UserStatus): boolean {
  return status === "SUSPENDED" || status === "ARCHIVED";
}

export function collaboratorStatusLabel(status: UserStatus): string {
  return USER_STATUS_LABEL[status] ?? status;
}

/** Libellé select / filtre : « Prénom Nom (Archivé) » si inactif. */
export function formatCollaboratorOptionLabel(
  firstName: string,
  lastName: string,
  status: UserStatus,
): string {
  const name = `${firstName} ${lastName}`.trim();
  if (isOperationalCrmStatus(status)) return name;
  return `${name} (${collaboratorStatusLabel(status)})`;
}

export const CRM_ASSIGNABLE_STATUSES: UserStatus[] = [
  "ACTIVE",
  "MUST_CHANGE_PASSWORD",
];

/** Affectations / objectifs à écrire = assignables. */
export const CRM_FILTER_OPERATIONAL_STATUSES: UserStatus[] =
  CRM_ASSIGNABLE_STATUSES;

/**
 * Consultation (filtres prospects / TB / rapports / Vue Équipe) :
 * actifs + suspendus / archivés — libellé « (Archivé) ».
 */
export const CRM_FILTER_HISTORICAL_STATUSES: UserStatus[] = [
  "ACTIVE",
  "MUST_CHANGE_PASSWORD",
  "SUSPENDED",
  "ARCHIVED",
];
