# Déploiement Vercel — ERP MSK

Checklist pour ouvrir l’ERP aux collaborateurs (Mathieu, Andile, équipe) en test.

## Diagnostic permanent (oct. 2026) — Preview + Production

Trois causes distinctes se cumulaient. Les corriger **toutes** sinon « toujours pas OK ».

| Symptôme | Cause racine | Correctif permanent |
|---|---|---|
| Preview `*-git-dev-*.vercel.app` → écran SSO Vercel / 302 | `ssoProtection: all_except_custom_domains` (Hobby) | **Désactivé** (`ssoProtection: null`). Ne **pas** réactiver tant que l’équipe métier n’a pas de compte Vercel |
| Production sur vieux SHA alors que `main` est à jour | Intégration Git Vercel ne crée pas toujours de déploiement au push (`link.sourceless`, webhooks flous) | Deploy Hooks + Actions GitHub (voir § Auto-deploy) |
| Build rouge `cursor/canvas` | `tsconfig` incluait `docs/**/*.canvas.tsx` | `include: ["src/**"]` + `npm run typecheck` |

### URLs canoniques

| Env | Branche | URL |
|---|---|---|
| **Production** | `main` | https://erp-msk.vercel.app |
| **Preview** | `dev` | https://erp-msk-git-dev-mskcreations-projects.vercel.app |

Smoke : `curl -sI https://…/login` → **HTTP 200** (pas 302 vers `vercel.com/sso`).

### Auto-deploy (filet obligatoire)

Deploy Hooks projet (déjà créés) :

| Nom | Ref | Effet |
|---|---|---|
| `auto-main-production` | `main` | Production |
| `auto-dev-preview` | `dev` | Preview |

Workflow : [`.github/workflows/vercel-deploy.yml`](../../.github/workflows/vercel-deploy.yml)

**Une fois** (GitHub → repo → Settings → Secrets and variables → Actions) :

1. Secret `VERCEL_DEPLOY_HOOK_MAIN` = URL du hook `auto-main-production`
2. Secret `VERCEL_DEPLOY_HOOK_DEV` = URL du hook `auto-dev-preview`

URLs : Vercel → `erp-msk` → Settings → Git → Deploy Hooks.

Sans ces secrets, le workflow échoue clairement (mieux qu’un silence). Avec secrets : **chaque push** `main`/`dev` redéploie même si l’app Git Vercel est muette.

Trigger manuel de secours :

```bash
curl -X POST "$VERCEL_DEPLOY_HOOK_MAIN"   # prod
curl -X POST "$VERCEL_DEPLOY_HOOK_DEV"    # preview
```

### Ne pas confondre

- **SSO Vercel** (protection déploiement) ≠ login ERP Supabase.
- Redeploy manuel MCP/API OK en secours ; le flux nominal = push → Action → hook → Vercel.

## Piège build récurrent (absolu)

Next.js exécute **Lint + typecheck** sur les fichiers du `tsconfig.json` pendant `next build`.

| Interdit dans le typecheck app | Pourquoi |
|---|---|
| `*.canvas.tsx` (Cursor Canvas) | import `cursor/canvas` **absent** sur Vercel → `module_not_found` |
| `docs/**` hors app | artefacts éditoriaux / canvas, pas du runtime Next |
| tests `*.test.ts` | exécutés via `npm run test:*`, pas via le build |

**Fix permanent** : `tsconfig.json` n’inclut que `src/**` (+ `.next/types`). Avant push :

```bash
npm run typecheck   # même périmètre que Vercel
npm run build       # gate locale si possible
```

Erreur typique (commit `f28d87e`) :

```
./docs/architecture/erp-msk-db-review.canvas.tsx
Type error: Cannot find module 'cursor/canvas'
```

## État Git

| Branche | Usage |
|---|---|
| `dev` | Travail quotidien + previews |
| `main` | **Prod** — merge depuis `dev` quand on déploie |

Merge effectué : `dev` → `main` (préparation déploiement collab).  
Next.js **≥ 15.5.27** requis (Vercel refuse les versions vulnérables, ex. 15.2.4).

## 1. Projet Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importer `MSKCREATION-DEV/erp_msk` (ou le remote Git actuel)
2. **Production Branch** = `main`
3. Framework Preset = **Next.js**
4. Root Directory = `.` (défaut)
5. **Build Command** = `npm run build`  
   (= `prisma migrate deploy && prisma generate && next build`)
6. **Install Command** = `npm ci` (ou `npm install`)
7. **Output** = défaut Next.js (pas besoin de changer)

Previews : laisser les déploiements sur les PR / branche `dev` si souhaité.

## 2. Variables d’environnement (Production)

