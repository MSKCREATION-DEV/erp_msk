/**
 * Contenus DSL des 10 gabarits legacy migrés vers `ENGINE_BLOCKS`.
 * Texte repris de `src/lib/pdf/commercial.ts` et `src/lib/pdf/rh.ts` — pas
 * d’invention de clauses. Marqueurs `[[COMPOSITE:…]]` = sections tableau /
 * multipages encore rendues par le générateur historique (charte identique).
 */
import { company } from "@/lib/company";
import {
  achatsLogicielsArticleText,
  confidentialityArticleText,
  disciplineArticleText,
  dispositionsGeneralesArticleText,
  employerIntroText,
  materielArticleText,
  propertyArticleText,
  resiliationArticleText,
  workScheduleArticleText,
} from "@/lib/pdf/rh-clauses";

export type LegacyTemplateDslSpec = {
  code: string;
  body: string;
  changelog: string;
};

const attestationStage = [
  "# Attestation de stage",
  "",
  "La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.",
  "",
  `Je soussigné(e), ${company.managerName}, ${company.managerTitle} de ${company.legalName}, certifie que :`,
  "",
  "> {{collaborateur.civilite}} {{collaborateur.prenom}} {{collaborateur.nom}}",
  "> a effectué un stage de {{collaborateur.fonction}} au sein de {{entreprise.nom}}",
  "> du {{contrat.date_debut}} au {{contrat.date_fin}} — {{contrat.lieu}}",
  "",
  "Au cours de cette période, {{collaborateur.civilite}} {{collaborateur.prenom}} {{collaborateur.nom}} a toujours fait preuve de disponibilité, de dévouement, d'assiduité et de volonté dans les tâches qui lui ont été confiées.",
  "",
  "Son professionnalisme et son esprit d'équipe ont été particulièrement appréciés de ses supérieurs et collègues.",
  "",
  "Fait à Bamako, le {{document.date}}.",
  "",
  `[[SIGNATURE: Pour ${company.legalName} | ]]`,
].join("\n");

const soldeToutCompte = [
  "# Solde de tout compte",
  "",
  "Je soussigné(e) {{collaborateur.prenom}} {{collaborateur.nom}}{{collaborateur.adresse_suffixe}},",
  "",
  "Reconnais avoir reçu de l'entreprise {{entreprise.nom}} {{solde.attestation_clause}}pour solde de tout compte, la somme de {{solde.montant}} {{solde.montant_lettres}}{{solde.reference}}.",
  "",
  "Je reconnais avoir été informé(e) des dispositions légales relatives au présent reçu pour solde de tout compte.",
  "",
  "Fait à Bamako, le {{document.date}}.",
  "",
  "{{collaborateur.prenom}} {{collaborateur.nom}}",
  "",
  "Signature précédée de la mention « Bon pour solde de tout compte »",
  "",
  "[[SIGNATURE: {{collaborateur.prenom}} {{collaborateur.nom}} | ]]",
].join("\n");

