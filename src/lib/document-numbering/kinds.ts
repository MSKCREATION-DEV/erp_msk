export const DOC_NUMBER_KINDS = ["DEVIS", "FACTURE", "AVOIR", "BDC"] as const;
export type DocNumberKind = (typeof DOC_NUMBER_KINDS)[number];

export const DOC_NUMBER_PREFIX: Record<DocNumberKind, string> = {
  DEVIS: "DEV",
  FACTURE: "FAC",
  AVOIR: "AVO",
  BDC: "BDC",
};
