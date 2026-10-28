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
2. Puis breakpoints trop bas → **3 colonnes** dans ~1050 px → cartes trop larges / coupées.

## Règle actuelle

1. `<main class="@container …">` + `min-w-0`.
2. Tokens [`src/lib/ui/layout-grids.ts`](../../src/lib/ui/layout-grids.ts) :
   `repeat(auto-fit, minmax(min(100%, Xrem), 1fr))`
3. Fiches détail : variants **container** `@xl:` / `@lg:` (pas `xl:` / `lg:` viewport).
4. Hub Commercial : **X ≈ 20–22 rem** → **2 colonnes** sur 1366 ; 3+ sur grand écran.
5. KPI : X ≈ 15–16.5 rem (plus dense).
6. Sidebar desktop : `w-56` puis `xl:w-62` ; **sous `md`** : drawer mobile (`MobileNav` + Vaul).
7. Enfants flex/grid : `min-w-0` / `max-w-full` / `break-words` sur textes longs.
8. Tables larges : [`ListTableScroll`](../../src/components/ui/list-table-scroll.tsx) = scroll **local** documenté (`data-list-table-scroll`).

## Interdits (fix cosmétique)

- `overflow: hidden` pour **cacher** un débordement de page.
- Réduire arbitrairement les polices pour « faire tenir ».
- Masquer des actions métier sans alternative évidente.

Autorisé : `overflow-x-auto` / `ListTableScroll` sur un tableau ; `overflow-x-clip` sur un shell carte si les enfants scrollent correctement.

## Tokens

| Export | Min carte | Effet typique 1366 |
|---|---:|---|
| `gridCards3` / `gridCards4` | 20–22 rem | 2 cols hub |
| `gridKpi3` / `gridKpi4` / `gridKpi5` | 15–16.5 rem | 3–4 KPI |
| `gridGedTiles` | 9.5 rem | tuiles GED |

## Audit automatisé

```bash
npm run audit:responsive
# Matrice complète (8 viewports × P0) — long si le pool Prisma est saturé.

RESPONSIVE_QUICK=1 npm run audit:responsive
# Viewports critiques : xs · md · ref (1366) · fhd
# → tmp/responsive-audit/report.md + report.json + shots/
```

Inventaire routes : [`RESPONSIVE-AUDIT-INVENTORY.md`](./RESPONSIVE-AUDIT-INVENTORY.md).

Dans le rapport final, distinguer clairement **Testées** / **Corrigées** / **Non vérifiées** — ne jamais prétendre qu’une page a été testée si elle est absente du rapport.

## GED — chargement

- Skeleton navigateur + Suspense `key={folder}` + overlay « Ouverture du dossier… ».

## Test manuel obligatoire (machine type Yaye)

1. Résolution **1366×768**, scale OS **100 %**, zoom navigateur **100 %** (pas 75 %).
2. `/commercial` : aucune carte coupée à droite ; Prospection en **2** colonnes.
3. Prospects / Relances / Rapport : KPI lisibles, pas de scroll horizontal **page**.
4. Sous 768 px : hamburger ouvre le menu ; navigation utilisable.
5. GED : skeleton visible, pas flash blanc.
