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

- [ ] `git ls-remote` / push OK sur `erp_msk`
- [ ] CDC présent (`docs/CAHIER-DES-CHARGES-ERP-MSK.md`)
- [ ] `docs/msk` favicons + team présents
- [ ] Projet Supabase **neuf** ; variables renseignées localement
- [ ] `.env.example` complet ; secrets absents du git
- [ ] `npm run build` OK
- [ ] E-mail test Resend reçu sur `a.guiro@mskcreation.net`
- [ ] README à jour
- [ ] Validation « Phase -1 OK » avant Phase 0

## Scripts utiles

```bash
npm run dev
npm run build
npm run test:email   # nécessite RESEND_API_KEY dans .env.local
npm run health:env   # vérifie les variables présentes (sans afficher les secrets)
```
