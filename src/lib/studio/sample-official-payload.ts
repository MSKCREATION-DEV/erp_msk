/**
 * Données d’exemplaire pour `generateOfficialPdfFromTemplate` (alignées
 * sur `legacySamplePdf` dans generate-sample-pdf.ts).
 */
import type { DocumentTemplate } from "@/generated/prisma/client";
import { formatDateFr } from "@/lib/pdf/winansi";
import type { OfficialPdfPayload } from "@/lib/studio/generate-official-pdf";

const demoEmployee = {
  firstName: "Yaye",
  lastName: "Bah",
  email: "y.bah@mskcreation.net",
  jobTitle: "Stagiaire Commerciale",
  address: "Yirimadio, Bamako",
  birthDate: "03/03/2003",
  civility: "Mme" as const,
};

export function sampleOfficialPayloadForTemplate(
  template: DocumentTemplate,
): OfficialPdfPayload {
  const stamp = "EXEMPLE";

  switch (template.type) {
    case "DEVIS":
      return {
        kind: "commercial",
        input: {
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
        },
      };
    case "FACTURE":
      return {
        kind: "commercial",
        input: {
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
        },
      };
    case "CONTRAT_COMMERCIAL":
      return {
        kind: "commercial_contract",
        input: {
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
        },
      };
    case "CONTRAT_TRAVAIL":
      return {
        kind: "rh_contract",
        variant: "TRAVAIL",
        input: {
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
        },
      };
    case "CONTRAT_STAGE":
      return {
        kind: "rh_contract",
        variant: "STAGE",
        input: {
          kind: "STAGE",
          title: "Stagiaire Commerciale",
          startDate: "14/09/2026",
          endDate: "14/03/2027",
          salaryXof: 70_000,
          employee: demoEmployee,
        },
      };
    case "CONTRAT_PRESTA":
      return {
        kind: "rh_contract",
        variant: "PRESTA",
        input: {
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
        },
      };
    case "ATTESTATION_STAGE":
      return {
        kind: "rh_attestation",
        input: {
          employee: {
            firstName: "Assetou",
            lastName: "Mangara",
            jobTitle: "Stagiaire",
          },
          startDate: "01/07/2026",
          endDate: "30/09/2026",
          jobTitle: "Stagiaire Commerciale",
        },
      };
    case "REGLEMENT_INTERIEUR":
      return {
        kind: "rh_reglement",
        input: {
          employee: {
            firstName: "Fatoumata",
            lastName: "Keita",
          },
        },
      };
    case "SOLDE_TOUT_COMPTE":
      return {
        kind: "rh_solde",
        input: {
          employee: {
            firstName: "Assetou",
            lastName: "Mangara",
            address: "Yirimadio",
          },
          amountXof: 85_000,
          paymentRef: "Cheque N°2740277",
        },
      };
    case "FICHE_PAIE":
      return {
        kind: "rh_payslip",
        input: {
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
        },
      };
    case "DOCUMENT_LIBRE":
      return { kind: "blocks_only", context: {} };
    default:
      throw new Error(`Type de gabarit non supporté pour l'exemplaire : ${template.type}`);
  }
}
