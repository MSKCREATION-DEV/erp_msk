import type { PrismaClient } from "@prisma/client";
import {
  loadUsersMap,
  resolveAliasKey,
  type UsersMapFile,
} from "@/lib/crm/import/users-map";

export type UserIdResolver = {
  map: UsersMapFile;
  /** alias key → user id */
  byKey: Map<string, string>;
  fallbackId: string;
  unresolved: Set<string>;
};

/** Charge les ids Prisma pour chaque alias du users.map (par e-mail). */
export async function buildUserIdResolver(
  prisma: PrismaClient,
  fallbackId: string,
  mapPath?: string,
): Promise<UserIdResolver> {
  const map = loadUsersMap(mapPath);
  const byKey = new Map<string, string>();
  for (const [key, def] of Object.entries(map.aliases)) {
    const u = await prisma.user.findUnique({
      where: { email: def.email.toLowerCase() },
      select: { id: true },
    });
    if (u) byKey.set(key, u.id);
  }
  return { map, byKey, fallbackId, unresolved: new Set() };
}

export function resolveOwnerId(
  resolver: UserIdResolver,
  ownerHint: string | null,
): string {
  const key = resolveAliasKey(ownerHint, resolver.map);
  if (key && resolver.byKey.has(key)) return resolver.byKey.get(key)!;
  if (ownerHint) resolver.unresolved.add(ownerHint);
  return resolver.fallbackId;
}

export function resolveCreatedById(
  resolver: UserIdResolver,
  createdByHint: string | null,
  ownerId: string,
): string {
  const key = resolveAliasKey(createdByHint, resolver.map);
  if (key && resolver.byKey.has(key)) return resolver.byKey.get(key)!;
  if (createdByHint) resolver.unresolved.add(createdByHint);
  return ownerId;
}
