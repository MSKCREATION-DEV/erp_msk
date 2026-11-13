/**
 * Studio documentaire — génération d’exemplaire PDF (données d’exemple).
 * Point d’entrée unique pour aperçu, téléchargement et Playground — sans
 * dépendre d’un clic « PDF démo » ni d’un upload GED préalable.
 */
import "server-only";

import type { DocumentTemplate } from "@/generated/prisma/client";
import {
  generateCommercialPdf,
  generateContractPdf,
} from "@/lib/pdf/commercial";
import {
  generateAttestationStagePdf,
  generateContractPrestaPdf,
  generateContractStagePdf,
  generateContractTravailPdf,
  generateFichePaiePdf,
  generateReglementInterieurPdf,
  generateSoldeToutComptePdf,
} from "@/lib/pdf/rh";
import { formatDateFr } from "@/lib/pdf/winansi";
import type { DrawHeaderOptions } from "@/lib/pdf/rh";
import {
  type ActiveTemplate,
  publishedBlocksOf,
  resolveTemplateSignature,
  TemplateNotPublishedError,
} from "@/lib/studio/engine";
import { generateOfficialPdfFromTemplate } from "@/lib/studio/generate-official-pdf";
import { sampleOfficialPayloadForTemplate } from "@/lib/studio/sample-official-payload";
import { buildSampleContextForSlugs } from "@/lib/studio/sample-context";
import { textToBlocks } from "@/lib/studio/dsl";
import { extractVariableSlugs } from "@/lib/studio/variables";
import type { TemplateBlock } from "@/lib/studio/types";

export type GenerateSamplePdfOptions = {
  /** Utilisateur connecté — résolution signature si gabarit ON (ou override). */
  ownerUserId: string;
  ownerDisplayName: string;
  /** Override Playground : forcer signature ON/OFF pour l’aperçu uniquement. */
  signatureOverride?: boolean;
  /** Overrides Playground (`ENGINE_BLOCKS` uniquement). */
  playground?: {
    bodyText?: string;
    blocks?: TemplateBlock[];
    headerTitle?: string;
    logoAlign?: DrawHeaderOptions["logoAlign"];
  };
};

const demoEmployee = {
  firstName: "Yaye",
  lastName: "Bah",
  email: "y.bah@mskcreation.net",
  jobTitle: "Stagiaire Commerciale",
  address: "Yirimadio, Bamako",
  birthDate: "03/03/2003",
  civility: "Mme" as const,
};

