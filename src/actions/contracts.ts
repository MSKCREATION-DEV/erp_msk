"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ComCompositionSource,
  ComContractStatus,
  ComDocKind,
  ComQuoteStatus,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/actions/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { buildContractLinesFromQuote } from "@/lib/commercial/contract-from-quote";
import { ensureClientDocFolder } from "@/lib/commercial/ged-client";
import {
  CONTRACT_FAMILY_LABELS,
  SERVICE_KIND_LABELS,
} from "@/lib/commercial/labels";
import { nextComNumber } from "@/lib/commercial/numbering";
import {
  canAccessComDocForClient,
} from "@/lib/commercial/scope";
import { COM_CLIENT_EVENT, logComClientEvent } from "@/lib/commercial/client-events";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  generateContractPdf,
  type ContractPdfInput,
  type ContractPdfScope,
} from "@/lib/pdf/commercial";
import { formatDateFr } from "@/lib/pdf/winansi";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { uploadGedObject } from "@/lib/ged/storage";
import { prisma } from "@/lib/prisma";

function revalidateContractPaths(paths: string[]) {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/commercial");
  revalidatePath("/commercial/contrats");
}

/**
 * Transforme un devis accepté en contrat avec snapshot des lignes.
 */
export async function createContractFromQuoteAction(
  formData: FormData,
): Promise<ActionResult & { contractId?: string }> {
  const actor = await requireUser({ permission: "com.contrats.manage" });
  const teamIds = await commercialTeamUserIds();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const startRaw = String(formData.get("startDate") ?? "").trim();
  const billingDayRaw = Number.parseInt(
    String(formData.get("billingDay") ?? "5"),
    10,
  );
  const title = String(formData.get("title") ?? "").trim() || null;

  if (!quoteId) return { ok: false, error: "Devis manquant" };

  const quote = await prisma.comQuote.findUnique({
    where: { id: quoteId },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      client: { select: { ownerId: true } },
    },
  });
  if (!quote) return { ok: false, error: "Devis introuvable" };
  if (
    !canAccessComDocForClient(
      actor,
      quote.client.ownerId,
      teamIds,
      quote.ownerId,
    )
  ) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (quote.status !== ComQuoteStatus.ACCEPTE) {
    return { ok: false, error: "Le devis doit être accepté" };
  }

  const existing = await prisma.comContract.findFirst({
    where: { quoteId: quote.id },
    select: { id: true },
  });
  if (existing) {
    redirect(`/commercial/contrats/${existing.id}`);
  }

  const startDate = startRaw ? new Date(startRaw) : new Date();
  const startOk = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const billingDay = Number.isFinite(billingDayRaw)
    ? Math.min(28, Math.max(1, billingDayRaw))
    : 5;

  const lineData = buildContractLinesFromQuote(
    quote.lines.map((l) => ({
      id: l.id,
      label: l.label,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      catalogOfferId: l.catalogOfferId,
      isTravel: l.isTravel,
      sortOrder: l.sortOrder,
    })),
    startOk,
  );

  let contractId: string;
  try {
    const contract = await prisma.$transaction(async (tx) => {
      const reference = await nextComNumber(ComDocKind.CONTRAT, undefined, tx);
      return tx.comContract.create({
        data: {
          reference,
          /** P3.3 — brouillon honnête : pas d’activation/signature auto. */
          status: ComContractStatus.BROUILLON,
          compositionSource: ComCompositionSource.QUOTE,
          title: title ?? quote.object,
          regime: quote.regime,
          currency: quote.currency,
          vatEnabled: quote.vatEnabled,
          vatRate: quote.vatRate,
          billingDay,
          startDate: startOk,
          clientId: quote.clientId,
          quoteId: quote.id,
          ownerId: actor.id,
          createdById: actor.id,
          lines: { create: lineData },
        },
      });
    });
    contractId = contract.id;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec création contrat",
    };
  }

  await logComClientEvent({
    clientId: quote.clientId,
    actorId: actor.id,
    type: COM_CLIENT_EVENT.CONTRACT_CREATED,
    summary: `Contrat brouillon créé depuis le devis ${quote.number ?? quote.draftCode} — signature à confirmer.`,
    entityType: "com_contract",
    entityId: contractId,
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.contract.from_quote",
    entityType: "com_contract",
    entityId: contractId,
    metadata: { quoteId },
  });

  revalidateContractPaths([
    `/commercial/contrats/${contractId}`,
    `/commercial/devis/${quoteId}`,
    `/commercial/clients/${quote.clientId}`,
  ]);
  redirect(`/commercial/contrats/${contractId}`);
}

const setContractStatusSchema = z.object({
  contractId: z.string().min(1),
  status: z.enum(ComContractStatus),
});

