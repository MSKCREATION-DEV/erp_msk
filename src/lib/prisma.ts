import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * URL runtime : 1 connexion max par isolate serverless (Vercel),
 * compatible PgBouncer transaction mode (évite EMAXCONNSESSION).
 *
 * ABSOLU : ne jamais `Promise.all([prisma…, prisma…])` — saturation pool → P2024.
 * Utiliser `mapSeries` / `runSeries` (`src/lib/db/serial.ts`) ou await séquentiels.
 */
function runtimeDatabaseUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  try {
    const u = new URL(base);
    // Supabase Session pooler (:5432) = max ~15 clients → EMAXCONNSESSION sur Vercel.
    // Runtime app = toujours Transaction (:6543). DIRECT_URL reste pour migrate CLI.
    if (
      u.hostname.includes("pooler.supabase.com") &&
      (u.port === "5432" || u.port === "" || !u.port)
    ) {
      u.port = "6543";
    }
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    if (!u.searchParams.has("pool_timeout")) {
      u.searchParams.set("pool_timeout", "20");
    }
    if (
      (u.port === "6543" || u.hostname.includes("pooler")) &&
      !u.searchParams.has("pgbouncer")
    ) {
      u.searchParams.set("pgbouncer", "true");
    }
    return u.toString();
  } catch {
    return base;
  }
}

function createPrismaClient() {
  const url = runtimeDatabaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Toujours réutiliser (dev HMR + warm lambdas Vercel)
globalForPrisma.prisma = prisma;
