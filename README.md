# ERP MSK CREATION

Logiciel métier **interne** MSK CREATION.

- Cahier des charges : [`docs/CAHIER-DES-CHARGES-ERP-MSK.md`](docs/CAHIER-DES-CHARGES-ERP-MSK.md)
- Priorités : [`docs/phases/PRIORITES.md`](docs/phases/PRIORITES.md) — **Commercial / Finance / Compta = URGENT**
- Phase -1 : OK · Phase 0 (IAM) : [`docs/phases/PHASE-00-IAM-ACCUEIL.md`](docs/phases/PHASE-00-IAM-ACCUEIL.md)
- Repo : `git@asg-msk:MSKCREATION-DEV/erp_msk.git`
- Super Admin : `a.guiro@mskcreation.net`

## Branches

| Branche | Usage |
|---|---|
| **`dev`** | Travail quotidien (phases) |
| `main` | Stable — merge après gate de phase |

```bash
git clone git@asg-msk:MSKCREATION-DEV/erp_msk.git
cd erp_msk
git checkout dev
```

## Prérequis

- Node 20+
- Accès SSH GitHub host `asg-msk`
- Projet Supabase **neuf**
- Compte [Resend](https://resend.com) (dev)
- Prisma 6 + pooler Supabase (`DATABASE_URL` Transaction `:6543`, `DIRECT_URL` Session `:5432`)

## Démarrage

```bash
git checkout dev
npm install
cp .env.example .env.local
# Renseigner Supabase + Resend + DATABASE_URL (pooler) + DIRECT_URL
npm run health:env
npm run db:generate
npm run db:seed   # catalogue IAM + Super Admin
npm run dev
```

Ouvrir [http://localhost:3000/login](http://localhost:3000/login).

1ʳᵉ connexion Super Admin → **changement de mot de passe obligatoire** → `/accueil`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur local |
| `npm run build` | `prisma generate` + build production |
| `npm run lint` | ESLint |
| `npm run health:env` | Vérifie les variables (sans secrets) |
| `npm run test:email` | E-mail test Resend |
| `npm run db:migrate` | Migrations Prisma |
| `npm run db:seed` | Seed IAM + Super Admin |
| `npm run db:setup` | `migrate deploy` + seed |

## Règle des phases

1. Plan de phase dédié  
2. Implémentation complète  
3. Tests / vérifications  
4. Validation gate (« Phase N OK »)  
5. Seulement ensuite : phase suivante  

Qualité / design : `.cursor/rules/phase-quality.mdc` + charte MSK.

## Assets

Fonts locales `src/fonts/` · brand `public/brand/` · favicons `public/`.