/**
 * P3.3 — statut & signature honnêtes : la 1ʳᵉ activation (BROUILLON → ACTIF)
 * est l’acte de signature explicite (`signedAt` posé ici, jamais à la
 * création). Les autres transitions (SUSPENDU/RESILIE/TERMINE) sont de
 * simples changements de cycle de vie, sans toucher à `signedAt`.
 */
export async function setContractStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.contrats.manage" });
  const teamIds = await commercialTeamUserIds();

  const parsed = setContractStatusSchema.safeParse({
    contractId: String(formData.get("contractId") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide" };
  }
  const { contractId, status: next } = parsed.data;

  const contract = await prisma.comContract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      reference: true,
      status: true,
      signedAt: true,
      clientId: true,
      ownerId: true,
      client: { select: { ownerId: true } },
    },
  });
  if (!contract) return { ok: false, error: "Contrat introuvable" };
  if (
    !canAccessComDocForClient(
      actor,
      contract.client.ownerId,
      teamIds,
      contract.ownerId,
    )
  ) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (next === contract.status) {
    return { ok: false, error: "Ce statut est déjà actif" };
  }
  /** Honnêteté signature (B6) : un contrat déjà signé ne redevient jamais brouillon. */
  if (next === ComContractStatus.BROUILLON && contract.signedAt) {
    return {
      ok: false,
      error: "Un contrat déjà signé ne peut pas revenir en brouillon.",
    };
  }

  const isFirstActivation =
    next === ComContractStatus.ACTIF && !contract.signedAt;

  await prisma.$transaction(async (tx) => {
    await tx.comContract.update({
      where: { id: contractId },
      data: {
        status: next,
        ...(isFirstActivation ? { signedAt: new Date() } : {}),
      },
    });
    await logComClientEvent(
      {
        clientId: contract.clientId,
        actorId: actor.id,
        type: isFirstActivation
          ? COM_CLIENT_EVENT.CONTRACT_SIGNED
          : COM_CLIENT_EVENT.CONTRACT_STATUS,
        summary: isFirstActivation
          ? `Contrat ${contract.reference} signé et activé (acte explicite).`
          : `Contrat ${contract.reference} : statut « ${contract.status} » → « ${next} ».`,
        entityType: "com_contract",
        entityId: contractId,
      },
      tx,
    );
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.contract.set_status",
    entityType: "com_contract",
    entityId: contractId,
    metadata: { from: contract.status, to: next, signed: isFirstActivation },
  });

  revalidateContractPaths([
    `/commercial/contrats/${contractId}`,
    `/commercial/clients/${contract.clientId}`,
  ]);

  return {
    ok: true,
    message: isFirstActivation
      ? "Contrat signé et activé"
      : "Statut du contrat mis à jour",
  };
}

/**
 * P4 — fondation génération PDF contrat (charte MSK, familles A/B, classement
 * GED « Contrats », `gedDocumentId`). Signature MVP (P4.4) : tampon + date
 * saisie — pas d’e-signature. Idempotent (ne régénère pas si déjà présent).
 */
