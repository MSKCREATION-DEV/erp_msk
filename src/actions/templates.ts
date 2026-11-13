"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { TemplateType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { uploadGedObject } from "@/lib/ged/storage";
import { findModelesFolder } from "@/lib/ged/tree";
import { generateSamplePdfForTemplate } from "@/lib/studio/generate-sample-pdf";
import type { ActionResult } from "@/actions/auth";

function modelesFolderFor(type: TemplateType): "Devis" | "Factures" | "Contrats" | "RH" {
  switch (type) {
    case TemplateType.DEVIS:
      return "Devis";
    case TemplateType.FACTURE:
      return "Factures";
    case TemplateType.CONTRAT_COMMERCIAL:
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
    include: { publishedVersion: true },
  });
  if (!template || !template.active) {
    return { ok: false, error: "Gabarit introuvable" };
  }

  const typeFolder = modelesFolderFor(template.type);
  const folder = await findModelesFolder(typeFolder);
  const stamp = Date.now().toString().slice(-6);

  let pdfBytes: Uint8Array;
  let number: string;
  try {
    pdfBytes = await generateSamplePdfForTemplate(template, {
      ownerUserId: actor.id,
      ownerDisplayName: `${actor.firstName} ${actor.lastName}`,
    });
    const prefix =
      template.generatorKind === "ENGINE_BLOCKS"
        ? `${template.code.toUpperCase().slice(0, 12)}-DEMO`
        : "DEMO";
    number = `${prefix}-${stamp}`;
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
