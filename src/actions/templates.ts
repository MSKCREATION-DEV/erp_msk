"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { TemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { generateCommercialPdf } from "@/lib/pdf/commercial";
import { uploadGedObject } from "@/lib/ged/storage";
import { findModelesFolder } from "@/lib/ged/tree";
import type { ActionResult } from "@/actions/auth";

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

  const typeFolder = template.type === TemplateType.DEVIS ? "Devis" : "Factures";
  const folder = await findModelesFolder(typeFolder);
  const number = `${template.type === "DEVIS" ? "D" : "F"}-DEMO-${Date.now().toString().slice(-6)}`;

  const pdfBytes = await generateCommercialPdf({
    type: template.type,
    number,
    clientName: "Client Démo MSK",
    clientAddress: "Bamako, Mali",
    lines: [
      { label: "Prestation conseil digital", qty: 1, unitPrice: 500_000 },
      { label: "Production créative", qty: 2, unitPrice: 150_000 },
    ],
    currency: "XOF",
    vatRate: 18,
  });

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
    metadata: { templateId: template.id, number },
  });

  revalidatePath("/administration/gabarits");
  revalidatePath("/ged");
  return {
    ok: true,
    message: `PDF ${number} généré et classé dans ${folder.path}`,
    documentId: doc.id,
  };
}