export async function generateContractPdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "com.contrats.manage" });
  const teamIds = await commercialTeamUserIds();
  const contractId = String(formData.get("contractId") ?? "").trim();
  if (!contractId) return { ok: false, error: "Contrat manquant" };

  const contract = await prisma.comContract.findUnique({
    where: { id: contractId },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!contract) return { ok: false, error: "Contrat introuvable" };
  if (
    !canAccessComDocForClient(
      actor,
      contract.client.ownerId,
      teamIds,
      contract.ownerId,
    )
  ) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (contract.gedDocumentId) {
    return {
      ok: true,
      message: "PDF déjà généré — ouvrez la miniature",
      documentId: contract.gedDocumentId,
    };
  }
  if (!contract.family || !contract.serviceKind) {
    return {
      ok: false,
      error: "Famille / nature de prestation manquante sur ce contrat",
    };
  }

  const signature = await getSignaturePngBytes({
    ownerUserId: contract.ownerId,
  }).catch(() => null);

  /**
   * Perimetre famille B / parametres famille A — JSON libre (analyse §6.3).
   * Superset de ce que le wizard capture aujourd'hui (contexte/objectifs/
   * livrables/hors-perimetre) : les champs CDC avances (modules, pages,
   * fonctionnalites, roles, planning, ressources client, offre packagee…)
   * sont optionnels et retombent sur des placeholders "---" / "à préciser"
   * dans le PDF tant que le wizard ne les collecte pas (gap résiduel).
   */
  const scopeJson = contract.scopeJson as Partial<ContractPdfScope> & {
    offerTier?: "STANDARD" | "PRO" | "PREMIUM" | "CUSTOM";
    complementaryServices?: ContractPdfInput["complementaryServices"];
  } | null;

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateContractPdf({
      number: contract.reference,
      family: contract.family,
      serviceKind: contract.serviceKind,
      familyLabel: CONTRACT_FAMILY_LABELS[contract.family],
      serviceKindLabel: SERVICE_KIND_LABELS[contract.serviceKind],
      title: contract.title ?? undefined,
      clientName: contract.client.contactName || contract.client.name,
      clientCompany: contract.client.name,
      clientRegistryId: contract.client.taxId ?? undefined,
      clientAddress: [contract.client.address, contract.client.city]
        .filter(Boolean)
        .join(", "),
      clientPhone: contract.client.phone ?? undefined,
      clientEmail: contract.client.email ?? undefined,
      contactName: contract.client.contactName ?? undefined,
      contactTitle: contract.client.contactRole ?? undefined,
      issueDate: formatDateFr(contract.createdAt),
      startDate: contract.startDate ? formatDateFr(contract.startDate) : undefined,
      billingDay: contract.billingDay,
      currency: contract.currency,
      vatRate: contract.vatEnabled ? contract.vatRate : 0,
      lines: contract.lines.map((l) => ({
        label: l.label,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
      paymentTerms: contract.paymentTerms ?? undefined,
      renewalTerms: contract.renewalTerms ?? undefined,
      terminationTerms: contract.terminationTerms ?? undefined,
      offerTier: scopeJson?.offerTier,
      complementaryServices: scopeJson?.complementaryServices,
      scope: scopeJson
        ? {
            interlocutorName: scopeJson.interlocutorName,
            interlocutorTitle: scopeJson.interlocutorTitle,
            location: scopeJson.location,
            currentTools: scopeJson.currentTools,
            contextProblems: scopeJson.contextProblems ?? [],
            visionTarget: scopeJson.visionTarget,
            objectives: scopeJson.objectives ?? [],
            modules: scopeJson.modules,
            pages: scopeJson.pages,
            includedFeatures: scopeJson.includedFeatures,
            roles: scopeJson.roles,
            deliverables: scopeJson.deliverables ?? [],
            planningPhases: scopeJson.planningPhases,
            totalDurationLabel: scopeJson.totalDurationLabel,
            delayRule: scopeJson.delayRule,
            clientResources: scopeJson.clientResources,
            acceptanceDays: scopeJson.acceptanceDays,
            acceptanceChannel: scopeJson.acceptanceChannel,
            outOfScope: scopeJson.outOfScope ?? [],
            maintenanceMention: scopeJson.maintenanceMention,
          }
        : undefined,
      signedAt: contract.signedAt ? formatDateFr(contract.signedAt) : undefined,
      signaturePng: signature?.bytes,
      signatureLabel: signature
        ? `${contract.owner.firstName} ${contract.owner.lastName}`
        : undefined,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Génération PDF: ${e.message}`
          : "Échec génération PDF",
    };
  }

  const folder = await ensureClientDocFolder({
    clientId: contract.clientId,
    type: "Contrats",
    createdById: actor.id,
  });
  const storagePath = `${folder.path.replace(/^\//, "")}/${contract.reference}.pdf`;

  try {
    await uploadGedObject(storagePath, pdfBytes, "application/pdf", {
      upsert: true,
    });
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
      originalName: `${contract.reference}.pdf`,
      mime: "application/pdf",
      size: pdfBytes.byteLength,
      checksum,
      createdById: actor.id,
      links: {
        create: { entityType: "com_contract", entityId: contract.id },
      },
    },
  });

  const claimed = await prisma.comContract.updateMany({
    where: { id: contract.id, gedDocumentId: null },
    data: { gedDocumentId: doc.id },
  });
  if (claimed.count === 0) {
    // Course : un autre PDF a gagné — supprimer le Document orphelin.
    await prisma.document.delete({ where: { id: doc.id } }).catch(() => null);
    const current = await prisma.comContract.findUnique({
      where: { id: contract.id },
      select: { gedDocumentId: true },
    });
    return {
      ok: true,
      message: "PDF déjà généré — ouvrez la miniature",
      documentId: current?.gedDocumentId ?? undefined,
    };
  }

  await logComClientEvent({
    clientId: contract.clientId,
    actorId: actor.id,
    type: COM_CLIENT_EVENT.CONTRACT_STATUS,
    summary: `PDF du contrat ${contract.reference} généré et classé en GED.`,
    entityType: "com_contract",
    entityId: contract.id,
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.contract.pdf",
    entityType: "com_contract",
    entityId: contract.id,
    metadata: { documentId: doc.id },
  });

  revalidateContractPaths([`/commercial/contrats/${contract.id}`]);

  return { ok: true, message: "PDF généré", documentId: doc.id };
}
