import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Comptes utilisables pour affectation / objectifs. */
const ASSIGNABLE: UserStatus[] = ["ACTIVE", "MUST_CHANGE_PASSWORD"];

/** Filtres « Suivi par » : inclut archivés qui portent encore un portefeuille. */
const FILTERABLE: UserStatus[] = [
  "ACTIVE",
  "MUST_CHANGE_PASSWORD",
  "ARCHIVED",
];

/**
 * IDs du roster CRM :
 * - groupe `commerciaux`
 * - pack `commercial`
 * - tout owner d’au moins une opportunité (portefeuille importé inclus)
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

export type CommercialRosterMode = "filter" | "team" | "assign";

/**
 * Membres listables pour UI CRM.
 * - filter : Suivi par (archivés portefeuille inclus)
 * - team : Vue Équipe / Objectifs (actifs + invite + archivés avec deals)
 * - assign : cibles d’affectation (pas d’archivés)
 */
export async function listCommercialRoster(opts?: {
  mode?: CommercialRosterMode;
  /** Toujours inclus (ex. user courant). */
  extraIds?: string[];
}): Promise<CommercialRosterUser[]> {
  const mode = opts?.mode ?? "filter";
  const teamIds = await commercialTeamUserIds();
  const ids = [...new Set([...(opts?.extraIds ?? []), ...teamIds])];
  if (ids.length === 0) return [];

  const statusIn = mode === "assign" ? ASSIGNABLE : FILTERABLE;

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, status: { in: statusIn } },
    select: { id: true, firstName: true, lastName: true, status: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  if (mode === "assign") {
    return users;
  }

  if (mode === "team") {
    // Archivés sans portefeuille exclus (déjà hors teamIds sauf s’ils ont des deals).
    return users;
  }

  return users;
}

export function rosterToOwnerOptions(
  users: Pick<CommercialRosterUser, "id" | "firstName" | "lastName">[],
): { value: string; label: string }[] {
  return users.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
  }));
}