const reglementInterieur = [
  "# Règlement intérieur — accusé de réception",
  "",
  `${company.legalName} SARL met à disposition de ses collaborateurs un règlement intérieur (Version 1.0 — 2025) établi en application du Code du travail de la République du Mali (Loi N°92-020) et de l'Acte uniforme OHADA, fixant les règles générales et permanentes relatives à la discipline, à l'hygiène, à la sécurité, à l'usage des ressources numériques et à la protection des données au sein de l'agence. Il est applicable à tous les collaborateurs MSK, quel que soit le type de contrat (CDI, CDD, stage, prestation).`,
  "",
  "# Chapitre I. Organisation du travail et discipline",
  "Embauche et intégration, horaires et durée du travail, pointage et présence, accès aux locaux, absences et retards, conduite et relation clients.",
  "",
  "# Chapitre II. Usage du numérique, réseaux sociaux et confidentialité",
  "Utilisation du matériel et des ressources numériques, réseaux sociaux professionnels, confidentialité client, protection des données personnelles.",
  "",
  "# Chapitre III. Hygiène, sécurité et présentation professionnelle",
  "Hygiène des locaux, sécurité au travail, sécurité des équipements de production, accidents du travail, présentation professionnelle (dress code).",
  "",
  "# Chapitre IV. Sanctions disciplinaires et droits de la défense",
  "Échelle des sanctions (avertissement à licenciement pour faute lourde), garanties de procédure, prescription.",
  "",
  "# Chapitre V. Harcèlement, discriminations et protection des droits",
  "Prévention du harcèlement moral et sexuel, non-discrimination, procédure de signalement.",
  "",
  "# Chapitre VI. Dispositions finales",
  "Révision et mise à jour, entrée en vigueur, annexes (dress code, charte numérique, protection des données, procédures internes).",
  "",
  "Document complet disponible auprès de la Direction et sur l'intranet MSK (SharePoint) ; remis à chaque nouveau collaborateur lors de son intégration et annexé obligatoirement au contrat de travail.",
  "",
  "> Je soussigné(e) {{collaborateur.prenom}} {{collaborateur.nom}}, reconnais avoir reçu, lu et pris connaissance du règlement intérieur de {{entreprise.nom}} (Version 1.0 — 2025) et m'engage à le respecter.",
  "",
  "Date : {{document.date}}",
  "",
  `[[SIGNATURE: Signature du collaborateur | Pour ${company.legalName}]]`,
].join("\n");

function contratTravailDsl(): string {
  return [
    "# Contrat de travail",
    "",
    employerIntroText(),
    "",
    "Et :",
    "",
    "{{collaborateur.civilite}} {{collaborateur.prenom}} {{collaborateur.nom}}{{collaborateur.naissance_suffixe}}{{collaborateur.adresse_suffixe}}{{collaborateur.piece_identite_suffixe}} Ci-après dénommé(e) « le Salarié », d'autre part.",
    "",
    "Il est convenu ce qui suit :",
    "",
    "# Article 1 : Objet du contrat",
    `Le salarié est recruté par la société en qualité de {{collaborateur.fonction}} relevant de la grille interne de classification de ${company.legalName}. Ce poste s'inscrit dans le cadre des dispositions du Code du travail de la République du Mali.`,
    "",
    "# Article 2 : Lieu de travail",
    `Le salarié exercera ses fonctions dans les locaux de ${company.legalName} situés à Bamako, ${company.addressOneLine}. En fonction des nécessités de service, le salarié pourra être amené à se déplacer.`,
    "",
    "# Article 3 : Date d'embauche",
    "{{contrat.date_debut_phrase}}",
    "",
    "# Article 4 : Période d'essai",
    "Période d'essai de {{contrat.periode_essai_mois}} mois, reconduction possible d'1 mois avec accord écrit. Délai de prévenance : 3 semaines pour chaque partie.",
    "",
    "# Article 5 : Durée du travail",
    workScheduleArticleText(),
    "",
    "# Article 6 : Rémunération",
    "{{contrat.remuneration_phrase}}",
    "",
    "# Article 7 : Congés payés",
    "Le salarié bénéficiera de congés payés selon les conditions fixées par les dispositions légales et conventionnelles applicables. Les dates de départ en congé seront fixées en concertation avec l'employeur, en tenant compte des nécessités de service. À l'issue du présent contrat, les congés payés acquis et non pris donneront lieu au versement d'une indemnité compensatrice, calculée sur la base de la rémunération nette perçue par le salarié.",
    "",
    "# Article 8 : Sécurité sociale, retraite et prévoyance",
    "Le salarié est affilié à l'Institut National de Prévoyance Sociale (INPS) pour la couverture des prestations sociales obligatoires, notamment en matière de retraite, de maternité, d'accidents du travail et de maladies professionnelles, conformément aux dispositions légales en vigueur. Il bénéficie également de la Caisse Nationale d'Assurance Maladie (CANAM), au titre de la couverture maladie universelle.",
    "",
    "# Article 9 : Confidentialité",
    confidentialityArticleText("Le salarié"),
    "",
    "# Article 10 : Matériel et outils de travail",
    materielArticleText("Le salarié"),
    "",
    "# Article 11 : Propriété intellectuelle",
    propertyArticleText("Le salarié"),
    "",
    "# Article 12 : Discipline et sanctions",
    disciplineArticleText(),
    "",
    "# Article 13 : Achats de logiciels, licences et ressources",
    achatsLogicielsArticleText("du salarié", "le salarié"),
    "",
    "# Article 14 : Résiliation du contrat",
    resiliationArticleText(),
    "",
    "{{contrat.dispositions_particulieres_block}}",
    "",
    "{{contrat.dispositions_generales_titre}}",
    dispositionsGeneralesArticleText(),
    "",
    "Fait à Bamako, le {{document.date}}, en deux (02) exemplaires originaux, dont un remis à chaque partie.",
    "",
    `[[SIGNATURE: Pour ${company.legalName} | Le Salarié]]`,
  ].join("\n");
}

