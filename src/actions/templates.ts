"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { TemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { generateCommercialPdf } from "@/lib/pdf/commercial";
import {
  generateAttestationStagePdf,
  generateContractPrestaPdf,
  generateContractStagePdf,
  generateContractTravailPdf,
  generateFichePaiePdf,
  generateReglementInterieurPdf,
  generateSoldeToutComptePdf,
} from "@/lib/pdf/rh";
import { uploadGedObject } from "@/lib/ged/storage";
import { findModelesFolder } from "@/lib/ged/tree";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { formatDateFr } from "@/lib/pdf/winansi";
import type { ActionResult } from "@/actions/auth";

function modelesFolderFor(type: TemplateType): "Devis" | "Factures" | "Contrats" | "RH" {
  switch (type) {
    case TemplateType.DEVIS:
      return "Devis";
    case TemplateType.FACTURE:
      return "Factures";
    case TemplateType.CONTRAT_TRAVAIL:
    case TemplateType.CONTRAT_STAGE:
    case TemplateType.CONTRAT_PRESTA:
      return "Contrats";
    default:
      return "RH";
  }
}

export async function generateDemoPdfAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "cfg.templates" });
  const templateId = String(formData.get("templateId") ?? "");
  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template || !template.active) {
    return { ok: false, error: "Gabarit introuvable" };
  }

  const typeFolder = modelesFolderFor(template.type);
  const folder = await findModelesFolder(typeFolder);
  const stamp = Date.now().toString().slice(-6);

  const signature = await getSignaturePngBytes({
    ownerUserId: actor.id,
  }).catch((e) => {
    console.error("[template] signature introuvable", e);
    return null;
  });

  const sig = {
    signaturePng: signature?.bytes,
    signatureLabel: signature
      ? `${actor.firstName} ${actor.lastName}`
      : undefined,
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

  let pdfBytes: Uint8Array;
  let number: string;
  try {
    switch (template.type) {
      case TemplateType.DEVIS: {
        number = `D-DEMO-${stamp}`;
        pdfBytes = await generateCommercialPdf({
          type: "DEVIS",
          number,
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
        break;
      }
      case TemplateType.FACTURE: {
        number = `F-DEMO-${stamp}`;
        pdfBytes = await generateCommercialPdf({
          type: "FACTURE",
          number,
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
        break;
      }
      case TemplateType.CONTRAT_TRAVAIL: {
        number = `CT-DEMO-${stamp}`;
        pdfBytes = await generateContractTravailPdf({
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
        break;
      }
      case TemplateType.CONTRAT_STAGE: {
        number = `CS-DEMO-${stamp}`;
        pdfBytes = await generateContractStagePdf({
          kind: "STAGE",
          title: "Stagiaire Commerciale",
          startDate: "14/09/2026",
          endDate: "14/03/2027",
          salaryXof: 70_000,
          employee: demoEmployee,
          ...sig,
        });
        break;
      }
      case TemplateType.CONTRAT_PRESTA: {
        number = `CP-DEMO-${stamp}`;
        pdfBytes = await generateContractPrestaPdf({
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
        break;
      }
      case TemplateType.ATTESTATION_STAGE: {
        number = `AT-DEMO-${stamp}`;
        pdfBytes = await generateAttestationStagePdf({
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
        break;
      }
      case TemplateType.REGLEMENT_INTERIEUR: {
        number = `RI-DEMO-${stamp}`;
        pdfBytes = await generateReglementInterieurPdf({
          employee: {
            firstName: "Fatoumata",
            lastName: "Keita",
          },
          ...sig,
        });
        break;
      }
      case TemplateType.SOLDE_TOUT_COMPTE: {
        number = `STC-DEMO-${stamp}`;
        pdfBytes = await generateSoldeToutComptePdf({
          employee: {
            firstName: "Assetou",
            lastName: "Mangara",
            address: "Yirimadio",
          },
          amountXof: 85_000,
          paymentRef: "Cheque N°2740277",
          ...sig,
        });
        break;
      }
      case TemplateType.FICHE_PAIE: {
        number = `PAIE-DEMO-${stamp}`;
        pdfBytes = await generateFichePaiePdf({
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
        break;
      }
      default:
        return { ok: false, error: "Type de gabarit non supporté" };
    }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Generation PDF: ${e.message}`
          : "Echec generation PDF",
    };
  }

  const storagePath = `${folder.path.replace(/^\//, "")}/${number}.pdf`;
  try {
    await uploadGedObject(storagePath, pdfBytes, "application/pdf");
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec Storage",
    };
  }

  const checksum = createHash("sha256").update(pdfBytes).digest("hex");
  const doc = await prisma.document.create({
    data: {
      folderId: folder.id,
      storagePath,
      originalName: `${number}.pdf`,
      mime: "application/pdf",
      size: pdfBytes.byteLength,
      checksum,
      createdById: actor.id,
      links: {
        create: {
          entityType: "template",
          entityId: template.id,
        },
      },
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "template.generate_demo",
    entityType: "document",
    entityId: doc.id,
    metadata: { templateId: template.id, number, type: template.type },
  });

  revalidatePath("/administration/gabarits");
  revalidatePath("/ged");
  return {
    ok: true,
    message: `PDF ${number} généré et classé dans ${folder.path}`,
    documentId: doc.id,
  };
}