async function legacySamplePdf(
  template: DocumentTemplate,
  sig: { signaturePng?: Uint8Array; signatureLabel?: string },
): Promise<Uint8Array> {
  const stamp = "EXEMPLE";

  switch (template.type) {
    case "DEVIS":
      return generateCommercialPdf({
        type: "DEVIS",
        number: `D-${stamp}`,
        clientName: "MARINAS",
        clientAddress: "ACI 2000, Bamako",
        clientPhone: "+223 74 40 00 00",
        object:
          "Gestion professionnelle des reseaux sociaux sur une duree de 3 mois.\r\nMSK CREATION prend en charge l'ensemble de votre presence digitale.",
        missionNote:
          "Creation de contenu, publication, community management et reporting mensuel.",
        lines: [
          {
            label: "Offre STANDARD - gestion reseaux (mensuel)",
            qty: 3,
            unitPrice: 100_000,
          },
          {
            label: "Visuels graphiques additionnels",
            qty: 4,
            unitPrice: 25_000,
          },
        ],
        currency: "FCFA",
        vatRate: 18,
        ...sig,
      });
    case "FACTURE":
      return generateCommercialPdf({
        type: "FACTURE",
        number: `F-${stamp}`,
        clientName: "M. TRAORE",
        clientCompany: "KOUNDJI SERVICES",
        clientAddress: "Agence Immobiliere, Bamako, Mali",
        lines: [
          {
            label:
              "Gestion reseaux sociaux + Maintenance site + Suivi logiciel - tout inclus",
            qty: 1,
            unitPrice: 100_000,
            date: "01/09/2026",
          },
          {
            label:
              "Gestion reseaux sociaux + Maintenance site + Suivi logiciel - tout inclus",
            qty: 1,
            unitPrice: 100_000,
            date: "01/10/2026",
          },
        ],
        currency: "FCFA",
        vatRate: 18,
        ...sig,
      });
    case "CONTRAT_COMMERCIAL":
      return generateContractPdf({
        number: `MSK-CONTRAT-${stamp}`,
        family: "PRESTATION_ABONNEMENT",
        familyLabel: "Prestation / abonnement",
        serviceKind: "RESEAUX_SOCIAUX",
        serviceKindLabel: "Réseaux sociaux",
        clientName: "Awa Traoré",
        clientCompany: "Boutique Awa",
        clientAddress: "Hamdallaye ACI, Bamako",
        clientPhone: "+223 70 00 00 00",
        clientEmail: "awa@boutique-awa.ml",
        contactName: "Awa Traoré",
        offerTier: "PRO",
        startDate: formatDateFr(),
        billingDay: 5,
        currency: "FCFA",
        vatRate: 18,
        lines: [
          {
            label: "CNT-RS-PRO - Réseaux sociaux — Pro",
            qty: 1,
            unitPrice: 150_000,
          },
          {
            label: "OPS-DEPL-1M - Déplacement / captation — 1 mois",
            qty: 1,
            unitPrice: 25_000,
          },
        ],
        complementaryServices: [
          {
            type: "Déplacement / captation — 1 mois",
            tariff: "25 000 FCFA",
            status: "Inclus au contrat",
          },
        ],
        paymentTerms: "Virement bancaire | Orange Money | Wave | Chèque",
        renewalTerms:
          "Le contrat est conclu pour une durée initiale de trois (3) mois. À l'issue, il est renouvelable par périodes d'un (1) mois, sauf dénonciation par l'une des Parties.",
        terminationTerms:
          "À la résiliation : MSK CREATION restitue les accès sous 48 heures ; les sommes dues jusqu'à la date effective restent exigibles.",
        ...sig,
      });
    case "CONTRAT_TRAVAIL":
      return generateContractTravailPdf({
        kind: "TRAVAIL",
        title: "Developpeur Web & Mobile",
        startDate: "17/08/2026",
        salaryXof: 165_000,
        employee: {
          firstName: "Amadou Samba",
          lastName: "Guiro",
          jobTitle: "Developpeur Web & Mobile",
          address: "Kalaban Coura ACI, Bamako",
          birthDate: "04/05/1999",
          idCard: "199 19990504 000037",
        },
        ...sig,
      });
    case "CONTRAT_STAGE":
      return generateContractStagePdf({
        kind: "STAGE",
        title: "Stagiaire Commerciale",
        startDate: "14/09/2026",
        endDate: "14/03/2027",
        salaryXof: 70_000,
        employee: demoEmployee,
        ...sig,
      });
    case "CONTRAT_PRESTA":
      return generateContractPrestaPdf({
        kind: "PRESTA",
        title: "Prestation communication digitale",
        startDate: formatDateFr(),
        endDate: formatDateFr(new Date(Date.now() + 90 * 86400000)),
        salaryXof: 250_000,
        employee: {
          firstName: "Fatoumata",
          lastName: "Diallo",
          jobTitle: "Consultante content",
        },
        ...sig,
      });
    case "ATTESTATION_STAGE":
      return generateAttestationStagePdf({
        employee: {
          firstName: "Assetou",
          lastName: "Mangara",
          jobTitle: "Stagiaire",
        },
        startDate: "01/07/2026",
        endDate: "30/09/2026",
        jobTitle: "Stagiaire Commerciale",
        ...sig,
      });
    case "REGLEMENT_INTERIEUR":
      return generateReglementInterieurPdf({
        employee: {
          firstName: "Fatoumata",
          lastName: "Keita",
        },
        ...sig,
      });
    case "SOLDE_TOUT_COMPTE":
      return generateSoldeToutComptePdf({
        employee: {
          firstName: "Assetou",
          lastName: "Mangara",
          address: "Yirimadio",
        },
        amountXof: 85_000,
        paymentRef: "Cheque N°2740277",
        ...sig,
      });
    case "FICHE_PAIE":
      return generateFichePaiePdf({
        employee: {
          firstName: "Amadou Samba",
          lastName: "Guiro",
          email: "a.guiro@mskcreation.net",
          jobTitle: "Developpeur Web & Mobile",
        },
        periodStart: "01/09/2026",
        periodEnd: "30/09/2026",
        baseSalaryXof: 165_000,
        netSalaryXof: 165_000,
        contractTypeLabel: "CDI",
        leaveBalanceDays: 4,
        leaveTakenDays: 0,
        computedAt: "29/09/2026",
        ...sig,
      });
    default:
      throw new Error(`Type de gabarit non supporté pour l'exemplaire : ${template.type}`);
  }
}

