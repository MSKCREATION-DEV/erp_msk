# Audit listes — pagination / recherche / filtres URL

**Date :** 2026-11-12  
**Règle :** `.cursor/rules/list-pagination-search.mdc`  
**Référence OK :** `/commercial/devis`, `/commercial/clients`, `/crm/prospects`, `/crm/relances`, modules Suivi récents

Légende : **OK** = conforme · **Corrigé** = aligné dans ce lot · **Reporté** = écart connu hors scope / exception · **Exception** = autorisé par la règle

## Commercial / CRM

| Route | Avant | Après | Notes |
|---|---|---|---|
| `/crm/affectations` | KO — `take` 100/50, filtre `q` client | **Corrigé** | Pagination serveur (`page` / `hpage`), `q` Prisma, filtres statut historique |
| `/crm/rdv` | KO — 3 dumps `take` 50/50/30 | **Corrigé** | Une liste + chips vue + recherche + pagination |
| `/crm/prospects` | OK | OK | Déjà `page` / `q` / filtres |
| `/crm/relances` | OK | OK | Déjà paginé |
| `/commercial/devis` | OK | OK | Référence |
| `/commercial/clients` | OK | OK | Référence |
| `/commercial/contrats` | OK | OK | |
| `/commercial/factures` | — | — | Redirect → `/comptabilite/factures` |
| `/catalogue` | Exception | Exception | Catalogue d’offres curaté (jeu fixe / faible volume) |
| `/crm/scripts` | Exception / dette | Reporté | Catalogue scripts ; volume faible ; pagination à ajouter si croissance |
| `/crm/equipe`, `/crm/objectifs` | Exception | Exception | Vues roster / objectifs (pas listing croissant type table) |

## Stocks (module app)

| Route | Avant | Après |
|---|---|---|
| `/stocks/articles` | Partiel (page sans `q`) | **Corrigé** — + recherche |
| `/stocks/achats` | KO `take:100` | **Corrigé** |
| `/stocks/mouvements` | KO `take:100` | **Corrigé** |

## RH

| Route | Avant | Après |
|---|---|---|
| `/rh/collaborateurs` | KO `take:300` (+ recherche) | **Corrigé** — pagination |
| `/rh/contrats` | KO `take:300` | **Corrigé** |
| `/rh/conges` | KO `take:200` | **Corrigé** |
| `/rh/absences` | KO `take:200` | **Corrigé** |
| `/rh/heures` | KO `take:200` | **Corrigé** |
| `/rh/paie` | KO dump périodes | **Corrigé** — pagination |

## Comptabilité

| Route | Avant | Après |
|---|---|---|
| `/comptabilite/factures` | OK | OK |
| `/comptabilite/clients` | OK | OK |
| `/comptabilite/plan` | OK | OK |
| `/comptabilite/journaux` | OK | OK (jeu court journals) |
| `/comptabilite/ecritures` | KO `take:200` | **Corrigé** |
| `/comptabilite/a-comptabiliser` | KO dump + filtre client | **Corrigé** — `notIn` + page + `q` |
| `/comptabilite/banques` | Exception | Exception | Comptes banque/caisse (jeu fixe court) |
| `/comptabilite/creances` | À revoir | Reporté | Vérifier si agrégats / pas de listing croissant |

## Ops / Patrimoine / Projets

| Route | Avant | Après |
|---|---|---|
| `/projets` | KO `take:100` | **Corrigé** |
| `/patrimoine` | KO `take:100` | **Corrigé** |
| `/ops/anomalies` | KO `take:100` | **Corrigé** (+ count escalades serveur) |

## Organisation / Admin

| Route | Avant | Après |
|---|---|---|
| `/administration/utilisateurs` | Partiel (page sans `q`) | **Corrigé** — + recherche |
| `/administration/signatures` | KO `take:100` | **Corrigé** |
| `/administration/gabarits` | Exception | Exception | Peu de modèles PDF |
| `/organisation` | Exception | Exception | Organigramme, pas listing table |

## Autres

| Route | Avant | Après | Notes |
|---|---|---|---|
| `/notifications` | KO `take:100` | **Corrigé** | |
| `/ged` | KO docs `take:100` | **Reporté** | Navigateur dossier client (`GedBrowser`) — pagination serveur à brancher dans un lot GED dédié |
| `/guides` | OK / exception | OK | Contenu guide + recherche ; pas dump Prisma métier |
| Espace collab (`/espace/*`) | take plafonds perso | **Reporté** | Listes personnelles ; volume typiquement bas — aligner si besoin |
| Suivi (`/suivi/*`) | OK (lots récents) | OK | Clients, factures, stocks, mouvements |
| Pickers formulaires (ex. affecter prospect) | take 200 + filtre client picker | **Reporté** | OptionPicker ; pagination serveur picker = lot UX dédié |

## Primitives touchées

- `ListPagination` : prop optionnelle `pageParam` (ex. `hpage`)
- `SortableTh` : prop `pageParam` → `buildSortHref`
- `buildListSearchHref` : reset aussi `hpage`

## Gate

- `tsc --noEmit` OK sur zones touchées (2026-11-12)
