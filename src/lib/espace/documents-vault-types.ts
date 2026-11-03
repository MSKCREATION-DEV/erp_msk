export type VaultCategory =
  | "all"
  | "identite"
  | "pro"
  | "paie"
  | "internes"
  | "justificatifs"
  | "a_signer";

export const VAULT_CATEGORY_LABEL: Record<VaultCategory, string> = {
  all: "Tous",
  identite: "Identité",
  pro: "Professionnels",
  paie: "Paie",
  internes: "Internes",
  justificatifs: "Justificatifs",
  a_signer: "À signer",
};

export type VaultDoc = {
  id: string;
  title: string;
  originalName: string;
  mime: string;
  size: number;
  createdAt: Date;
  category: Exclude<VaultCategory, "all" | "a_signer"> | "internes";
  kind: string;
  year?: number;
  month?: number;
  needsSignature?: boolean;
  signed?: boolean;
};

export function filterVaultDocs(
  docs: VaultDoc[],
  cat: VaultCategory,
): VaultDoc[] {
  if (cat === "all") return docs;
  if (cat === "a_signer") return docs.filter((d) => d.needsSignature);
  return docs.filter((d) => d.category === cat);
}

export function countByCategory(
  docs: VaultDoc[],
): Record<VaultCategory, number> {
  return {
    all: docs.length,
    identite: docs.filter((d) => d.category === "identite").length,
    pro: docs.filter((d) => d.category === "pro").length,
    paie: docs.filter((d) => d.category === "paie").length,
    internes: docs.filter((d) => d.category === "internes").length,
    justificatifs: docs.filter((d) => d.category === "justificatifs").length,
    a_signer: docs.filter((d) => d.needsSignature).length,
  };
}
