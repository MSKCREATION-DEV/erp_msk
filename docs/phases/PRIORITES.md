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
- Phase 0 **OK** · Phase 1 **OK** (2026-10-09) — socle IAM + GED/gabarits/signatures/org livré.
- Phase 2 **GO** (2026-10-09) — Catalogue + CRM en cours ([PHASE-02-CATALOGUE-CRM.md](./PHASE-02-CATALOGUE-CRM.md)).
- Ensuite **URGENT** : Phase 3 → 6 (Commercial documentaire → Compta) sans diluer sur RH/stocks.
- Optionnel **1.x** (hors chemin critique) : UI corbeille GED, partage ACL, pad signature.

### Ce que ça ne change pas

- Règle absolue 1 phase = 1 plan → implémentation → tests → gate.
- Pas de big-bang « tout le commercial + toute la compta » sans IAM/GED.

## Qualité & design (absolu)

Voir `.cursor/rules/phase-quality.mdc` :

- Design moderne, inspiré des meilleurs produits du domaine, **sous charte MSK**
- Tests UI + fonctionnels après chaque phase ; build sans erreur
- Code expert Next.js / full-stack ; meilleures libs si besoin
