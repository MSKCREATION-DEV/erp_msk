# Prisma ORM 7 — ERP MSK (Vercel / Supabase)

Trajectoire **A** : rester sur Vercel + Postgres Supabase. Pas de Prisma Compute, Composer, ni Prisma Postgres hébergé.

## Versions

- `prisma` / `@prisma/client` / `@prisma/adapter-pg` : **7.x**
- Driver : `pg` + `Pool` (`max: 1` en runtime serverless)

## Dual URL

| Contexte | Variable | Port / usage |
|---|---|---|
| Runtime app (`src/lib/prisma.ts` → `create-prisma.ts`) | `DATABASE_URL` | Transaction pooler **:6543**, `pgbouncer=true` |
| CLI migrate / deploy (`prisma.config.ts`) | `DIRECT_URL` | Session / direct — évite hang Transaction |

Ne jamais pointer `prisma migrate` sur le pooler Transaction.

## Client généré

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

- Imports app : `@/generated/prisma/client` (plus `@prisma/client` pour les types métier).
- Sortie : `src/generated/prisma` — **versionnée** (évite TS2307 IDE / Cursor sur fichiers gitignorés) ; régénérée via `postinstall` / `prisma generate`.
- Seeds / scripts inclus dans `tsconfig.json` pour que l’alias `@/` s’applique aussi hors `src/`.

## Pool & concurrence

- `pg.Pool({ max: 1 })` — équivalent historique `connection_limit=1`.
- Interdit : `Promise.all([prisma…, prisma…])` → P2024 / saturation.
- Obligatoire : `runSeries` / `mapSeries` (`src/lib/db/serial.ts`) ou awaits séquentiels.
- SSL Supabase : `rejectUnauthorized: false` dans l’adapter (évite P1010).

## Modules « server-only »

- Singleton app : `src/lib/prisma.ts` → `server-only` (ne jamais importer depuis un Client Component).
- Factory partagée scripts/seeds : `src/lib/create-prisma.ts` (sans `server-only`) ; scripts via `node --import tsx scripts/…`.
- Loaders DB métier : `server-only` ; helpers purs / types UI dans `*-meta.ts` / `goals-resolve.ts` / `notify-where.ts` (ex. `prospect-linked-meta`, `goals-meta`, `follow-up-meta`, `session-user`).

## Skills agent

Skills officiels `prisma/skills` (upgrade-v7, client-api, cli, database-setup) : voir `.cursor/rules/agent-skills.mdc`. Pour le travail ORM ERP, ces skills **prioritaires** ; les customs Composer / Platform restent hors trajectoire produit.

## Hors scope

Prisma 8, Composer, `prisma deploy` Compute, Accelerate, Auth Supabase (inchangé), `"type": "module"` forcé sauf blocker réel.
