import type { Prisma } from "@/generated/prisma/client";

/**
 * Filtre Prisma des utilisateurs ayant effectivement une permission.
 * Aligné sur `resolveUserPermissions` : packs directs + packs défaut de groupe
 * + GRANT, hors DENY. `permissionId` = FK cuid (jamais le code métier).
 * Safe hors server-only (types Prisma uniquement).
 */
export function usersWithPermissionWhere(
  permissionId: string,
): Prisma.UserWhereInput {
  const viaPack: Prisma.PermissionPackWhereInput = {
    permissions: { some: { permissionId } },
  };
  return {
    archivedAt: null,
    status: { in: ["ACTIVE", "MUST_CHANGE_PASSWORD", "INVITE_PENDING"] },
    NOT: {
      overrides: {
        some: { permissionId, effect: "DENY" },
      },
    },
    OR: [
      { isSuperAdmin: true },
      {
        userPacks: {
          some: { pack: viaPack },
        },
      },
      {
        groupMembers: {
          some: {
            group: {
              defaultPack: viaPack,
            },
          },
        },
      },
      {
        overrides: {
          some: { permissionId, effect: "GRANT" },
        },
      },
    ],
  };
}
