# Priorités métier MSK

## Branches Git

| Branche | Rôle |
|---|---|
| `dev` | **Branche de travail** — toutes les phases s’y développent |
| `main` | Branche stable — merge depuis `dev` après gate de phase validée |

Workflow : travailler sur `dev` → PR / merge vers `main` à la fin d’une phase OK.

## Urgence métier (notification)

Les pôles suivants sont **URGENTS / PRIORITAIRES** pour MSK :

- **Commercial** (CRM, clients, devis, factures, paiements)
- **Finance / Comptabilité** (journaux, banques, budget, TVA, états)

### Ce que ça change

- On **ne saute pas** les fondations (Phase 0 IAM, Phase 1 GED/gabarits utiles).
- On **oriente** chaque plan de phase : marquer `URGENT` sur les livrables COM/CPT.
- Phase 0 **OK** · Phase 1 **OK** · Phase 2 **OK** (2026-10-09) — IAM + GED + Catalogue/CRM livrés.
- Phase 3 **plan ouvert** — Commercial documentaire ([PHASE-03-COMMERCIAL.md](./PHASE-03-COMMERCIAL.md)) — attendre **« Phase 3 GO »**.
- Ensuite **URGENT** : Phase 3 → 6 (Devis/factures → Compta) sans diluer sur RH/stocks.
- Optionnel **1.x** / **2.x** (hors chemin critique) : UI corbeille GED, partage ACL, pad signature, cron relances.

### Ce que ça ne change pas

- Règle absolue 1 phase = 1 plan → implémentation → tests → gate.
- Pas de big-bang « tout le commercial + toute la compta » sans IAM/GED.

## Qualité & design (absolu)

Voir `.cursor/rules/phase-quality.mdc` · `ui-never-freeze.mdc` · `list-create-separation.mdc` :

- Design moderne, inspiré des meilleurs produits du domaine, **sous charte MSK**
- UI jamais figée (`loading.tsx`, pending, Suspense layout)
- Tests UI + fonctionnels après chaque phase ; build sans erreur
- Code expert Next.js / full-stack ; meilleures libs si besoin
