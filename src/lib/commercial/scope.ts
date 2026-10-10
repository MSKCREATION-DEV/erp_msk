import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/rbac/resolve";
import { hasPermission } from "@/lib/rbac/resolve";

export type ComVisibility = "own" | "global";

export function comVisibility(user: SessionUser): ComVisibility {
  if (
    user.isSuperAdmin ||
    hasPermission(user, "com.reports.view")
  ) {
    return "global";
  }
  return "own";
}

export function comOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComClientWhereInput {
  return comVisibility(user) === "global" ? {} : { ownerId: user.id };
}

export function comQuoteOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComQuoteWhereInput {
  return comVisibility(user) === "global" ? {} : { ownerId: user.id };
}

export function comInvoiceOwnerScopeWhere(
  user: SessionUser,
): Prisma.ComInvoiceWhereInput {
  return comVisibility(user) === "global" ? {} : { ownerId: user.id };
}

export function canAccessOwned(
  user: SessionUser,
  ownerId: string,
): boolean {
  return comVisibility(user) === "global" || ownerId === user.id;
}
