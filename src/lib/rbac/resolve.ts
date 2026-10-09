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

/**
 * Résolution RBAC en **une seule query** Prisma.
 * Super Admin : pas de fetch catalogue (hasPermission court-circuite déjà).
 */
export async function resolveUserPermissions(
  userId: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      isSuperAdmin: true,
      mustChangePassword: true,
      groupMembers: {
        select: {
          group: {
            select: {
              code: true,
              defaultPack: { select: { id: true, code: true } },
            },
          },
        },
      },
      userPacks: {
        select: {
          pack: {
            select: {
              id: true,
              code: true,
              permissions: {
                select: { permission: { select: { code: true } } },
              },
            },
          },
        },
      },
      overrides: {
        select: {
          effect: true,
          permission: { select: { code: true } },
        },
      },
    },
  });
  if (!user) return null;

  const groupCodes = [...new Set(user.groupMembers.map((m) => m.group.code))];
  const packCodes = new Set(user.userPacks.map((p) => p.pack.code));
  for (const m of user.groupMembers) {
    if (m.group.defaultPack) packCodes.add(m.group.defaultPack.code);
  }

  // Super Admin : pas besoin de charger 60+ permissions — le gate utilise isSuperAdmin
  if (user.isSuperAdmin) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      isSuperAdmin: true,
      mustChangePassword: user.mustChangePassword,
      permissions: new Set(),
      groupCodes,
      packCodes: [...packCodes],
    };
  }

  const permissionCodes = new Set<string>();

  for (const up of user.userPacks) {
    for (const pp of up.pack.permissions) {
      permissionCodes.add(pp.permission.code);
    }
  }

  // Packs défaut des groupes non déjà couverts via userPacks
  const defaultPackIds = new Set(
    user.groupMembers
      .map((m) => m.group.defaultPack?.id)
      .filter((id): id is string => Boolean(id)),
  );
  for (const up of user.userPacks) {
    defaultPackIds.delete(up.pack.id);
  }
  if (defaultPackIds.size > 0) {
    const extras = await prisma.packPermission.findMany({
      where: { packId: { in: [...defaultPackIds] } },
      select: { permission: { select: { code: true } } },
    });
    for (const pp of extras) {
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
    isSuperAdmin: false,
    mustChangePassword: user.mustChangePassword,
    permissions: permissionCodes,
    groupCodes,
    packCodes: [...packCodes],
  };
}

export function hasPermission(user: SessionUser, code: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.permissions.has(code);
}

export function hasAnyPermission(user: SessionUser, codes: string[]): boolean {
  return codes.some((c) => hasPermission(user, c));
}

export type PermissionSource =
  | { kind: "super_admin" }
  | { kind: "group_pack"; groupName: string; packName: string }
  | { kind: "direct_pack"; packName: string }
  | { kind: "override_grant"; reason: string | null }
  | { kind: "override_deny"; reason: string | null };

export type PermissionProvenance = {
  code: string;
  effective: boolean;
  sources: PermissionSource[];
};

export type ProvenanceResult = {
  isSuperAdmin: boolean;
  entries: PermissionProvenance[];
};

/**
 * Provenance des droits pour l’UI admin (lecture seule).
 * Ne remplace pas resolveUserPermissions pour l’auth.
 */
export async function resolvePermissionProvenance(
  userId: string,
): Promise<ProvenanceResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groupMembers: {
        include: {
          group: { include: { defaultPack: true } },
        },
      },
      userPacks: { include: { pack: true } },
      overrides: { include: { permission: true } },
    },
  });
  if (!user) return null;

  if (user.isSuperAdmin) {
    return { isSuperAdmin: true, entries: [] };
  }

  const map = new Map<string, PermissionProvenance>();

  const ensure = (code: string) => {
    let row = map.get(code);
    if (!row) {
      row = { code, effective: false, sources: [] };
      map.set(code, row);
    }
    return row;
  };

  for (const up of user.userPacks) {
    const perms = await prisma.packPermission.findMany({
      where: { packId: up.packId },
      include: { permission: true },
    });
    for (const pp of perms) {
      const row = ensure(pp.permission.code);
      row.sources.push({
        kind: "direct_pack",
        packName: up.pack.name,
      });
      row.effective = true;
    }
  }

  for (const m of user.groupMembers) {
    if (!m.group.defaultPackId || !m.group.defaultPack) continue;
    const perms = await prisma.packPermission.findMany({
      where: { packId: m.group.defaultPackId },
      include: { permission: true },
    });
    for (const pp of perms) {
      const row = ensure(pp.permission.code);
      row.sources.push({
        kind: "group_pack",
        groupName: m.group.name,
        packName: m.group.defaultPack.name,
      });
      row.effective = true;
    }
  }

  for (const ov of user.overrides) {
    const row = ensure(ov.permission.code);
    if (ov.effect === OverrideEffect.GRANT) {
      row.sources.push({
        kind: "override_grant",
        reason: ov.reason,
      });
      row.effective = true;
    } else {
      row.sources.push({
        kind: "override_deny",
        reason: ov.reason,
      });
      row.effective = false;
    }
  }

  return {
    isSuperAdmin: false,
    entries: [...map.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };
}
