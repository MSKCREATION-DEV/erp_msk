import type { TemplateType } from "@/generated/prisma/client";

/** Famille affichée sur /administration/gabarits. */
export type TemplateFamily = "Commercial" | "RH" | "Studio";

/** Ordre d’affichage Commercial : Devis → Facture → Contrat client. */
export const COMMERCIAL_TEMPLATE_ORDER: TemplateType[] = [
  "DEVIS",
  "FACTURE",
  "CONTRAT_COMMERCIAL",
];

/** Ordre RH : Travail → Stage → Prestataire → Attestation → Règlement → Solde → Paie. */
export const RH_TEMPLATE_ORDER: TemplateType[] = [
  "CONTRAT_TRAVAIL",
  "CONTRAT_STAGE",
  "CONTRAT_PRESTA",
  "ATTESTATION_STAGE",
  "REGLEMENT_INTERIEUR",
  "SOLDE_TOUT_COMPTE",
  "FICHE_PAIE",
];

export const TEMPLATE_FAMILY: Record<TemplateType, TemplateFamily> = {
  DEVIS: "Commercial",
  FACTURE: "Commercial",
  CONTRAT_COMMERCIAL: "Commercial",
  CONTRAT_TRAVAIL: "RH",
  CONTRAT_STAGE: "RH",
  CONTRAT_PRESTA: "RH",
  ATTESTATION_STAGE: "RH",
  REGLEMENT_INTERIEUR: "RH",
  SOLDE_TOUT_COMPTE: "RH",
  FICHE_PAIE: "RH",
  DOCUMENT_LIBRE: "Studio",
};

/** Libellés courts badge (type). */
export const TEMPLATE_TYPE_LABEL: Record<TemplateType, string> = {
  DEVIS: "Devis",
  FACTURE: "Facture",
  CONTRAT_COMMERCIAL: "Contrat client",
  CONTRAT_TRAVAIL: "Contrat de travail",
  CONTRAT_STAGE: "Contrat de stage",
  CONTRAT_PRESTA: "Contrat prestataire RH",
  ATTESTATION_STAGE: "Attestation",
  REGLEMENT_INTERIEUR: "Règlement",
  SOLDE_TOUT_COMPTE: "Solde",
  FICHE_PAIE: "Paie",
  DOCUMENT_LIBRE: "Gabarit Studio",
};

/** Commercial = blue, RH = ink, Studio = success (charte admin gabarits). */
export const TEMPLATE_TYPE_TONE: Record<TemplateType, "blue" | "ink" | "success"> = {
  DEVIS: "blue",
  FACTURE: "blue",
  CONTRAT_COMMERCIAL: "blue",
  CONTRAT_TRAVAIL: "ink",
  CONTRAT_STAGE: "ink",
  CONTRAT_PRESTA: "ink",
  ATTESTATION_STAGE: "ink",
  REGLEMENT_INTERIEUR: "ink",
  SOLDE_TOUT_COMPTE: "ink",
  FICHE_PAIE: "ink",
  DOCUMENT_LIBRE: "success",
};

/**
 * Une ligne : à quoi sert le générateur (pas le même texte générique partout).
 * Distinct commercial (agence→client) vs RH presta (MSK = client).
 */
export const TEMPLATE_PURPOSE: Record<TemplateType, string> = {
  DEVIS: "PDF devis client — lignes catalogue, totaux, mentions légales.",
  FACTURE: "PDF facture client — lignes, IBAN, totaux et pied légal.",
  CONTRAT_COMMERCIAL:
    "generateContractPdf — contrat commercial agence → client (familles A/B).",
  CONTRAT_TRAVAIL: "PDF contrat de travail collaborateur MSK.",
  CONTRAT_STAGE: "PDF convention / contrat de stage.",
  CONTRAT_PRESTA:
    "generateContractPrestaPdf — prestataire indépendant (MSK = client).",
  ATTESTATION_STAGE: "PDF attestation de fin / suivi de stage.",
  REGLEMENT_INTERIEUR: "PDF accusé de réception du règlement intérieur.",
  SOLDE_TOUT_COMPTE: "PDF solde de tout compte à la sortie.",
  FICHE_PAIE: "PDF fiche de paie indicative (INPS provisoire).",
  DOCUMENT_LIBRE:
    "Gabarit créé dans le Studio — blocs + variables {{slug}}, versionné, publié explicitement.",
};

export function sortTemplatesByFamilyOrder<T extends { type: TemplateType }>(
  items: T[],
  order: TemplateType[],
): T[] {
  const rank = new Map(order.map((t, i) => [t, i]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.type) ?? 999;
    const rb = rank.get(b.type) ?? 999;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

export function templateSlots(structureJson: unknown): string[] {
  if (!structureJson || typeof structureJson !== "object") return [];
  const slots = (structureJson as { slots?: unknown }).slots;
  if (!Array.isArray(slots)) return [];
  return slots.filter((s): s is string => typeof s === "string");
}

export function templateRef(structureJson: unknown): string | null {
  if (!structureJson || typeof structureJson !== "object") return null;
  const ref = (structureJson as { ref?: unknown }).ref;
  return typeof ref === "string" && ref.trim() ? ref.trim() : null;
}

export function templateGenerator(structureJson: unknown): string | null {
  if (!structureJson || typeof structureJson !== "object") return null;
  const g = (structureJson as { generator?: unknown }).generator;
  return typeof g === "string" && g.trim() ? g.trim() : null;
}
