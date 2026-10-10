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
- Phase 0–3 **OK** · Phase 6 Compta **livrée** · Phase 4 RH **livrée** + UX Mon espace · Phase 5 Paie/INPS **livrée**.
- Comptes Direction (Mathieu / Andile) seedés ; e-mail invitation charte MSK.
- Déploiement collab : checklist [docs/deploy/VERCEL.md](../deploy/VERCEL.md) — merge `dev` → `main` après gate humaine, puis prod Vercel.
- Optionnel **1.x** / **2.x** / **3.x** (hors chemin critique) : UI corbeille GED, partage ACL, pad signature, cron relances factures.

### Documentation vivante

Manuels utilisateur : [docs/manuels/](../manuels/) — à mettre à jour à chaque évolution de module.

### Ce que ça ne change pas

- Règle absolue 1 phase = 1 plan → implémentation → tests → gate.
- Pas de big-bang « tout le commercial + toute la compta » sans IAM/GED.

## Qualité & design (absolu)

Voir `.cursor/rules/phase-quality.mdc` · `ui-never-freeze.mdc` · `list-create-separation.mdc` :

- Design moderne, inspiré des meilleurs produits du domaine, **sous charte MSK**
- UI jamais figée (`loading.tsx`, pending, Suspense layout)
- Tests UI + fonctionnels après chaque phase ; build sans erreur
- Code expert Next.js / full-stack ; meilleures libs si besoin
