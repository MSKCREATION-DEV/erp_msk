import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Factory Prisma 7 + adapter-pg — partagée app (`prisma.ts` server-only)
 * et scripts/seeds (`scripts/lib/prisma.mjs`). Pas de `server-only` ici
 * (les scripts Node doivent pouvoir importer la factory).
 *
 * URL runtime Transaction pooler (:6543).
 */
export function runtimeDatabaseUrl(base = process.env.DATABASE_URL) {
  if (!base) return undefined;
  try {
    const u = new URL(base);
    if (
      u.hostname.includes("pooler.supabase.com") &&
      (u.port === "5432" || u.port === "" || !u.port)
    ) {
      u.port = "6543";
    }
    u.searchParams.delete("connection_limit");
    u.searchParams.delete("pool_timeout");
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

export type CreatePrismaOptions = {
  /** Défaut : DATABASE_URL (runtime). Seeds CLI peuvent passer DIRECT_URL. */
  connectionString?: string;
  /** Pool max (1 = serverless / isolate). */
  max?: number;
};

/** Client Prisma 7 + adapter-pg (requis). */
export function createPrisma(opts: CreatePrismaOptions = {}): PrismaClient {
  const connectionString =
    opts.connectionString ??
    runtimeDatabaseUrl() ??
    process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL / DIRECT_URL manquant pour Prisma");
  }
  const pool = new Pool({
    connectionString,
    max: opts.max ?? 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    ssl: connectionString.includes("supabase")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}
