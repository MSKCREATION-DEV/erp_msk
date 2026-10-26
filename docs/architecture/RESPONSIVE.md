# Responsive ERP MSK — stratégie

## Machine de référence problématique

| Paramètre | Valeur (Yaye Bah) |
|---|---|
| Résolution | **1366 × 768** @ 100 % |
| Contenu utile | ≈ 1000–1100 px (viewport − sidebar − paddings) |
| Anti-pattern | Zoom navigateur **75 %** pour « élargir » le CSS |

Le zoom 75 % n’est **pas** une solution produit : il augmente artificiellement les CSS px. L’UI doit tenir à **100 %** sur 1366×768.

## Cause

1. Grilles `xl:grid-cols-*` basées sur le **viewport** (sidebar ignorée).
2. Puis breakpoints `@min-[52rem]` encore trop bas → **3 colonnes** dans ~1050 px → cartes trop larges / coupées (`overflow-x-hidden`).

## Règle actuelle

1. `<main class="@container …">` + `min-w-0`.
2. Tokens [`src/lib/ui/layout-grids.ts`](../../src/lib/ui/layout-grids.ts) :
   `repeat(auto-fit, minmax(min(100%, Xrem), 1fr))`
3. Hub Commercial : **X ≈ 20–22 rem** → **2 colonnes** sur 1366 ; 3+ sur grand écran.
4. KPI : X ≈ 15–16.5 rem (plus dense).
5. Sidebar : `w-56` puis `xl:w-62` (plus d’espace utile sous xl).
6. Enfants flex/grid : `min-w-0` / `max-w-full`.

## Tokens

| Export | Min carte | Effet typique 1366 |
|---|---:|---|
| `gridCards3` / `gridCards4` | 20–22 rem | 2 cols hub |
| `gridKpi3` / `gridKpi4` / `gridKpi5` | 15–16.5 rem | 3–4 KPI |
| `gridGedTiles` | 9.5 rem | tuiles GED |

## GED — chargement

- Skeleton navigateur + Suspense `key={folder}` + overlay « Ouverture du dossier… ».

## Test manuel obligatoire (machine type Yaye)

1. Résolution **1366×768**, scale OS **100 %**, zoom navigateur **100 %** (pas 75 %).
2. `/commercial` : aucune carte coupée à droite ; Prospection en **2** colonnes.
3. Prospects / Relances / Rapport : KPI lisibles, pas de scroll horizontal page.
4. GED : skeleton visible, pas flash blanc.