function contratStageDsl(): string {
  return [
    "# Contrat de stage professionnel",
    "",
    employerIntroText(),
    "",
    "Et :",
    "",
    "{{collaborateur.civilite}} {{collaborateur.prenom}} {{collaborateur.nom}}{{collaborateur.naissance_suffixe}}{{collaborateur.adresse_suffixe}}. Ci-après dénommé(e) « le/la Stagiaire », d'autre part.",
    "",
    "Il est convenu ce qui suit :",
    "",
    "# Article 1 : Objet",
    `Le/la stagiaire est accueilli(e) en qualité de {{collaborateur.fonction}} dans le cadre d'un stage professionnel au sein de ${company.legalName}.`,
    "",
    "# Article 2 : Lieu",
    `Stage effectué à Bamako, ${company.addressOneLine}, sauf déplacements liés à la mission.`,
    "",
    "# Article 3 : Durée",
    "{{contrat.date_debut_phrase_stage}}",
    "",
    "# Article 4 : Horaires",
    workScheduleArticleText(),
    "",
    "# Article 5 : Gratification",
    "{{contrat.gratification_phrase}}",
    "",
    "# Article 6 : Confidentialité",
    confidentialityArticleText("Le/la stagiaire"),
    "",
    "# Article 7 : Matériel et outils de travail",
    materielArticleText("Le/la stagiaire"),
    "",
    "# Article 8 : Propriété intellectuelle",
    propertyArticleText("Le/la stagiaire"),
    "",
    "# Article 9 : Discipline et sanctions",
    disciplineArticleText(),
    "",
    "# Article 10 : Achats de logiciels, licences et ressources",
    achatsLogicielsArticleText("du/de la stagiaire", "le/la stagiaire"),
    "",
    "# Article 11 : Résiliation du contrat",
    resiliationArticleText(),
    "",
    "{{contrat.dispositions_particulieres_block}}",
    "",
    "{{contrat.dispositions_generales_titre_stage}}",
    dispositionsGeneralesArticleText(),
    "",
    "Fait à Bamako, le {{document.date}}, en deux (02) exemplaires originaux.",
    "",
    `[[SIGNATURE: Pour ${company.legalName} | Le/la Stagiaire]]`,
  ].join("\n");
}

const contratPresta = [
  "# Contrat de prestation de services (RH)",
  "",
  "> Gabarit prestataire RH (MSK = Client). Texte intégral, tableaux Parties et clauses réciproques : source `generateContractPrestaPdf` v3 — document de référence « CONTRAT DE PRESTATION DE SERVICES » (OCR ECOSOL).",
  "",
  "[[COMPOSITE: rh_contract_presta]]",
].join("\n");

const devisStandard = [
  "# Devis",
  "",
  "Référence {{document.numero}} — émis le {{document.date}}.",
  "",
  "> Objet : {{devis.objet}}",
  "> Mission : {{devis.mission}}",
  "",
  "Le tableau des prestations, montants HT/TVA/TTC et pied de page légal reprend le gabarit Devis MSK (`generateCommercialPdf`, type DEVIS).",
  "",
  "[[COMPOSITE: commercial_devis]]",
].join("\n");

const factureStandard = [
  "# Facture",
  "",
  "Référence {{document.numero}} — émise le {{document.date}}.",
  "",
  "> Client : {{client.nom}}",
  "",
  "Le tableau des lignes facturées, TVA, soldes reportés éventuels et mentions légales reprend le gabarit Facture MSK (`generateCommercialPdf`, type FACTURE).",
  "",
  "[[COMPOSITE: commercial_facture]]",
].join("\n");

