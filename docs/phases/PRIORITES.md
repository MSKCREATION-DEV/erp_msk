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
- Phase 1 livre d’abord ce dont COM/CPT ont besoin (dossiers clients, gabarits devis/facture).
- Dès que possible après ces prérequis : enchaîner **Phase 2 → 3 → 6** sans diluer sur RH/stocks.

### Ce que ça ne change pas

- Règle absolue 1 phase = 1 plan → implémentation → tests → gate.
- Pas de big-bang « tout le commercial + toute la compta » sans IAM/GED.