Dans Vercel → Project → Settings → Environment Variables — cocher **Production** (et Preview si tu veux les mêmes données).

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction** (**port `6543`**) + `pgbouncer=true`. Runtime app. |
| `DIRECT_URL` | Même host **pooler**, port **`5432`** (mode Session) — **uniquement** pour `prisma migrate deploy` au build. **Ne pas** utiliser `db.*.supabase.co` sur Vercel (souvent IPv6 / DNS → build qui tourne 15+ min sans log). |

Exemples (même mot de passe, ports différents) :

```
# Runtime (Transaction)
DATABASE_URL=postgresql://postgres.[REF]:[PWD]@aws-0-….pooler.supabase.com:6543/postgres?pgbouncer=true

# Migrations build (Session pooler — OK, 1 connexion au build)
DIRECT_URL=postgresql://postgres.[REF]:[PWD]@aws-0-….pooler.supabase.com:5432/postgres
```

| Symptôme | Cause | Action |
|---|---|---|
| `EMAXCONNSESSION` / pool_size 15 | Runtime encore en Session (`:5432`) — souvent un vieux déploiement Ready | `DATABASE_URL` = **6543** + Redeploy réussi |
| Build 45 min / hang après `migrate deploy` | CLI Prisma utilisait `DATABASE_URL` (6543) au lieu de `DIRECT_URL` | Corrigé dans `prisma.config.ts` (`url` = `DIRECT_URL`). Vérifier `DIRECT_URL` = pooler **:5432** |
| Log migrate : `…pooler…:6543` | Mauvaise URL CLI | Doit afficher **`:5432`** après le fix |

### Checklist Vercel (2 URLs)

1. `DATABASE_URL` → port **6543** + `?pgbouncer=true` (app)
2. `DIRECT_URL` → **même host pooler**, port **5432** (migrate)
3. Redeploy Production — le build doit afficher `[build] prisma generate…` en < 1 min
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement** — ne jamais préfixer `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | URL canonique prod, ex. `https://erp.mskcreation.net` ou `https://….vercel.app` |
| `RESEND_API_KEY` | Clé Resend du **même** compte où `mskcreation.net` est Verified |
| `EMAIL_FROM` | `MSK CREATION <erp.notifications@mskcreation.net>` (domaine vérifié Resend) |

### Interdit en Production

- `BOOTSTRAP_TEMP_PASSWORD`
- `BOOTSTRAP_FORCE_PASSWORD`

(risque de réécriture MDP des comptes ACTIVE)

### Optionnel plus tard (Phase 8)

- `CRON_SECRET` — pour `/api/cron/automations`

## 3. Domaine & e-mail

1. Domaine custom (optionnel) : Vercel → Domains → `erp.mskcreation.net` + DNS Cloudflare
2. Resend → Domains → `mskcreation.net` **Verified** (SPF/DKIM) ; `EMAIL_FROM` = `MSK CREATION <erp.notifications@mskcreation.net>`
3. Logos e-mail = **CID inline** (`src/lib/email/brand-assets.ts`) — pas besoin d’URL publique (Vercel Protection OK)
4. Smoke local : `npm run test:email` · aperçu invitation : `npm run test:email:invite`
5. Sans domaine vérifié / mauvaise clé API → 403 Resend

## 4. Déployer

1. Push / merge sur `main` → déploiement Production automatique
2. Suivre les logs Build : `migrate deploy` doit réussir avant `next build`
3. Si migrate échoue : vérifier `DATABASE_URL` / `DIRECT_URL` et que le pooler autorise les migrations (sinon `DIRECT_URL` seul pour migrate — déjà géré côté Prisma si schema le demande)

## 5. Post-déploiement (smoke)

| # | Check |
|---|---|
| 1 | Login Super Admin (`a.guiro@…`) |
| 2 | Accueil + sidebar (Stocks, Projets, Patrimoine, Anomalies visibles selon packs) |
| 3 | Compte Mathieu / Andile : login + change MDP si `MUST_CHANGE_PASSWORD` |
| 4 | Commercial : devis PDF |
| 5 | RH Paie : ouvrir une période (lecture) |
| 6 | Stocks : liste articles seed |
| 7 | E-mail test : invitation ou reset (Resend dashboard) |

Seed déjà appliqué sur la base Supabase partagée (staging = prod DB pour l’instant). **Ne pas** relancer un seed destructif en prod.

## 6. Rollback rapide

Vercel → Deployments → Promote un déploiement précédent OK.  
Migrations Prisma : ne pas downgrade à la main sans plan ; préférer hotfix forward sur `dev` → `main`.

## Hors scope

- Phase 8 cron / digests (doc prête, code après « Phase 8 GO »)
- Export DGI, WhatsApp
- Multi-région / Supabase Pro (décision ops)
