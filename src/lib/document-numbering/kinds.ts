export const DOC_NUMBER_KINDS = [
  "DEVIS",
  "FACTURE",
  "AVOIR",
  "BDC",
  "CONTRAT",
] as const;
export type DocNumberKind = (typeof DOC_NUMBER_KINDS)[number];

export const DOC_NUMBER_PREFIX: Record<DocNumberKind, string> = {
  DEVIS: "DEV",
  FACTURE: "FAC",
  AVOIR: "AVO",
  BDC: "BDC",
  /// Analyse contrats §6.4 / §8 — numérotation `MSK-CONTRAT-YYYY-NNN`.
  CONTRAT: "MSK-CONTRAT",
};

/** Contrats = séquence annuelle (YYYY) — pas journalière comme devis/factures. */
export const YEARLY_DOC_NUMBER_KINDS = new Set<DocNumberKind>(["CONTRAT"]);
