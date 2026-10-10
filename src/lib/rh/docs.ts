/** Types de lien GED pour documents RH (DocumentLink.entityType). */
export const RH_DOC = {
  CONTRACT: "RhContract:PDF",
  ATTESTATION: "RhEmployee:ATTESTATION",
  REGLEMENT: "RhEmployee:REGLEMENT",
  SOLDE: "RhEmployee:SOLDE",
  FICHE_PAIE: "RhEmployee:FICHE_PAIE",
} as const;

export type RhDocKind = (typeof RH_DOC)[keyof typeof RH_DOC];

export const RH_DOC_LABEL: Record<RhDocKind, string> = {
  [RH_DOC.CONTRACT]: "Contrat",
  [RH_DOC.ATTESTATION]: "Attestation",
  [RH_DOC.REGLEMENT]: "Règlement intérieur",
  [RH_DOC.SOLDE]: "Solde de tout compte",
  [RH_DOC.FICHE_PAIE]: "Fiche de paie",
};

export type LinkedRhDoc = {
  id: string;
  originalName: string;
  createdAt: Date;
  kind: RhDocKind;
  label: string;
};
