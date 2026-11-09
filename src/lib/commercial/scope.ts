import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/rbac/resolve";
import { hasPermission } from "@/lib/rbac/resolve";

export type ComVisibility = "own" | "global";

/**
 * Comptabilité = source de vérité facturation/paiements/devis : accès
 * **global** (tous clients, pas périmètre équipe commerciale), au même titre
 * que Direction / reports globaux. Cf. ownership Compta (devis/factures/paiements).
 */
export function comVisibility(user: SessionUser): ComVisibility {
  if (
    user.isSuperAdmin ||
    hasPermission(user, "com.reports.view") ||
    hasPermission(user, "cpt.access")
  ) {
    return "global";
  }
  return "own";
}

/**
 * Liste / agrégation clients : périmètre **équipe commerciale** pour qui a
 * `com.clients.view_own` / `com.clients.manage`, pas « mes clients » seuls.
 */
export function comClientListScopeWhere(
  user: SessionUser,
  teamMemberIds: string[],
): Prisma.ComClientWhereInput {
  if (comVisibility(user) === "global") {
    return {};
  }
  const ids = [...new Set(teamMemberIds.filter(Boolean))];
  return ids.length > 0 ? { ownerId: { in: ids } } : { ownerId: user.id };
}

export function comOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComClientWhereInput {
  return comClientListScopeWhere(user, [user.id]);
}

/**
 * Devis / factures / contrats : accès si on peut **muter** le client lié
 * (équipe commerciale partagée + global COM), sinon fichier « créateur ».
 */
export function comQuoteScopeWhere(
  user: SessionUser,
  teamMemberIds: string[],
): Prisma.ComQuoteWhereInput {
  const clientScope = comClientListScopeWhere(user, teamMemberIds);
  if (Object.keys(clientScope).length === 0) {
    return {};
  }
  return {
    OR: [{ client: clientScope }, { ownerId: user.id }],
  };
}

export function comInvoiceScopeWhere(
  user: SessionUser,
  teamMemberIds: string[],
): Prisma.ComInvoiceWhereInput {
  const clientScope = comClientListScopeWhere(user, teamMemberIds);
  if (Object.keys(clientScope).length === 0) {
    return {};
  }
  return {
    OR: [{ client: clientScope }, { ownerId: user.id }],
  };
}

export function comContractScopeWhere(
  user: SessionUser,
  teamMemberIds: string[],
): Prisma.ComContractWhereInput {
  const clientScope = comClientListScopeWhere(user, teamMemberIds);
  if (Object.keys(clientScope).length === 0) {
    return {};
  }
  return {
    OR: [{ client: clientScope }, { ownerId: user.id }],
  };
}

/** @deprecated Préférer `comQuoteScopeWhere` + `commercialTeamUserIds`. */
export function comQuoteOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComQuoteWhereInput {
  return comQuoteScopeWhere(user, [user.id]);
}

/** @deprecated Préférer `comInvoiceScopeWhere` + `commercialTeamUserIds`. */
export function comInvoiceOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComInvoiceWhereInput {
  return comInvoiceScopeWhere(user, [user.id]);
}

/** @deprecated Préférer `comContractScopeWhere` + `commercialTeamUserIds`. */
export function comContractOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComContractWhereInput {
  return comContractScopeWhere(user, [user.id]);
}

/**
 * Lecture / écriture sur la **fiche client** (owner = Suivi par) : partagée équipe.
 */
export function canAccessClient(
  user: SessionUser,
  clientOwnerId: string,
  teamMemberIds: string[],
): boolean {
  if (comVisibility(user) === "global") return true;
  const set = new Set([user.id, ...teamMemberIds]);
  return set.has(clientOwnerId);
}

/**
 * Mutation documents COM rattachés à un client : même règle que la fiche client.
 */
export function canAccessComDocForClient(
  user: SessionUser,
  clientOwnerId: string,
  teamMemberIds: string[],
  documentOwnerId: string,
): boolean {
  if (canAccessClient(user, clientOwnerId, teamMemberIds)) return true;
  return documentOwnerId === user.id;
}

/** Alias historique — accès ressource « propriétaire commercial » (devis/fac). */
export function canAccessOwned(
  user: SessionUser,
  ownerId: string,
): boolean {
  return comVisibility(user) === "global" || ownerId === user.id;
}

/** Muter un client : permission + client dans le périmètre équipe. */
export function canMutateClient(
  user: SessionUser,
  clientOwnerId: string,
  teamMemberIds: string[],
): boolean {
  return canAccessClient(user, clientOwnerId, teamMemberIds);
}