function canGenerateExemplaire(template: DocumentTemplate): boolean {
  if (!template.active) return false;
  if (template.generatorKind === "ENGINE_BLOCKS") {
    return Boolean(template.publishedVersionId);
  }
  return true;
}

export function assertExemplaireAvailable(template: DocumentTemplate): void {
  if (!template.active) {
    throw new Error("Gabarit inactif — exemplaire indisponible");
  }
  if (template.generatorKind === "ENGINE_BLOCKS" && !template.publishedVersionId) {
    throw new TemplateNotPublishedError(template.code);
  }
}

/**
 * Produit un PDF d’exemplaire pour tout gabarit actif (legacy ou Studio).
 */
export async function generateSamplePdfForTemplate(
  template: DocumentTemplate & { publishedVersion?: { bodyJson: unknown; variablesJson: unknown } | null },
  opts: GenerateSamplePdfOptions,
): Promise<Uint8Array> {
  assertExemplaireAvailable(template);

  const signatureEnabled =
    opts.signatureOverride ?? template.signatureEnabled;

  const signature = await resolveTemplateSignature({
    template: { ...template, signatureEnabled },
    ownerUserId: opts.ownerUserId,
    signerLabel: opts.ownerDisplayName,
  });

  const sig = {
    signaturePng: signature.bytes,
    signatureLabel: signature.label,
  };

  if (template.generatorKind === "ENGINE_BLOCKS") {
    if (!template.publishedVersion && !opts.playground?.blocks && !opts.playground?.bodyText) {
      throw new TemplateNotPublishedError(template.code);
    }

    const blocks =
      opts.playground?.blocks ??
      (opts.playground?.bodyText
        ? textToBlocks(opts.playground.bodyText)
        : publishedBlocksOf(template as ActiveTemplate));

    const playgroundOverride = opts.playground?.bodyText || opts.playground?.blocks;
    const declaredSlugs = extractVariableSlugs(
      opts.playground?.bodyText ?? blocks
        .filter((b) => "text" in b && typeof b.text === "string")
        .map((b) => (b as { text: string }).text)
        .join("\n"),
    );
    const sampleContext = await buildSampleContextForSlugs(declaredSlugs);

    const payload = playgroundOverride
      ? {
          kind: "blocks_only" as const,
          context: sampleContext,
          headerTitle: opts.playground?.headerTitle ?? template.name,
        }
      : sampleOfficialPayloadForTemplate(template);

    if (payload.kind === "blocks_only") {
      Object.assign(payload.context, sampleContext);
    }

    return generateOfficialPdfFromTemplate({
      template: template as ActiveTemplate,
      payload,
      signature: sig,
      strictVariables: false,
      logoAlign: opts.playground?.logoAlign,
      blocksOverride: playgroundOverride ? blocks : undefined,
    });
  }

  return legacySamplePdf(template, sig);
}

export { canGenerateExemplaire };
