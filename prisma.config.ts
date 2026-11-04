import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// En local uniquement — sur Vercel les vars viennent du dashboard (ne pas écraser).
if (!process.env.VERCEL) {
  config({ path: ".env.local" });
  config({ path: ".env" });
}

/**
 * CLI Prisma (migrate / db *) doit utiliser DIRECT_URL (Session pooler :5432).
 * Le runtime app utilise DATABASE_URL (Transaction :6543) via src/lib/prisma.ts
 * + adapter-pg (Pool max=1).
 *
 * Si on pointe la CLI sur DATABASE_URL (6543), `migrate deploy` hang
 * sur le pooler Transaction (build Vercel).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
