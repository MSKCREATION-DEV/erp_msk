/**
 * Client Prisma serveur uniquement (RLS côté app).
 * Pas de `server-only` ici : `prisma/seed.ts` et scripts Node importent des modules
 * métier (`ged/tree`…) qui réutilisent ce singleton — sinon le seed crashe sous tsx.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrisma } from "@/lib/create-prisma";

const G = globalThis as typeof globalThis & {
  __erp_msk_prisma__?: PrismaClient;
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
  if (!G.__erp_msk_prisma__) {
    G.__erp_msk_prisma__ = createPrisma({ max: 1 });
  }
  return G.__erp_msk_prisma__;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
