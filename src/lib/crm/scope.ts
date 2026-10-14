import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/rbac/resolve";
import { hasPermission } from "@/lib/rbac/resolve";

export type CrmVisibility = "own" | "team" | "global";

/**
 * Visibilité « pilotage » (dashboard, Vue Équipe, KPIs perso).
 * Inchangé : commercial terrain = own ; lead = team ; direction = global.
 */
export function crmVisibility(user: SessionUser): CrmVisibility {
  if (
    user.isSuperAdmin ||
    hasPermission(user, "crm.reports.global") ||
    hasPermission(user, "crm.view_team")
  ) {
    if (user.isSuperAdmin || hasPermission(user, "crm.reports.global")) {
      return "global";
    }
    return "team";
  }
  return "own";
}

/**
 * LOT-E — liste / fiche prospects : lecture partagée.
 * Tout user avec `crm.access` voit tous les dossiers (anti-doublon terrain).
 */
export function crmProspectListScopeWhere(
  user: SessionUser,
): Prisma.CrmOpportunityWhereInput {
  if (user.isSuperAdmin || hasPermission(user, "crm.access")) {
    return {};
  }
  return { ownerId: user.id };
}

export function crmOrgListScopeWhere(
  user: SessionUser,
): Prisma.CrmOrganizationWhereInput {
  if (user.isSuperAdmin || hasPermission(user, "crm.access")) {
    return {};
  }
  return { ownerId: user.id };
}

/** Filtre Prisma sur ownerId pour dashboard / stats perso. */
export function ownerScopeWhere(
  user: SessionUser,
  teamUserIds: string[] = [],
): Prisma.CrmOrganizationWhereInput {
  const vis = crmVisibility(user);
  if (vis === "global") return {};
  if (vis === "team") {
    const ids = Array.from(new Set([user.id, ...teamUserIds]));
    return { ownerId: { in: ids } };
  }
  return { ownerId: user.id };
}

export function dealOwnerScopeWhere(
  user: SessionUser,
  teamUserIds: string[] = [],
): Prisma.CrmOpportunityWhereInput {
  const vis = crmVisibility(user);
  if (vis === "global") return {};
  if (vis === "team") {
    const ids = Array.from(new Set([user.id, ...teamUserIds]));
    return { ownerId: { in: ids } };
  }
  return { ownerId: user.id };
}

/**
 * LOT-E — écriture réservée à l’affecté (+ admin réassign / direction).
 * `crm.view_team` seul ne suffit plus pour muter.
 */
export function canMutateCrmDeal(
  actor: SessionUser,
  ownerId: string,
): boolean {
  if (actor.isSuperAdmin) return true;
  if (ownerId === actor.id) return true;
  if (hasPermission(actor, "crm.reassign")) return true;
  if (hasPermission(actor, "crm.reports.global")) return true;
  return false;
}

/** Peut changer le suivi (affectation). */
export function canReassignCrmDeal(actor: SessionUser): boolean {
  return (
    actor.isSuperAdmin || hasPermission(actor, "crm.reassign")
  );
}
