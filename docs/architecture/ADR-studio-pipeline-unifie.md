# ADR — Pipeline Studio unifié (DSL + régions composites)

**Statut** : accepté · **Date** : 2026-11-17 · **Branche** : `dev`

## Contexte

Cinq gabarits (`devis`, `facture`, `contrat_commercial`, `contrat_presta`, `fiche_paie`) portaient un marqueur `[[COMPOSITE:…]]`. Dès qu’un composite était présent, `generateOfficialPdfFromTemplate` **ignorait tout le DSL** et déléguait au générateur TS historique. Conséquence : Studio / Playground ≠ PDF métier.

Les autres gabarits étaient déjà DSL-first (`renderBlocksToPdf`).

## Décision — Option A (régions dans le DSL)

```
Réf docs → corps DSL/blocs (spécifique) + variables
        → preview HTML live
        → PDF officiel (même source + régions tableau)
```

- Le **contenu textuel** (articles, en-têtes, conditions) reste dans le DSL, spécifique par gabarit.
- Un `[[COMPOSITE]]` n’est plus un court-circuit document : c’est une **région** (tableau lignes, grille cotisations, annexe BDC, récap parties) rendue **à sa place** dans `renderBlocksToPdf` / `renderBlocksToHtml`.
- Playground et modules métier partagent le même pipeline. Plus de `playgroundTextMode` qui strippe les composites.

### Pourquoi pas Option B (100 % DSL + nouveaux block types)

Porter tableaux / grilles / multipages charte en types de blocs natifs (édition cellule) est souhaitable à terme, mais trop large pour ce lot (risque de régression charte + dette WYSIWYG). Option A unifie le pipeline **sans** perdre la fidélité visuelle des tableaux TS.

## Conséquences

| Avant | Après |
|-------|-------|
| Composite → PDF = 100 % générateur TS | Composite → région dans le flux blocs |
| Playground PDF ≠ métier | Même `generateOfficialPdfFromTemplate` |
| Édition DSL sans effet métier | Édition DSL → PDF métier |

## Dette assumée

- Cellules de tableau non éditables en WYSIWYG (région opaque data-driven).
- Générateurs TS `generateCommercialPdf` / `generateContractPdf` / … conservés pour compat / comparaison ; le chemin officiel Studio ne les court-circuite plus.
