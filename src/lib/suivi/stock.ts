import type { SvStockMoveKind } from "@/generated/prisma/client";

/** Unités affichées inventaire Direction (décision H). */
export const SV_STOCK_UNITS = [
  "pièce",
  "paquet",
  "paire",
  "pack",
  "sachet",
] as const;

export type SvStockUnit = (typeof SV_STOCK_UNITS)[number];

export const SV_STOCK_FAMILIES = [
  "Papeterie",
  "Écriture",
  "Bureau",
  "Alimentaire",
  "Hygiène",
  "Informatique",
  "Entretien",
  "Divers",
] as const;

/**
 * Calcule le prochain solde après un mouvement.
 * ADJUST = quantité absolue cible ; IN/OUT = delta.
 */
export function nextStockQuantity(
  current: number,
  kind: SvStockMoveKind,
  quantity: number,
): { nextQty: number; moveQty: number } {
  if (kind === "IN") {
    return { nextQty: current + quantity, moveQty: quantity };
  }
  if (kind === "OUT") {
    return { nextQty: current - quantity, moveQty: quantity };
  }
  const nextQty = quantity;
  return { nextQty, moveQty: Math.abs(nextQty - current) };
}
