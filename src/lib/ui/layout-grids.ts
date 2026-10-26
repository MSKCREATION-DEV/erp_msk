/**
 * Grilles adaptatives — largeur du **contenu** (`@container` sur `<main>`),
 * via `auto-fit` + `minmax` (pas de `xl:` viewport).
 *
 * Cible laptop fréquente : **1366×768** + sidebar ≈ **1000–1100 px** utiles.
 * À 100 % zoom, 3 cartes « hub » (~22 rem min) → **2 colonnes** (pas de coupe).
 * Zoom navigateur 75 % n’est **pas** une solution produit.
 *
 * Formule : `minmax(min(100%, Xrem), 1fr)` — X = largeur mini d’une carte ;
 * le nombre de colonnes = floor(largeur_contenu / X).
 */

/** KPI / radial — cartes plus compactes (3–4 cols dès ~1100 px). */
export const gridKpi2 =
  "grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]";

export const gridKpi3 =
  "grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]";

/** 4 KPI max — sur 1366+sidebar ≈ 3 cols ; 4 cols seulement si contenu ≥ ~72 rem. */
export const gridKpi4 =
  "grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16.5rem),1fr))]";

/** 5 KPI max — densifie progressivement. */
export const gridKpi5 =
  "grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]";

/**
 * Hub Commercial (cartes MetricNav + jauges) — min 22 rem :
 * 1366 → 2 cols ; grand écran → 3 cols.
 */
export const gridCards3 =
  "grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]";

/**
 * Section Vente (jusqu’à 4 modules) — min 20 rem :
 * 1366 → 2 cols ; large → 3–4.
 */
export const gridCards4 =
  "grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]";

/** Tuiles GED. */
export const gridGedTiles =
  "grid min-w-0 gap-3 p-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]";
