import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
 * IDs du roster CRM :
 * - groupe `commerciaux`
 * - pack `commercial`
 * - tout owner d’au moins une opportunité (historique inclus)
 */
export async function commercialTeamUserIds(): Promise<string[]> {
  const [groupMembers, packUsers, dealOwners] = await Promise.all([
    prisma.groupMember.findMany({
      where: { group: { code: "commerciaux" } },
      select: { userId: true },
    }),
    prisma.userPack.findMany({
      where: { pack: { code: "commercial" } },
      select: { userId: true },
    }),
    prisma.crmOpportunity.groupBy({
      by: ["ownerId"],
    }),
  ]);

  return [
    ...new Set([
      ...groupMembers.map((m) => m.userId),
      ...packUsers.map((p) => p.userId),
      ...dealOwners.map((d) => d.ownerId),
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
 * - filter : opérations courantes — actifs / MDP requis uniquement
 * - team : Vue Équipe — + suspendus / archivés (historique)
 * - assign : cibles d’affectation / objectifs à écrire
 */
export type CommercialRosterMode = "filter" | "team" | "assign";

export async function listCommercialRoster(opts?: {
  mode?: CommercialRosterMode;
  /** Toujours inclus (ex. user courant), même hors statut du mode. */
  extraIds?: string[];
  /**
   * Mode filter uniquement : inclure suspendus/archivés (consultation).
   * Par défaut false — les filtres opérationnels restent propres.
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
    statusIn = opts?.includeInactive
      ? CRM_FILTER_HISTORICAL_STATUSES
      : CRM_FILTER_OPERATIONAL_STATUSES;
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

export function rosterToOwnerOptions(
  users: Pick<
    CommercialRosterUser,
    "id" | "firstName" | "lastName" | "status"
  >[],
): { value: string; label: string }[] {
  return users.map((u) => ({
    value: u.id,
    label: formatCollaboratorOptionLabel(u.firstName, u.lastName, u.status),
  }));
}

/**
 * Si l’URL cible un collab hors liste opérationnelle (ex. archivé),
 * l’injecte pour que le select / bandeau restent cohérents.
 */
export async function injectOwnerIfMissing(
  options: { value: string; label: string }[],
  ownerId: string | null | undefined,
): Promise<{ value: string; label: string }[]> {
  if (!ownerId || options.some((o) => o.value === ownerId)) return options;
  const u = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, firstName: true, lastName: true, status: true },
  });
  if (!u) return options;
  return [
    {
      value: u.id,
      label: formatCollaboratorOptionLabel(u.firstName, u.lastName, u.status),
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
