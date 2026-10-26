/**
 * Grilles adaptatives — basées sur la **largeur du conteneur** (`@container`
 * sur `<main>`), pas sur le viewport.
 *
 * Problème observé (machines laptop / DPI Windows) :
 * viewport ≥ 1280px (`xl:`) force 4–5 colonnes alors que la sidebar (~248px)
 * + paddings laissent ~950–1100px de contenu → cartes KPI écrasées / mélangées.
 *
 * Seuils en rem du **conteneur app** (après sidebar).
 */
export const gridKpi2 =
  "grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2";

export const gridKpi3 =
  "grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[52rem]:grid-cols-3";

/** 4 KPI / radial cards — 4 cols seulement si le contenu est assez large. */
export const gridKpi4 =
  "grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[64rem]:grid-cols-4";

/** 5 KPI (ex. rapport semaine + stocks) — 5 cols sur grand contenu uniquement. */
export const gridKpi5 =
  "grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[48rem]:grid-cols-3 @min-[76rem]:grid-cols-5";

/** Cartes hub / listes de modules (3 cols). */
export const gridCards3 =
  "grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[52rem]:grid-cols-3";

/** Cartes hub 4 cols. */
export const gridCards4 =
  "grid min-w-0 gap-3 grid-cols-1 @min-[28rem]:grid-cols-2 @min-[64rem]:grid-cols-4";

/**
 * Tuiles GED (vue grille) — densifie seulement si le contenu le permet.
 * Ancien : `grid-cols-2 … xl:grid-cols-5` (viewport) trop agressif avec sidebar.
 */
export const gridGedTiles =
  "grid min-w-0 gap-3 grid-cols-2 p-4 @min-[36rem]:grid-cols-3 @min-[52rem]:grid-cols-4 @min-[72rem]:grid-cols-5";
