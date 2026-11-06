import "server-only";

import type { UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  CRM_ASSIGNABLE_STATUSES,
  CRM_FILTER_HISTORICAL_STATUSES,
  CRM_FILTER_OPERATIONAL_STATUSES,
  formatCollaboratorOptionLabel,
  isOperationalCrmStatus,
} from "@/lib/crm/collaborator-status";

export {
  isOperationalCrmStatus,
  canReceiveCrmAssignment,
  canHaveOperationalGoals,
  isHistoricalCrmStatus,
  formatCollaboratorOptionLabel,
} from "@/lib/crm/collaborator-status";

/**
 * IDs du roster CRM (actifs + anciens ayant laissé une empreinte) :
 * - groupe `commerciaux`
 * - pack `commercial`
 * - owner / créateur d’au moins une opportunité
 * - acteur d’au moins une activité CRM
 * - assignee / créateur d’au moins une tâche CRM
 */
export async function commercialTeamUserIds(): Promise<string[]> {
  const [
    groupMembers,
    packUsers,
    dealOwners,
    dealCreators,
    activityActors,
    taskAssignees,
    taskCreators,
  ] = await runSeries([
    () =>
      prisma.groupMember.findMany({
        where: { group: { code: "commerciaux" } },
        select: { userId: true },
      }),
    () =>
      prisma.userPack.findMany({
        where: { pack: { code: "commercial" } },
        select: { userId: true },
      }),
    () => prisma.crmOpportunity.groupBy({ by: ["ownerId"] }),
    () => prisma.crmOpportunity.groupBy({ by: ["createdById"] }),
    () => prisma.crmActivity.groupBy({ by: ["actorId"] }),
    () => prisma.crmTask.groupBy({ by: ["assigneeId"] }),
    () => prisma.crmTask.groupBy({ by: ["createdById"] }),
  ]);

  return [
    ...new Set([
      ...groupMembers.map((m) => m.userId),
      ...packUsers.map((p) => p.userId),
      ...dealOwners.map((d) => d.ownerId),
      ...dealCreators.map((d) => d.createdById),
      ...activityActors.map((a) => a.actorId),
      ...taskAssignees.map((t) => t.assigneeId),
      ...taskCreators.map((t) => t.createdById),
    ]),
  ];
}

export type CommercialRosterUser = {
  id: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
};

/**
 * - filter : consultation data (prospects, TB, rapports…) — actifs + archivés
 *   ayant une empreinte CRM ; libellé « (Archivé) ». Passer
 *   `includeInactive: false` pour un filtre opérationnel strict.
 * - team : Vue Équipe — actifs + historiques (carte dédiée pour inactifs)
 * - assign : cibles d’affectation / objectifs à écrire — actifs seulement
 */
export type CommercialRosterMode = "filter" | "team" | "assign";

export async function listCommercialRoster(opts?: {
  mode?: CommercialRosterMode;
  /** Toujours inclus (ex. user courant), même hors statut du mode. */
  extraIds?: string[];
  /**
   * Mode filter uniquement.
   * Défaut `true` : inclure suspendus/archivés pour filtrer l’historique.
   * `false` : actifs / MDP requis seulement (ex. écrans purement opérationnels).
   */
  includeInactive?: boolean;
}): Promise<CommercialRosterUser[]> {
  const mode = opts?.mode ?? "filter";
  const teamIds = await commercialTeamUserIds();
  const ids = [...new Set([...(opts?.extraIds ?? []), ...teamIds])];
  if (ids.length === 0) return [];

  let statusIn: UserStatus[];
  if (mode === "assign") {
    statusIn = CRM_ASSIGNABLE_STATUSES;
  } else if (mode === "team") {
    statusIn = CRM_FILTER_HISTORICAL_STATUSES;
  } else {
    statusIn =
      opts?.includeInactive === false
        ? CRM_FILTER_OPERATIONAL_STATUSES
        : CRM_FILTER_HISTORICAL_STATUSES;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, status: { in: statusIn } },
    select: { id: true, firstName: true, lastName: true, status: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  // Opérationnels d’abord, puis historiques
  return users.sort((a, b) => {
    const ao = isOperationalCrmStatus(a.status) ? 0 : 1;
    const bo = isOperationalCrmStatus(b.status) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
      "fr",
    );
  });
}

export type CommercialOwnerOption = {
  value: string;
  label: string;
  status: UserStatus;
  /** true = suspendu / archivé (consultation historique). */
  historical: boolean;
  description?: string;
};

export function rosterToOwnerOptions(
  users: Pick<
    CommercialRosterUser,
    "id" | "firstName" | "lastName" | "status"
  >[],
): CommercialOwnerOption[] {
  return users.map((u) => {
    const historical = !isOperationalCrmStatus(u.status);
    return {
      value: u.id,
      label: formatCollaboratorOptionLabel(u.firstName, u.lastName, u.status),
      status: u.status,
      historical,
      description: historical ? "Ancien collaborateur — consultation" : undefined,
    };
  });
}

/**
 * Si l’URL cible un collab hors liste opérationnelle (ex. archivé),
 * l’injecte pour que le select / bandeau restent cohérents.
 */
export async function injectOwnerIfMissing(
  options: CommercialOwnerOption[],
  ownerId: string | null | undefined,
): Promise<CommercialOwnerOption[]> {
  if (!ownerId || options.some((o) => o.value === ownerId)) return options;
  const u = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, firstName: true, lastName: true, status: true },
  });
  if (!u) return options;
  const historical = !isOperationalCrmStatus(u.status);
  return [
    {
      value: u.id,
      label: formatCollaboratorOptionLabel(u.firstName, u.lastName, u.status),
      status: u.status,
      historical,
      description: historical
        ? "Ancien collaborateur — consultation"
        : undefined,
    },
    ...options,
  ];
}

/** Charge le statut d’un collaborateur (null si inconnu). */
export async function loadCollaboratorStatus(
  userId: string,
): Promise<UserStatus | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  return u?.status ?? null;
}
