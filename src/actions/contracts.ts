"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirectWithFlash } from "@/lib/toast/flash";
import { z } from "zod";
import {
  CatalogPillar,
  ComCompositionSource,
  ComContractFamily,
  ComContractStatus,
  ComDocKind,
  ComQuoteStatus,
  ComServiceKind,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/actions/auth";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/rbac/resolve";
import { buildContractLinesFromQuote } from "@/lib/commercial/contract-from-quote";
import { resolveContractPrestation } from "@/lib/commercial/contract-prestation";
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
  type ContractPdfInput,
  type ContractPdfScope,
} from "@/lib/pdf/commercial";
import { formatDateFr } from "@/lib/pdf/winansi";
import { requireActiveTemplate, resolveTemplateSignature } from "@/lib/studio/engine";
import { generateOfficialPdfFromTemplate } from "@/lib/studio/generate-official-pdf";
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
      lines: {
        orderBy: { sortOrder: "asc" },
        include: {
          catalogOffer: { select: { sku: true, name: true, pillar: true } },
        },
      },
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
    return redirectWithFlash(
      `/commercial/contrats/${existing.id}`,
      "Contrat déjà existant pour ce devis.",
      "info",
    );
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

  const prestationLines = quote.lines.map((l) => ({
    label: l.label,
    isTravel: l.isTravel,
    catalogOffer: l.catalogOffer,
  }));
  const prestation = resolveContractPrestation({
    family: null,
    serviceKind: null,
    scopeJson: null,
    lines: prestationLines,
  });

  let contractId: string;
  try {
    const contract = await prisma.$transaction(async (tx) => {
      const reference = await nextComNumber(ComDocKind.CONTRAT, undefined, tx);
      return tx.comContract.create({
        data: {
          reference,
          /** P3.3 — brouillon honnête : pas d’activation/signature auto. */
          status: ComContractStatus.BROUILLON,
          family: prestation?.family ?? undefined,
          serviceKind: prestation?.serviceKind ?? undefined,
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
  return redirectWithFlash(
    `/commercial/contrats/${contractId}`,
    "Contrat créé.",
  );
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

  /**
   * Auto-génération PDF+GED à la 1ʳᵉ activation (acte de signature) si pas
   * déjà fait — best-effort : une famille/prestation manquante ne doit pas
   * faire échouer l’activation, l’utilisateur garde la génération manuelle
   * sur la fiche contrat (idempotent via `gedDocumentId`).
   */
  let autoPdfSuffix = "";
  if (isFirstActivation) {
    try {
      const pdfRes = await generateContractPdfCore(actor, teamIds, contractId);
      if (pdfRes.ok && pdfRes.documentId) {
        autoPdfSuffix = " — document PDF généré automatiquement";
      }
    } catch {
      // Génération manuelle restera possible depuis la fiche contrat.
    }
  }

  revalidateContractPaths([
    `/commercial/contrats/${contractId}`,
    `/commercial/clients/${contract.clientId}`,
  ]);

  return {
    ok: true,
    message:
      (isFirstActivation
        ? "Contrat signé et activé"
        : "Statut du contrat mis à jour") + autoPdfSuffix,
  };
}

const setContractPrestationSchema = z.object({
  contractId: z.string().min(1),
  family: z.nativeEnum(ComContractFamily),
  serviceKind: z.nativeEnum(ComServiceKind),
});

/** Enregistre famille + nature avant génération PDF (contrats legacy). */
export async function setContractPrestationAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.contrats.manage" });
  const teamIds = await commercialTeamUserIds();
  const parsed = setContractPrestationSchema.safeParse({
    contractId: String(formData.get("contractId") ?? "").trim(),
    family: String(formData.get("family") ?? "").trim(),
    serviceKind: String(formData.get("serviceKind") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: "Famille ou nature invalide" };
  }
  const { contractId, family, serviceKind } = parsed.data;

  const contract = await prisma.comContract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
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

  await prisma.comContract.update({
    where: { id: contractId },
    data: { family, serviceKind },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.contract.prestation",
    entityType: "com_contract",
    entityId: contractId,
    metadata: { family, serviceKind },
  });

  revalidateContractPaths([
    `/commercial/contrats/${contractId}`,
    `/commercial/clients/${contract.clientId}`,
  ]);

  return { ok: true, message: "Nature de prestation enregistrée" };
}

async function ensureContractPrestationForPdf(
  contract: {
    id: string;
    family: ComContractFamily | null;
    serviceKind: ComServiceKind | null;
    scopeJson: unknown;
    lines: Array<{
      label: string;
      billing: string;
      catalogOffer: {
        sku: string;
        name: string;
        pillar: CatalogPillar;
      } | null;
    }>;
  },
  explicit?: { family?: ComContractFamily; serviceKind?: ComServiceKind },
): Promise<{ family: ComContractFamily; serviceKind: ComServiceKind } | null> {
  const resolved = resolveContractPrestation({
    family: explicit?.family ?? contract.family,
    serviceKind: explicit?.serviceKind ?? contract.serviceKind,
    scopeJson: contract.scopeJson,
    lines: contract.lines.map((l) => ({
      label: l.label,
      isTravel: l.billing === "COMPLEMENTAIRE",
      catalogOffer: l.catalogOffer,
    })),
  });
  if (!resolved) return null;

  const family = contract.family ?? resolved.family;
  const serviceKind = contract.serviceKind ?? resolved.serviceKind;

  if (!contract.family || !contract.serviceKind) {
    await prisma.comContract.update({
      where: { id: contract.id },
      data: {
        ...(contract.family ? {} : { family }),
        ...(contract.serviceKind ? {} : { serviceKind }),
      },
    });
  }

  return { family, serviceKind };
}

/**
 * P4 — fondation génération PDF contrat (charte MSK, familles A/B, classement
 * GED « Contrats », `gedDocumentId`). Signature MVP (P4.4) : tampon + date
 * saisie — pas d’e-signature. Idempotent (ne régénère pas si déjà présent).
 *
 * Cœur partagé par l’action manuelle (`generateContractPdfAction`, bouton
 * fiche contrat) et l’auto-déclenchement à la 1ʳᵉ activation
 * (`setContractStatusAction`) — un seul chemin de génération, même
 * idempotence `gedDocumentId`.
 */
async function generateContractPdfCore(
  actor: SessionUser,
  teamIds: string[],
  contractId: string,
  prestationOverride?: { family?: ComContractFamily; serviceKind?: ComServiceKind },
): Promise<ActionResult & { documentId?: string }> {
  const contract = await prisma.comContract.findUnique({
    where: { id: contractId },
    include: {
      client: true,
      lines: {
        orderBy: { sortOrder: "asc" },
        include: {
          catalogOffer: { select: { sku: true, name: true, pillar: true } },
        },
      },
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
  const prestation = await ensureContractPrestationForPdf(
    contract,
    prestationOverride,
  );
  if (!prestation) {
    return {
      ok: false,
      error: "Famille / nature de prestation manquante sur ce contrat",
    };
  }
  const { family, serviceKind } = prestation;

  // Hook Studio documentaire — même registre central que Devis/Facture :
  // signature jamais injectée si `signatureEnabled=false` sur le gabarit
  // `contrat_commercial_msk`, même si le propriétaire a une signature
  // active enregistrée.
  let contractTemplate: Awaited<ReturnType<typeof requireActiveTemplate>>;
  try {
    contractTemplate = await requireActiveTemplate("contrat_commercial_msk");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gabarit indisponible" };
  }
  const signature = await resolveTemplateSignature({
    template: contractTemplate,
    ownerUserId: contract.ownerId,
    signerLabel: `${contract.owner.firstName} ${contract.owner.lastName}`,
  });

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
    pdfBytes = await generateOfficialPdfFromTemplate({
      template: contractTemplate,
      payload: {
        kind: "commercial_contract",
        input: {
          number: contract.reference,
          family,
          serviceKind,
          familyLabel: CONTRACT_FAMILY_LABELS[family],
          serviceKindLabel: SERVICE_KIND_LABELS[serviceKind],
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
        },
      },
      signature: {
        signaturePng: signature.bytes,
        signatureLabel: signature.label,
      },
      strictVariables: true,
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

/** Action serveur — déclenchement manuel (bouton « Générer le contrat »). */
export async function generateContractPdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "com.contrats.manage" });
  const teamIds = await commercialTeamUserIds();
  const contractId = String(formData.get("contractId") ?? "").trim();
  if (!contractId) return { ok: false, error: "Contrat manquant" };

  const familyRaw = String(formData.get("family") ?? "").trim();
  const serviceKindRaw = String(formData.get("serviceKind") ?? "").trim();
  const prestationOverride =
    familyRaw && serviceKindRaw
      ? {
          family: familyRaw as ComContractFamily,
          serviceKind: serviceKindRaw as ComServiceKind,
        }
      : undefined;

  return generateContractPdfCore(actor, teamIds, contractId, prestationOverride);
}
