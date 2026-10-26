# Responsive ERP MSK — stratégie

## Cause structurelle (audit 2026-10-26)

Les grilles KPI / hub utilisaient des breakpoints **viewport** (`sm:`, `xl:`).

Sur un laptop (ex. ~1366 CSS px, ou Windows DPI 125 %) :

| Élément | Largeur approx. |
|---|---:|
| Viewport | 1280–1366 |
| Sidebar `w-62` | ~248 px |
| Paddings main | ~48–64 px |
| **Contenu utile** | **~950–1100 px** |

Or `xl:` (1280 px **viewport**) s’active déjà → 4 ou 5 colonnes dans ~1000 px de contenu → cartes écrasées, textes mélangés, aspect « cassé » alors que le même code est propre sur un grand écran.

Ce n’est **pas** un bug de la machine de Yaye Bah : c’est une dépendance incorrecte au viewport.

## Règle

1. `<main>` du shell `(app)` porte `@container` (+ `min-w-0`, `overflow-x-hidden`).
2. Les grilles denses (KPI, hub Commercial, cards modules) utilisent les tokens de [`src/lib/ui/layout-grids.ts`](../../src/lib/ui/layout-grids.ts) — variantes `@min-[…rem]:` = **largeur du contenu**.
3. Composants flex/grid enfants : `min-w-0` pour autoriser le shrink.
4. Tableaux denses : `overflow-x-auto` **dans** le conteneur (Surface), pas sur toute la page.
5. Ne pas introduire de `min-width` / largeurs fixes injustifiées sur les cards.

## Tokens

| Export | Usage |
|---|---|
| `gridKpi3` / `gridKpi4` / `gridKpi5` | KPI / `KpiRadial` |
| `gridCards3` / `gridCards4` | Hub modules |
| `gridGedTiles` | Vue tuiles GED |

## GED — chargement

- `loading.tsx` + `GedBrowserSkeleton` : chrome navigateur (pas flash blanc).
- Page : `PageHeader` stable + `<Suspense key={folder}>` autour des données dossier.
- Client : overlay « Ouverture du dossier… » dès le clic (`pendingHref`).

## Tests manuels recommandés

Viewport CSS (DevTools) avec sidebar visible :

- 1024, 1280, 1366, 1440, 1920
- Zoom navigateur 100 % et 125 %
- Pages : Accueil, Commercial hub, CRM dashboard, Prospects, Relances, Rapport semaine, un formulaire create, une modale

Vérifier : pas de scroll horizontal page, KPI non chevauchés, actions Relances accessibles.
