# Déploiement Vercel — ERP MSK

Checklist après validation humaine des phases (dont Phase 5 Paie) pour ouvrir l’ERP aux collaborateurs en test.

## Branches

| Branche | Usage |
|---|---|
| `dev` | Travail + previews Vercel |
| `main` | Stable — prod après gate |

Workflow : valider sur `dev` → merge `dev` → `main` → prod Vercel.

## Variables d’environnement (Vercel)

Obligatoires :

- `DATABASE_URL` (Postgres Supabase — pooler ou direct selon migrate)
- `DIRECT_URL` si Prisma le demande pour les migrations
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement)
- `NEXT_PUBLIC_APP_URL` (URL prod, ex. `https://erp.mskcreation…`)
- `RESEND_API_KEY`
- `EMAIL_FROM` (domaine **vérifié** Resend, ex. `MSK CREATION <noreply@mskcreation.net>`) — sans domaine vérifié, Resend n’envoie qu’à l’adresse du compte test

**Ne pas** définir en prod `BOOTSTRAP_TEMP_PASSWORD` / `BOOTSTRAP_FORCE_PASSWORD` (risque reset MDP comptes activés).

## Build

Commande build recommandée :

```bash
prisma migrate deploy && prisma generate && next build
```

Ou via `package.json` : adapter `build` Vercel pour enchaîner `prisma migrate deploy` avant `next build`.

## Post-déploiement

1. Vérifier login Super Admin
2. Seed équipe déjà appliqué en staging (`m.diarra@…`, `a.boussari@…`) — invitations si comptes neufs
3. Smoke : Accueil, Mon espace, RH Paie, Commercial devis PDF
4. Confirmer e-mails Resend (invitation / reset)

## Hors scope de cette checklist

- Déclaration INPS officielle
- Phase 7 stocks
- Domaines custom DNS (à faire côté Vercel + DNS MSK)
