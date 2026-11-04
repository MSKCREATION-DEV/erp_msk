import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { createPrisma } from "@/lib/create-prisma";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Singleton Prisma ORM 7 (adapter-pg, Pool max=1).
 * Lazy : n’exige DATABASE_URL qu’au premier accès (tests unitaires sans DB).
 *
 * ABSOLU : ne jamais `Promise.all([prisma…, prisma…])` — saturation pool → P2024.
 * Utiliser `mapSeries` / `runSeries` (`src/lib/db/serial.ts`) ou await séquentiels.
 *
 * CLI migrate : `DIRECT_URL` via `prisma.config.ts` (pas ce module).
 */
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma({ max: 1 });
  }
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
