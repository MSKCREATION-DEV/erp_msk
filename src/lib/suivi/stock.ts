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

export type SvStockFamily = (typeof SV_STOCK_FAMILIES)[number];

/**
 * Préfixes codes article — alignés seed Direction (PAP-/ECR-/BUR-/ALI-/HYI-/INF-/ENT-/DIV-).
 */
export const SV_STOCK_FAMILY_PREFIX: Record<SvStockFamily, string> = {
  Papeterie: "PAP",
  Écriture: "ECR",
  Bureau: "BUR",
  Alimentaire: "ALI",
  Hygiène: "HYI",
  Informatique: "INF",
  Entretien: "ENT",
  Divers: "DIV",
};

export function stockFamilyPrefix(family: string): string | null {
  const f = family.trim() as SvStockFamily;
  return SV_STOCK_FAMILY_PREFIX[f] ?? null;
}

/** Ex. PAP-020 → 20 ; codes hors pattern → null. */
export function parseStockCodeSeq(
  code: string,
  prefix: string,
): number | null {
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  const m = code.trim().match(re);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatStockCode(prefix: string, seq: number): string {
  return `${prefix.toUpperCase()}-${String(seq).padStart(3, "0")}`;
}

/**
 * Prochain code pour un préfixe donné, à partir des codes existants (même préfixe).
 * Pure — pour tests / preview ; la création serveur reste atomique (tx + retry).
 */
export function nextStockCodeFromExisting(
  existingCodes: string[],
  prefix: string,
): string {
  let max = 0;
  for (const c of existingCodes) {
    const n = parseStockCodeSeq(c, prefix);
    if (n != null && n > max) max = n;
  }
  return formatStockCode(prefix, max + 1);
}

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
