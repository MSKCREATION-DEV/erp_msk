import type { UserStatus } from "@/generated/prisma/client";

/**
 * Session applicative + helpers purs — safe client (pas d’import Prisma runtime).
 * La résolution DB vit dans `resolve.ts` (server-only).
 */
export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  permissions: Set<string>;
  groupCodes: string[];
  /** Packs issus des groupes (pack défaut) + packs directs — union. */
  packCodes: string[];
  /** Packs assignés directement (user_packs), hors héritage groupe. */
  directPackCodes: string[];
  /** Packs défaut des groupes d’appartenance. */
  groupPackCodes: string[];
};

export function hasPermission(user: SessionUser, code: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.permissions.has(code);
}

export function hasAnyPermission(user: SessionUser, codes: string[]): boolean {
  return codes.some((c) => hasPermission(user, c));
}
