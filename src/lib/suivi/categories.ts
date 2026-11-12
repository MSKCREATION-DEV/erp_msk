/**
 * Taxonomie dépenses Suivi — mapping des libellés seed/Excel vers familles budgétaires.
 * Les strings DB restent inchangées ; le mapping est runtime.
 */

export const SV_CATEGORY_FAMILIES = [
  "alimentation",
  "transport",
  "internet",
  "electricite",
  "loyer",
  "fournitures",
  "salaires",
  "prospection",
  "transfert",
  "encaissement",
  "ouverture",
  "autre",
] as const;

export type SvCategoryFamily = (typeof SV_CATEGORY_FAMILIES)[number];

export const SV_CATEGORY_FAMILY_LABEL: Record<SvCategoryFamily, string> = {
  alimentation: "Alimentation",
  transport: "Transports / carburants",
  internet: "Internet / télécom",
  electricite: "Électricité / EDM",
  loyer: "Loyer",
  fournitures: "Fournitures",
  salaires: "Salaires",
  prospection: "Prospection / RDV",
  transfert: "Banque / transfert",
  encaissement: "Encaissement client",
  ouverture: "Ouverture / bascule",
  autre: "Autre",
};

/** Couleurs MSK (pas de violet AI). */
export const SV_CATEGORY_FAMILY_COLOR: Record<SvCategoryFamily, string> = {
  alimentation: "#FF5A3C",
  transport: "#1D73BC",
  internet: "#00ACEE",
  electricite: "#F59E0B",
  loyer: "#2A3D8E",
  fournitures: "#284393",
  salaires: "#0D1330",
  prospection: "#2A3D8E",
  transfert: "#6B7280",
  encaissement: "#059669",
  ouverture: "#9CA3AF",
  autre: "#64748B",
};

/** Familles exclues de la conso d’activité (budgets / estimation mensuelle). */
export const SV_NON_OPS_FAMILIES: ReadonlySet<SvCategoryFamily> = new Set([
  "transfert",
  "ouverture",
  "encaissement",
]);

const EXACT: Record<string, SvCategoryFamily> = {
  "Transport / carburant": "transport",
  Transport: "transport",
  "Prospection / RDV": "prospection",
  "Banque / transfert": "transfert",
  "Repas / eau": "alimentation",
  Fournitures: "fournitures",
  "Téléphone / Internet": "internet",
  "Électricité / EDM": "electricite",
  Loyer: "loyer",
  Salaires: "salaires",
  "Encaissement client": "encaissement",
  Autre: "autre",
  "Ouverture / bascule": "ouverture",
  "Ouverture / Bascule Direction": "ouverture",
  "Ouverture compte": "ouverture",
  Bascule: "ouverture",
};

export function normalizeSvCategoryFamily(
  raw: string | null | undefined,
): SvCategoryFamily {
  const s = (raw ?? "").trim();
  if (!s) return "autre";
  const exact = EXACT[s];
  if (exact) return exact;

  const lower = s.toLowerCase();
  if (
    lower.includes("carbur") ||
    lower.includes("transport") ||
    lower.includes("taxi") ||
    lower.includes("essence")
  ) {
    return "transport";
  }
  if (
    lower.includes("repas") ||
    lower.includes("eau") ||
    lower.includes("aliment") ||
    lower.includes("nourriture")
  ) {
    return "alimentation";
  }
  if (
    lower.includes("internet") ||
    lower.includes("téléphone") ||
    lower.includes("telephone") ||
    lower.includes("telecom") ||
    lower.includes("télécom") ||
    lower.includes("orange")
  ) {
    return "internet";
  }
  if (
    lower.includes("électricité") ||
    lower.includes("electricite") ||
    lower.includes("edm")
  ) {
    return "electricite";
  }
  if (lower.includes("loyer") || lower.includes("location")) {
    return "loyer";
  }
  if (lower.includes("salaire") || lower.includes("paie")) return "salaires";
  if (lower.includes("fourniture") || lower.includes("bureau")) {
    return "fournitures";
  }
  if (lower.includes("prospection") || lower.includes("rdv")) {
    return "prospection";
  }
  if (
    lower.includes("transfert") ||
    lower.includes("retrait") ||
    lower.includes("versement")
  ) {
    return "transfert";
  }
  if (lower.includes("encaissement") || lower.includes("paiement client")) {
    return "encaissement";
  }
  if (
    lower.includes("ouverture") ||
    lower.includes("bascule") ||
    lower.includes("solde initial")
  ) {
    return "ouverture";
  }
  return "autre";
}

export function isOpsExpenseFamily(family: SvCategoryFamily): boolean {
  return !SV_NON_OPS_FAMILIES.has(family);
}

/** Libellés saisie formulaire (union seed + UI). */
export const SV_MOVEMENT_CATEGORY_OPTIONS = [
  "Transport / carburant",
  "Transport",
  "Prospection / RDV",
  "Banque / transfert",
  "Repas / eau",
  "Fournitures",
  "Téléphone / Internet",
  "Électricité / EDM",
  "Loyer",
  "Salaires",
  "Encaissement client",
  "Ouverture / Bascule Direction",
  "Ouverture / bascule",
  "Autre",
] as const;

export function familyToCategoryFilterValues(
  family: SvCategoryFamily,
): string[] {
  return SV_MOVEMENT_CATEGORY_OPTIONS.filter(
    (c) => normalizeSvCategoryFamily(c) === family,
  ) as string[];
}
