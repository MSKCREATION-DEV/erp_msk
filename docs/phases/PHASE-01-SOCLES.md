# Phase -1 — Socle projet ERP MSK

> Copie opérationnelle du plan de phase. Gate obligatoire avant Phase 0.

## Règle de gate

Cette phase est **fermée** tant que la checklist Tests n’est pas 100 % OK. **Aucun** travail Phase 0 avant validation explicite.

## Objectif

Préparer l’environnement : dépôt `erp_msk`, nouveau Supabase, Resend (dev), CDC/assets, app Next.js bootstrap.

## Hors scope

- Prisma / IAM / Super Admin seed en base
- Modules métier (CRM, GED, RH, compta…)

## Décisions

| Sujet | Valeur |
|---|---|
| Repo | `git@asg-msk:MSKCREATION-DEV/erp_msk.git` |
| Super Admin (Phase 0) | Amadou Samba Guiro / `a.guiro@mskcreation.net` |
| E-mail dev | Resend |
| Supabase | Nouveau projet `erp-msk-dev` |

## Checklist tests (gate)

- [x] `git ls-remote` / push OK sur `erp_msk` (`main` → `MSKCREATION-DEV/erp_msk`)
- [x] CDC présent (`docs/CAHIER-DES-CHARGES-ERP-MSK.md`)
- [x] `docs/msk` favicons + team présents
- [x] Projet Supabase connecté ; `npm run health:env` OK
- [x] `.env.example` complet ; secrets absents du git (`.env.local` gitignoré)
- [x] `npm run build` OK
- [x] E-mail test Resend **envoyé** vers `a.guiro@mskcreation.net` (id `01a11e20-1ba2-7bb0-913a-848c07948869`) — confirmer réception boîte
- [x] README à jour
- [x] Validation explicite « Phase -1 OK » (2026-10-09) — gate fermée

## Scripts utiles

```bash
npm run dev
npm run build
npm run test:email   # nécessite RESEND_API_KEY dans .env.local
npm run health:env   # vérifie les variables présentes (sans afficher les secrets)
```