const contratCommercial = [
  "# Contrat de prestation commerciale (client MSK)",
  "",
  "> Contrat multipages avec grilles d'offres, BDC et clauses validation — texte intégral issu de `generateContractPdf` (families PRESTATION / ABONNEMENT, OCR références ECOSOL).",
  "",
  "[[COMPOSITE: commercial_contract]]",
].join("\n");

const fichePaie = [
  "# Bulletin de salaire",
  "",
  "> Document indicatif — cotisations Mali (INPS/CANAM) alignées sur la fiche Guiro 09/2026 ; module Paie finalisera les taux officiels.",
  "",
  "[[COMPOSITE: rh_payslip]]",
].join("\n");

/** Gabarits charges fournisseurs — coque Studio (contenu à valider Direction). */
const factureChargeEdm = [
  "# Facture charge — EDM",
  "",
  "> Gabarit créé à partir de `docs/Fac-edm-octobre.pdf`. OCR / relecture Direction requise avant usage officiel — aucune clause inventée dans ce lot.",
  "",
  "Fournisseur : EDM (Électricité du Mali)",
  "Type : charge interne Suivi — non branché sur génération métier automatique.",
].join("\n");

const factureChargeLoyer = [
  "# Facture charge — Loyer",
  "",
  "> Gabarit créé à partir de `docs/Fac-location-novembre.pdf`. Contenu à valider — statut brouillon Studio.",
  "",
  "Type : charge interne Suivi — non branché sur génération métier automatique.",
].join("\n");

export const LEGACY_TEMPLATE_DSL_SPECS: LegacyTemplateDslSpec[] = [
  {
    code: "devis_standard",
    body: devisStandard,
    changelog: "Migration Studio — texte d’entête + composite commercial_devis.",
  },
  {
    code: "facture_standard",
    body: factureStandard,
    changelog: "Migration Studio — entête + composite commercial_facture.",
  },
  {
    code: "contrat_commercial_msk",
    body: contratCommercial,
    changelog: "Migration Studio — composite commercial_contract (OCR ECOSOL).",
  },
  {
    code: "contrat_travail_msk",
    body: contratTravailDsl(),
    changelog: "Migration Studio — articles 1–16 repris de rh.ts v2.",
  },
  {
    code: "contrat_stage_msk",
    body: contratStageDsl(),
    changelog: "Migration Studio — articles stage repris de rh.ts v2.",
  },
  {
    code: "contrat_presta_msk",
    body: contratPresta,
    changelog: "Migration Studio — composite rh_contract_presta.",
  },
  {
    code: "attestation_stage_msk",
    body: attestationStage,
    changelog: "Migration Studio — texte attestation Mangara v2.",
  },
  {
    code: "reglement_interieur_msk",
    body: reglementInterieur,
    changelog: "Migration Studio — résumé 6 chapitres + accusé (rh.ts).",
  },
  {
    code: "solde_tout_compte_msk",
    body: soldeToutCompte,
    changelog: "Migration Studio — texte solde Mangara v2.",
  },
  {
    code: "fiche_paie_msk",
    body: fichePaie,
    changelog: "Migration Studio — composite rh_payslip.",
  },
];

export const CHARGE_TEMPLATE_DSL_SPECS: LegacyTemplateDslSpec[] = [
  {
    code: "facture_charge_edm_msk",
    body: factureChargeEdm,
    changelog: "Coque depuis docs/Fac-edm-octobre.pdf — à valider.",
  },
  {
    code: "facture_charge_loyer_msk",
    body: factureChargeLoyer,
    changelog: "Coque depuis docs/Fac-location-novembre.pdf — à valider.",
  },
];

export function dslBodyForLegacyCode(code: string): string | undefined {
  return (
    LEGACY_TEMPLATE_DSL_SPECS.find((s) => s.code === code)?.body ??
    CHARGE_TEMPLATE_DSL_SPECS.find((s) => s.code === code)?.body
  );
}
