import { OverrideEffect, type UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  packCodes: string[];
};

const userInclude = {
  groupMembers: { include: { group: true } },
  userPacks: { include: { pack: true } },
  overrides: { include: { permission: true } },
} as const;

/**
 * Résolution RBAC :
 * union(packs directs) ∪ union(packs défaut des groupes) ∪ GRANT − DENY
 * Super Admin → toutes les permissions catalogue en base.
 */
export async function resolveUserPermissions(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  if (!user) return null;

  const groupCodes = [...new Set(user.groupMembers.map((m) => m.group.code))];
  const packIds = new Set(user.userPacks.map((p) => p.packId));

  for (const membership of user.groupMembers) {
    if (membership.group.defaultPackId) {
      packIds.add(membership.group.defaultPackId);
    }
  }

  const packCodeSet = new Set(user.userPacks.map((p) => p.pack.code));
  const groupDefaultPacks = await prisma.group.findMany({
    where: {
      id: { in: user.groupMembers.map((m) => m.groupId) },
      defaultPackId: { not: null },
    },
    include: { defaultPack: true },
  });
  for (const g of groupDefaultPacks) {
    if (g.defaultPack) packCodeSet.add(g.defaultPack.code);
  }
  const packCodes = [...packCodeSet];

  let permissionCodes = new Set<string>();

  if (user.isSuperAdmin) {
    const all = await prisma.permission.findMany({ select: { code: true } });
    permissionCodes = new Set(all.map((p) => p.code));
  } else if (packIds.size > 0) {
    const packPerms = await prisma.packPermission.findMany({
      where: { packId: { in: [...packIds] } },
      include: { permission: true },
    });
    for (const pp of packPerms) {
      permissionCodes.add(pp.permission.code);
    }
  }

  for (const ov of user.overrides) {
    if (ov.effect === OverrideEffect.GRANT) {
      permissionCodes.add(ov.permission.code);
    } else {
      permissionCodes.delete(ov.permission.code);
    }
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    isSuperAdmin: user.isSuperAdmin,
    mustChangePassword: user.mustChangePassword,
    permissions: permissionCodes,
    groupCodes,
    packCodes,
  };
}

export function hasPermission(user: SessionUser, code: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.permissions.has(code);
}

export function hasAnyPermission(user: SessionUser, codes: string[]): boolean {
  return codes.some((c) => hasPermission(user, c));
}
