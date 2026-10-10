# Phase 7A — Stocks (MVP)

> Plan de phase dédié.  
> Prérequis : Phase 5 Paie livrée · Phase 6 Compta livrée · IAM / GED OK.  
> Branche de travail : **`dev`**.  
> Priorité : ops terrain (non bloquant cash) — [PRIORITES.md](./PRIORITES.md).  
> CDC : §8.5 Stocks + §6.5 (couplage reporté) + permissions `stk.*`.  
> Suite : [PHASE-07B-OPS.md](./PHASE-07B-OPS.md) (achats, patrimoine, projets, anomalies).

## Statut

| Étape | État |
|---|---|
| Plan rédigé | Oui — 2026-10-10 |
| Validation « Phase 7A GO » | Oui — 2026-10-10 |
| Implémentation | Livrée (dev) — 2026-10-10 |
| Gate technique | `gate:phase7a` |
| Gate Phase 7A OK (humaine) | — attendre validation |

## Règle de gate

1. Plan validé (« Phase 7A GO ») ← **attendre validation humaine**
2. Implémentation complète de **ce** plan seulement
3. Tests / vérifications (`build`, lint, `gate:phase7a`, parcours UI)
4. Validation « Phase 7A OK »
5. Ensuite → [Phase 7B Ops](./PHASE-07B-OPS.md)

## Objectif

Remplacer le suivi Excel `TABLEAU DE SUIVI DES STOCKS…` par un module ERP :

```
Article (qty, min, emplacement)
        ↓
Mouvement ENTREE / SORTIE / AJUSTEMENT (historique)
        ↓
Alerte qty ≤ stock min (hub + badge)
        ↓
Pièces optionnelles GED 07_STOCKS_ACHATS
```

Le pack **Stock** (et Direction en lecture) gère le catalogue et les mouvements sans Excel hors ERP.

## Hors scope (strict — 7B / 7.x / 8)

| Reporté | Cible |
|---|---|
| Achats fournisseurs → réception → entrée auto | Phase 7B |
| Écritures comptables AC / stock | Phase 7B |
| SORTIE auto depuis facture Commercial | Phase 7B / 7.x |
| Patrimoine / immobilisations | Phase 7B |
| Projets / dépenses / anomalies | Phase 7B |
| Inventaire périodique multi-emplacements avancé | 7.x |
| Import bulk Excel historique | 7A optionnel post-MVP ou seed |
| Digests / export DGI | Phase 8 |

## Décisions verrouillées (MVP Phase 7A)

| Sujet | Valeur |
|---|---|
| Articles | `code` unique, famille, sous-famille, désignation, unité, `qtyOnHand`, emplacement, `stockMin`, `unitCostXof` optionnel, observations, `active` |
| Qty | Mise à jour **uniquement** via mouvements (pas d’édition directe du stock en UI) |
| Mouvements | Types `ENTREE` \| `SORTIE` \| `AJUSTEMENT` ; qty > 0 ; motif ; `createdBy` ; date |
| SORTIE | Refusée si qty insuffisante (sauf override Direction — hors MVP : refus strict) |
| AJUSTEMENT | Delta signé ou qty cible → mouvement traçable (pas soft-delete) |
| Alertes | `qtyOnHand ≤ stockMin` → liste hub + badge nav ; notif push si pattern existant, sinon UI seule |
| GED | Dossier année `07_STOCKS_ACHATS` ; upload pièce lié mouvement / article optionnel |
| Compta | **Aucune** écriture auto en 7A |
| Commercial | Pas de couplage facture → SORTIE |
| UI | list / create séparés · `loading.tsx` · pending · charte MSK · backHref |
| Permissions | Étendre `stk.*` (voir ci-dessous) + pack `stock` ; Direction `stk.access` + lecture |
| Seed | Familles de base + 5–10 articles démo (qty / min) pour gate |

## Permissions (à brancher à l’implémentation)

| Code | Usage |
|---|---|
| `stk.access` | Voir hub / listes (déjà au catalogue) |
| `stk.articles.manage` | CRUD articles |
| `stk.moves.create` | Créer mouvements |
| `stk.alerts.view` | Voir alertes stock min |

Pack `stock` : les 4 codes. Pack `direction` : au minimum `stk.access` + `stk.alerts.view` (lecture).

## Routes UI

| Intention | Route |
|---|---|
| Hub | `/stocks` |
| Liste articles | `/stocks/articles` |
| Nouveau article | `/stocks/articles/nouveau` |
| Fiche article | `/stocks/articles/[id]` |
| Liste mouvements | `/stocks/mouvements` |
| Nouveau mouvement | `/stocks/mouvements/nouveau` |

Nav : item **Stocks** (retirer `soon` si présent) sous permission `stk.access`.

## Livrables (checklist — à cocher à l’implémentation)

### Données

- [x] Modèles Prisma `StkArticle`, `StkMovement` (+ enums type)
- [x] Migration + indexes (`code` unique, `qtyOnHand`, alertes)
- [x] Seed familles / articles démo
- [x] Permissions `stk.articles.manage`, `stk.moves.create`, `stk.alerts.view` + maj pack `stock` / `direction`

### UI / actions

- [x] Hub `/stocks` (KPI qty articles, alertes, derniers mouvements)
- [x] CRUD articles (list / create / fiche)
- [x] Mouvements list + create (ENTREE / SORTIE / AJUSTEMENT) avec recalc qty atomique
- [x] Banner / liste alertes stock min
- [x] Nav Stocks active
- [x] `loading.tsx` / pending / list-create / backHref

### Qualité

- [x] `scripts/gate-phase7a.mjs` + script npm `gate:phase7a`
- [x] Manuel [docs/manuels/11-stocks.md](../manuels/11-stocks.md)
- [x] `npm run build` OK

## Gate humaine (après implémentation)

| # | Parcours | Critère |
|---|---|---|
| 1 | Article | Créer un article (code, min, emplacement) |
| 2 | Entrée | Mouvement ENTREE → qty augmente |
| 3 | Sortie | SORTIE refusée si stock insuffisant ; OK sinon → qty diminue |
| 4 | Ajustement | AJUSTEMENT traçable + qty cohérente |
| 5 | Alerte | Mettre qty ≤ min → visible sur hub |
| 6 | Droits | Pack stock ≠ commercial sans `stk.access` |

## Critères d’acceptation

Le responsable stock tient le catalogue et l’historique des mouvements dans l’ERP, voit les ruptures (≤ min), sans Excel. Pas d’achats, pas de compta stock, pas de lien facture Commercial.

## Après gate technique

Répondre : **« Phase 7A OK »** → ouverture [Phase 7B Ops](./PHASE-07B-OPS.md).

---

## Validation historique

- Plan ouvert — 2026-10-10 (doc d’abord, après Phase 5/6 + comptes Direction).
- Phase 7A GO — 2026-10-10 ; implémentation + `gate:phase7a` OK.
