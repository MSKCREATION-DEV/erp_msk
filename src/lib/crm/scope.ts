import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/rbac/resolve";
import { hasPermission } from "@/lib/rbac/resolve";

export type CrmVisibility = "own" | "team" | "global";

export function crmVisibility(user: SessionUser): CrmVisibility {
  if (
    user.isSuperAdmin ||
    hasPermission(user, "crm.reports.global") ||
    hasPermission(user, "crm.view_team")
  ) {
    // view_team sans global = team ; reports.global = global
    if (user.isSuperAdmin || hasPermission(user, "crm.reports.global")) {
      return "global";
    }
    return "team";
  }
  return "own";
}

/** Filtre Prisma sur ownerId pour org / deal / tâche. */
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
