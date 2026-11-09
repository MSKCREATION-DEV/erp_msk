"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  ComDocRegime,
  ComInvoiceStatus,
  ComPaymentMethod,
  ComQuoteStatus,
  CrmActivityType,
  CrmPipelineStage,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { computeDocTotals } from "@/lib/commercial/totals";
import { nextComNumber } from "@/lib/commercial/numbering";
import { ensureClientDocFolder } from "@/lib/commercial/ged-client";
import { buildClientGedFolderCode } from "@/lib/commercial/ged-folder-code";
import { findClientDuplicateCandidates } from "@/lib/commercial/client-duplicates";
import { displayDocNumber } from "@/lib/commercial/doc-display";
import {
  formatComMoney,
  normalizeClientName,
  PAYMENT_METHOD_LABELS,
} from "@/lib/commercial/labels";
import {
  canAccessComDocForClient,
  canMutateClient,
} from "@/lib/commercial/scope";
import { COM_CLIENT_EVENT, logComClientEvent } from "@/lib/commercial/client-events";
import { assertLinesAboveFloor } from "@/lib/commercial/floor-price";
import {
  canTransitionQuoteStatus,
  permissionForQuoteStatus,
} from "@/lib/commercial/quote-transitions";
import { canTransformProspectToClient } from "@/lib/crm/guide-rules";
import { canMutateCrmDeal } from "@/lib/crm/scope";
import { commercialTeamUserIds, listCommercialRoster } from "@/lib/crm/team";
import { generateCommercialPdf } from "@/lib/pdf/commercial";
import { uploadGedObject } from "@/lib/ged/storage";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { formatDateFr } from "@/lib/pdf/winansi";
import type { ActionResult } from "@/actions/auth";
import {
  COM_DOCS_GATED,
  COM_DOCS_GATED_MESSAGE,
} from "@/lib/commercial/gates";

const regimeSchema = z.nativeEnum(ComDocRegime);
const paymentMethodSchema = z.nativeEnum(ComPaymentMethod);

const cuidSchema = z.string().min(8).max(40);

const createClientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).nullable(),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-mail invalide",
    })
    .transform((v) => (v ? v : null)),
  phone: z.string().trim().max(40).nullable(),
  address: z.string().trim().max(500).nullable(),
  city: z.string().trim().max(120).nullable(),
  country: z.string().trim().min(2).max(8).default("ML"),
  notes: z.string().trim().max(4000).nullable(),
  includeTravelDefault: z.boolean(),
});

const createQuoteMetaSchema = z.object({
  clientId: cuidSchema,
  opportunityId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    cuidSchema.nullable(),
  ),
  object: z.string().trim().max(500).nullable(),
  missionNote: z.string().trim().max(2000).nullable(),
  regime: regimeSchema,
  currency: z.string().trim().min(3).max(8),
  vatEnabled: z.boolean(),
  vatRate: z.number().int().min(0).max(100),
  promoEnabled: z.boolean(),
  promoPercent: z.number().int().min(0).max(100).nullable(),
  includeTravel: z.boolean(),
  validUntil: z.date().nullable(),
});

const lineSchema = z.object({
  label: z.string().min(1).max(500),
  qty: z.number().int().positive().max(10_000),
  unitPrice: z.number().int().min(0).max(1_000_000_000),
  catalogOfferId: z.string().optional().nullable(),
  isTravel: z.boolean().optional(),
});

function parseLinesJson(raw: string): z.infer<typeof lineSchema>[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = z.array(lineSchema).safeParse(parsed);
    return arr.success ? arr.data : null;
  } catch {
    return null;
  }
}

/** LOT-E — conversion / devis liés : écriture réservée à l’affecté (+ reassign / direction). */
function assertCrmDealAccess(
  actor: Awaited<ReturnType<typeof requireUser>>,
  ownerId: string,
): boolean {
  return canMutateCrmDeal(actor, ownerId);
}

function revalidateCommercial(paths: string[] = []) {
  revalidatePath("/commercial");
  revalidatePath("/commercial/clients");
  revalidatePath("/commercial/devis");
  // Ownership facturation/paiements = Comptabilité (ancienne route en redirect).
  revalidatePath("/comptabilite/factures");
  for (const p of paths) revalidatePath(p);
}

function revalidateComptaBridge() {
  revalidatePath("/comptabilite/a-comptabiliser");
  revalidatePath("/comptabilite");
}

async function loadComTeamIds(): Promise<string[]> {
  return commercialTeamUserIds();
}

/** Réassigner le suivi commercial (owner) — collaborateur autorisé à l’affectation CRM. */
const reassignClientOwnerSchema = z.object({
  clientId: cuidSchema,
  ownerId: z.string().uuid(),
});

export async function reassignClientOwnerAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.clients.manage" });
  const parsed = reassignClientOwnerSchema.safeParse({
    clientId: String(formData.get("clientId") ?? "").trim(),
    ownerId: String(formData.get("ownerId") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { clientId, ownerId: newOwnerId } = parsed.data;

  const teamIds = await loadComTeamIds();
  const client = await prisma.comClient.findUnique({
    where: { id: clientId },
    select: { id: true, ownerId: true, name: true },
  });
  if (!client) return { ok: false, error: "Client introuvable." };
  if (!canMutateClient(actor, client.ownerId, teamIds)) {
    return { ok: false, error: "Accès refusé." };
  }
  if (newOwnerId === client.ownerId) {
    return { ok: true, message: "Aucun changement" };
  }

  const assignable = await listCommercialRoster({
    mode: "assign",
    extraIds: [newOwnerId],
  });
  const target = assignable.find((u) => u.id === newOwnerId);
  if (!target) {
    return {
      ok: false,
      error: "Collaborateur introuvable ou non habilité au suivi.",
    };
  }

  const fromLabel = await prisma.user.findUnique({
    where: { id: client.ownerId },
    select: { firstName: true, lastName: true },
  });
  const summary = fromLabel
    ? `Suivi attribué à ${target.firstName} ${target.lastName} (remplace ${fromLabel.firstName} ${fromLabel.lastName}).`
    : `Suivi attribué à ${target.firstName} ${target.lastName}.`;

  await prisma.$transaction(async (tx) => {
    await tx.comClient.update({
      where: { id: clientId },
      data: { ownerId: newOwnerId },
    });
    await logComClientEvent(
      {
        clientId,
        actorId: actor.id,
        type: COM_CLIENT_EVENT.OWNER_CHANGED,
        summary,
        metaJson: {
          fromOwnerId: client.ownerId,
          toOwnerId: newOwnerId,
        },
      },
      tx,
    );
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.reassign_owner",
    entityType: "com_client",
    entityId: clientId,
    metadata: { fromOwnerId: client.ownerId, toOwnerId: newOwnerId },
  });

  revalidateCommercial([`/commercial/clients/${clientId}`]);
  return { ok: true, message: "Suivi mis à jour" };
}

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult & { duplicateClientId?: string }> {
  const actor = await requireUser({ permission: "com.clients.manage" });

  const parsed = createClientSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    country: String(formData.get("country") ?? "ML").trim() || "ML",
    notes: String(formData.get("notes") ?? "").trim() || null,
    includeTravelDefault: formData.get("includeTravelDefault") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  /** P1.3 — anti-doublon : toute correspondance (identique/proche) bloque. */
  const duplicates = await findClientDuplicateCandidates(data.name);
  if (duplicates.length > 0) {
    const first = duplicates[0]!;
    return {
      ok: false,
      error:
        first.kind === "exact"
          ? `Un client « ${first.name} » existe déjà. Ouvrez sa fiche plutôt que d’en recréer une.`
          : `Un client proche existe déjà : « ${first.name} ». Vérifiez avant de continuer.`,
      duplicateClientId: first.id,
    };
  }

  const client = await prisma.$transaction(async (tx) => {
    const created = await tx.comClient.create({
      data: {
        name: data.name,
        normalizedName: normalizeClientName(data.name),
        gedFolderCode: `TMP_${Date.now()}`,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        notes: data.notes,
        includeTravelDefault: data.includeTravelDefault,
        ownerId: actor.id,
        createdById: actor.id,
      },
    });
    const updated = await tx.comClient.update({
      where: { id: created.id },
      data: {
        gedFolderCode: buildClientGedFolderCode(data.name, created.id),
      },
    });
    await logComClientEvent(
      {
        clientId: updated.id,
        actorId: actor.id,
        type: COM_CLIENT_EVENT.CREATED,
        summary: `Client créé : ${updated.name}.`,
      },
      tx,
    );
    return updated;
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.create",
    entityType: "com_client",
    entityId: client.id,
  });

  revalidateCommercial([`/commercial/clients/${client.id}`]);
  // Hors try/catch — voir https://nextjs.org/docs/app/guides/redirecting
  redirect(`/commercial/clients/${client.id}`);
}

export async function updateClientAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.clients.manage" });
  const teamIds = await loadComTeamIds();
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    return { ok: false, error: "Client introuvable." };
  }

  const existing = await prisma.comClient.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      contactName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      notes: true,
      includeTravelDefault: true,
    },
  });
  if (!existing) {
    return { ok: false, error: "Client introuvable." };
  }
  if (!canMutateClient(actor, existing.ownerId, teamIds)) {
    return { ok: false, error: "Accès refusé." };
  }

  const parsed = createClientSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    country: String(formData.get("country") ?? "ML").trim() || "ML",
    notes: String(formData.get("notes") ?? "").trim() || null,
    includeTravelDefault: formData.get("includeTravelDefault") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const changed: string[] = [];
  if (data.name !== existing.name) changed.push("nom");
  if ((data.contactName ?? "") !== (existing.contactName ?? "")) {
    changed.push("contact");
  }
  if ((data.email ?? "") !== (existing.email ?? "")) changed.push("e-mail");
  if ((data.phone ?? "") !== (existing.phone ?? "")) changed.push("téléphone");
  if ((data.address ?? "") !== (existing.address ?? "")) {
    changed.push("adresse");
  }
  if ((data.city ?? "") !== (existing.city ?? "")) changed.push("ville");
  if (data.country !== existing.country) changed.push("pays");
  if ((data.notes ?? "") !== (existing.notes ?? "")) changed.push("notes");
  if (data.includeTravelDefault !== existing.includeTravelDefault) {
    changed.push("déplacement");
  }

  await prisma.comClient.update({
    where: { id: clientId },
    data: {
      name: data.name,
      normalizedName: normalizeClientName(data.name),
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      notes: data.notes,
      includeTravelDefault: data.includeTravelDefault,
    },
  });

  await logComClientEvent({
    clientId,
    actorId: actor.id,
    type: COM_CLIENT_EVENT.UPDATED,
    summary:
      changed.length > 0
        ? `Fiche mise à jour (${changed.join(", ")}).`
        : "Fiche enregistrée (aucun changement détecté).",
    metaJson: { fields: changed },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.update",
    entityType: "com_client",
    entityId: clientId,
  });

  revalidateCommercial([`/commercial/clients/${clientId}`]);
  return { ok: true, message: "Client mis à jour" };
}

/**
 * Prépare un devis depuis la fiche prospect (statut Intéressé) sans convert CRM :
 * crée ou réutilise une `ComClient` liée (`crmOrganizationId` / `sourceOpportunityId`)
 * sans passer le deal en GAGNE (Q1).
 */
export async function ensureProspectClientDraftForQuoteAction(
  formData: FormData,
): Promise<ActionResult & { clientId?: string }> {
  const actor = await requireUser({ permission: "com.clients.manage" });
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  if (!opportunityId) return { ok: false, error: "Opportunité manquante" };

  if (!cuidSchema.safeParse(opportunityId).success) {
    return { ok: false, error: "Opportunité invalide" };
  }

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      organization: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
    },
  });
  if (!deal) return { ok: false, error: "Opportunité introuvable" };

  const stage =
    deal.stage === CrmPipelineStage.NEGOCIATION
      ? CrmPipelineStage.DEVIS_ENVOYE
      : deal.stage;
  if (stage !== CrmPipelineStage.INTERESSE) {
    return {
      ok: false,
      error:
        "Devis possible uniquement au statut Intéressé. Changez d’abord le statut du prospect.",
    };
  }

  if (!assertCrmDealAccess(actor, deal.ownerId)) {
    return { ok: false, error: "Opportunité hors périmètre CRM" };
  }

  const dealId = deal.id;
  const dealOrgId = deal.organizationId;
  const now = new Date();

  const existing = await prisma.comClient.findFirst({
    where: {
      OR: [
        { sourceOpportunityId: dealId },
        { crmOrganizationId: dealOrgId },
      ],
    },
  });

  if (existing) {
    if (
      existing.sourceOpportunityId != null &&
      existing.sourceOpportunityId !== dealId
    ) {
      return {
        ok: false,
        error:
          "Un client commercial existe déjà pour cette organisation via un autre prospect. Ouvrez la fiche client liée.",
      };
    }
    if (existing.crmOrganizationId && existing.crmOrganizationId !== dealOrgId) {
      return { ok: false, error: "Client commercial incompatible avec ce prospect." };
    }

    const needsSourceLink =
      existing.crmOrganizationId === dealOrgId &&
      existing.sourceOpportunityId == null;

    if (needsSourceLink) {
      await prisma.comClient.update({
        where: { id: existing.id },
        data: { sourceOpportunityId: dealId },
      });
    }

    await writeAudit({
      actorId: actor.id,
      action: "com.client.ensure_draft_reuse",
      entityType: "com_client",
      entityId: existing.id,
      metadata: { opportunityId: dealId, backfilledSource: needsSourceLink },
    });

    revalidateCommercial([
      `/commercial/clients/${existing.id}`,
      `/crm/prospects/${dealId}`,
    ]);
    revalidatePath("/crm/prospects");
    revalidatePath("/crm");
    return { ok: true, message: "Client lié", clientId: existing.id };
  }

  const primary = deal.organization.contacts[0];
  const contactName = primary
    ? `${primary.firstName} ${primary.lastName}`.trim()
    : null;

  const client = await prisma.$transaction(async (tx) => {
    const created = await tx.comClient.create({
      data: {
        name: deal.organization.name,
        normalizedName: normalizeClientName(deal.organization.name),
        gedFolderCode: `TMP_${Date.now()}`,
        contactName,
        contactRole: primary?.jobTitle ?? null,
        email: primary?.email ?? null,
        phone: primary?.phone ?? null,
        sector: deal.organization.sector,
        website: deal.organization.website,
        city: deal.organization.city,
        country: deal.organization.country,
        notes: deal.organization.notes,
        crmOrganizationId: dealOrgId,
        sourceOpportunityId: dealId,
        ownerId: deal.ownerId,
        createdById: actor.id,
      },
    });
    const withFolder = await tx.comClient.update({
      where: { id: created.id },
      data: {
        gedFolderCode: buildClientGedFolderCode(
          deal.organization.name,
          created.id,
        ),
      },
    });

    await tx.crmActivity.create({
      data: {
        opportunityId: dealId,
        organizationId: dealOrgId,
        type: CrmActivityType.NOTE,
        summary: "Fiche client commerciale liée (préparation devis)",
        body:
          "Une fiche client minimaliste a été créée pour établir un devis — le statut CRM du prospect n’a pas été modifié.",
        actorId: actor.id,
        occurredAt: now,
      },
    });

    await logComClientEvent(
      {
        clientId: withFolder.id,
        actorId: actor.id,
        type: COM_CLIENT_EVENT.CREATED,
        summary: `Fiche client créée pour devis — prospect « ${deal.organization.name} » (CRM inchangé).`,
        entityType: "crm_opportunity",
        entityId: dealId,
      },
      tx,
    );

    return withFolder;
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.ensure_draft_from_prospect",
    entityType: "com_client",
    entityId: client.id,
    metadata: { opportunityId: dealId },
  });

  revalidateCommercial([`/commercial/clients/${client.id}`, `/crm/prospects/${dealId}`]);
  revalidatePath("/crm/prospects");
  revalidatePath("/crm");
  return {
    ok: true,
    message: "Fiche client liée pour le devis",
    clientId: client.id,
  };
}

export async function convertOpportunityToClientAction(
  formData: FormData,
): Promise<ActionResult & { clientId?: string }> {
  const actor = await requireUser({ permission: "com.clients.manage" });
  const teamIds = await loadComTeamIds();
  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  if (!opportunityId) return { ok: false, error: "Opportunité manquante" };

  if (!cuidSchema.safeParse(opportunityId).success) {
    return { ok: false, error: "Opportunité invalide" };
  }

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      organization: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
    },
  });
  if (!deal) return { ok: false, error: "Opportunité introuvable" };
  if (!canTransformProspectToClient(deal.stage)) {
    return {
      ok: false,
      error:
        "Ce prospect est Perdu — rouvrez le statut ou créez un nouveau prospect avant de transformer en client.",
    };
  }
  if (!assertCrmDealAccess(actor, deal.ownerId)) {
    return { ok: false, error: "Opportunité hors périmètre CRM" };
  }

  const now = new Date();
  const dealId = deal.id;
  const dealOrgId = deal.organizationId;
  const previousWonAt = deal.wonAt;

  const existing = await prisma.comClient.findFirst({
    where: {
      OR: [
        { sourceOpportunityId: dealId },
        { crmOrganizationId: dealOrgId },
      ],
    },
  });

  /** LOT-D : fermer le parcours CRM → statut Client (GAGNE) + wonAt. */
  async function markDealAsWon(
    tx: Prisma.TransactionClient,
    opts: { alreadyWon: boolean },
  ) {
    if (opts.alreadyWon && previousWonAt) return;
    await tx.crmOpportunity.update({
      where: { id: dealId },
      data: {
        stage: CrmPipelineStage.GAGNE,
        wonAt: previousWonAt ?? now,
        lostAt: null,
        lossReason: null,
        lossNote: null,
        lastActivityAt: now,
      },
    });
  }

  if (existing) {
    const alreadyWon = deal.stage === CrmPipelineStage.GAGNE;
    /** P1.4 — multi-deals même org : rattachement explicite (Q7 non tranché, non bloquant). */
    const isMultiDeal =
      existing.sourceOpportunityId != null &&
      existing.sourceOpportunityId !== dealId;
    const multiDealNote = isMultiDeal
      ? ` Dossier multi-deals : client déjà rattaché à un autre prospect (${existing.sourceOpportunityId}).`
      : "";
    if (!alreadyWon || !previousWonAt) {
      await prisma.$transaction(async (tx) => {
        await markDealAsWon(tx, { alreadyWon });
        if (!alreadyWon) {
          await tx.crmActivity.create({
            data: {
              opportunityId: dealId,
              organizationId: dealOrgId,
              type: "NOTE",
              summary: "Dossier passé en Client (lié au client commercial)",
              body: `Client commercial déjà existant : ${existing.name}.${multiDealNote}`,
              actorId: actor.id,
              occurredAt: now,
            },
          });
        }
      });
      await writeAudit({
        actorId: actor.id,
        action: "com.client.convert_crm_sync_stage",
        entityType: "com_client",
        entityId: existing.id,
        metadata: {
          opportunityId: dealId,
          syncedStage: "GAGNE",
          multiDeal: isMultiDeal,
        },
      });
      if (canMutateClient(actor, existing.ownerId, teamIds)) {
        await logComClientEvent({
          clientId: existing.id,
          actorId: actor.id,
          type: COM_CLIENT_EVENT.CRM_CONVERTED,
          summary: isMultiDeal
            ? `Deuxième dossier CRM rattaché à ce client (multi-deals) — prospect « ${deal.organization.name} » passé en Client.`
            : "Prospect passé en Client (CRM) — dossier déjà lié à cette fiche.",
          entityType: "crm_opportunity",
          entityId: dealId,
        });
      }
    }
    revalidateCommercial([
      `/commercial/clients/${existing.id}`,
      `/crm/prospects/${dealId}`,
    ]);
    revalidatePath("/crm/prospects");
    revalidatePath("/crm");
    return {
      ok: true,
      message: isMultiDeal
        ? `Client « ${existing.name} » déjà existant — ce dossier y est rattaché (multi-deals)`
        : "Client déjà lié",
      clientId: existing.id,
    };
  }

  const primary = deal.organization.contacts[0];
  const contactName = primary
    ? `${primary.firstName} ${primary.lastName}`.trim()
    : null;

  const client = await prisma.$transaction(async (tx) => {
    const created = await tx.comClient.create({
      data: {
        name: deal.organization.name,
        normalizedName: normalizeClientName(deal.organization.name),
        gedFolderCode: `TMP_${Date.now()}`,
        contactName,
        contactRole: primary?.jobTitle ?? null,
        email: primary?.email ?? null,
        phone: primary?.phone ?? null,
        sector: deal.organization.sector,
        website: deal.organization.website,
        city: deal.organization.city,
        country: deal.organization.country,
        notes: deal.organization.notes,
        crmOrganizationId: dealOrgId,
        sourceOpportunityId: dealId,
        ownerId: deal.ownerId,
        createdById: actor.id,
      },
    });
    const withFolder = await tx.comClient.update({
      where: { id: created.id },
      data: {
        gedFolderCode: buildClientGedFolderCode(
          deal.organization.name,
          created.id,
        ),
      },
    });

    await markDealAsWon(tx, {
      alreadyWon: deal.stage === CrmPipelineStage.GAGNE,
    });

    await tx.crmActivity.create({
      data: {
        opportunityId: dealId,
        organizationId: dealOrgId,
        type: "NOTE",
        summary: "Transformé en client commercial",
        body: `Client créé : ${withFolder.name} (${withFolder.gedFolderCode}). Statut CRM passé à Client.`,
        actorId: actor.id,
        occurredAt: now,
      },
    });

    await logComClientEvent(
      {
        clientId: withFolder.id,
        actorId: actor.id,
        type: COM_CLIENT_EVENT.CRM_CONVERTED,
        summary: `Client créé depuis le prospect CRM · ${withFolder.name}.`,
        entityType: "crm_opportunity",
        entityId: dealId,
      },
      tx,
    );

    return withFolder;
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.convert_crm",
    entityType: "com_client",
    entityId: client.id,
    metadata: {
      opportunityId: dealId,
      stageSet: "GAGNE",
    },
  });

  revalidateCommercial([
    `/commercial/clients/${client.id}`,
    `/crm/prospects/${dealId}`,
  ]);
  revalidatePath("/crm/prospects");
  revalidatePath("/crm");
  return { ok: true, message: "Client créé depuis le CRM", clientId: client.id };
}

/** Conversion + redirect fiche client (CTA « Transformer en client »). */
export async function convertOpportunityToClientRedirectAction(
  formData: FormData,
): Promise<ActionResult & { clientId?: string }> {
  const res = await convertOpportunityToClientAction(formData);
  if (!res.ok || !res.clientId) return res;
  redirect(`/commercial/clients/${res.clientId}`);
}

export async function createQuoteAction(
  formData: FormData,
): Promise<ActionResult & { quoteId?: string }> {
  if (COM_DOCS_GATED) {
    return { ok: false, error: COM_DOCS_GATED_MESSAGE };
  }
  const actor = await requireUser({ permission: "com.devis.create" });
  const teamIds = await loadComTeamIds();

  const regimeRaw = String(formData.get("regime") ?? "ML");
  const regime = regimeSchema.safeParse(regimeRaw).success
    ? (regimeRaw as ComDocRegime)
    : ComDocRegime.ML;
  const vatRateRaw = Number.parseInt(
    String(formData.get("vatRate") ?? (regime === "FR" ? "20" : "18")),
    10,
  );
  const promoEnabled = formData.get("promoEnabled") === "on";
  const promoPercentRaw = Number.parseInt(
    String(formData.get("promoPercent") ?? ""),
    10,
  );
  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();
  const validUntilDate = validUntilRaw ? new Date(validUntilRaw) : null;
  const opportunityRaw =
    String(formData.get("opportunityId") ?? "").trim() || null;

  const lines = parseLinesJson(String(formData.get("lines") ?? "[]"));
  if (!lines || lines.length === 0) {
    return { ok: false, error: "Au moins une ligne obligatoire" };
  }

  // Déplacement = ligne présente (plus de checkbox UI) — flag dérivé.
  const includeTravel =
    formData.get("includeTravel") === "on" ||
    lines.some((l) => Boolean(l.isTravel));

  const meta = createQuoteMetaSchema.safeParse({
    clientId: String(formData.get("clientId") ?? "").trim(),
    opportunityId: opportunityRaw,
    object: String(formData.get("object") ?? "").trim() || null,
    missionNote: String(formData.get("missionNote") ?? "").trim() || null,
    regime,
    currency:
      String(formData.get("currency") ?? "").trim() ||
      (regime === "FR" ? "EUR" : "XOF"),
    vatEnabled: formData.get("vatEnabled") !== "off",
    vatRate: Number.isFinite(vatRateRaw)
      ? vatRateRaw
      : regime === "FR"
        ? 20
        : 18,
    promoEnabled,
    promoPercent:
      promoEnabled && Number.isFinite(promoPercentRaw) ? promoPercentRaw : null,
    includeTravel,
    validUntil:
      validUntilDate && !Number.isNaN(validUntilDate.getTime())
        ? validUntilDate
        : null,
  });
  if (!meta.success) {
    return {
      ok: false,
      error: meta.error.issues[0]?.message ?? "Données devis invalides",
    };
  }

  const {
    clientId,
    opportunityId,
    object,
    missionNote,
    regime: quoteRegime,
    currency,
    vatEnabled,
    vatRate,
    promoEnabled: quotePromo,
    includeTravel: quoteIncludeTravel,
    promoPercent,
    validUntil,
  } = meta.data;

  const client = await prisma.comClient.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client introuvable" };
  if (!canMutateClient(actor, client.ownerId, teamIds)) {
    return { ok: false, error: "Client hors périmètre" };
  }

  if (opportunityId) {
    const deal = await prisma.crmOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, organizationId: true, ownerId: true, stage: true },
    });
    if (!deal) return { ok: false, error: "Prospect lié introuvable" };
    if (!assertCrmDealAccess(actor, deal.ownerId)) {
      return { ok: false, error: "Prospect hors périmètre CRM" };
    }
    const uiStage =
      deal.stage === CrmPipelineStage.NEGOCIATION
        ? CrmPipelineStage.DEVIS_ENVOYE
        : deal.stage;
    // Un devis lié à un prospect : uniquement au statut Intéressé, et un seul.
    if (uiStage !== CrmPipelineStage.INTERESSE) {
      return {
        ok: false,
        error:
          "Devis possible uniquement au statut Intéressé. Changez d’abord le statut du prospect.",
      };
    }
    const existingCount = await prisma.comQuote.count({
      where: { opportunityId },
    });
    if (existingCount > 0) {
      return {
        ok: false,
        error: "Un devis existe déjà pour ce prospect.",
      };
    }
    if (
      client.crmOrganizationId &&
      client.crmOrganizationId !== deal.organizationId
    ) {
      return {
        ok: false,
        error: "Ce prospect n’appartient pas au client sélectionné",
      };
    }
    if (
      client.sourceOpportunityId &&
      client.sourceOpportunityId !== opportunityId
    ) {
      return {
        ok: false,
        error: "Ce client est déjà lié à un autre prospect",
      };
    }
  }

  const offerIds = [
    ...new Set(
      lines
        .map((l) => l.catalogOfferId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (offerIds.length > 0) {
    const offers = await prisma.catalogOffer.findMany({
      where: { id: { in: offerIds } },
      select: { id: true, name: true, floorPriceXof: true },
    });
    const floorCheck = assertLinesAboveFloor({
      lines,
      offers,
      currency,
    });
    if (!floorCheck.ok) return floorCheck;
  }

  const totals = computeDocTotals({
    lines,
    vatEnabled,
    vatRate,
    promoEnabled: quotePromo,
    promoPercent,
    includeTravel: quoteIncludeTravel,
  });

  let quote: { id: string; draftCode: string; clientId: string };
  try {
    quote = await prisma.$transaction(async (tx) => {
      const draftCode = `DRF-DEV-${nanoid(8)}`;
      return tx.comQuote.create({
        data: {
          draftCode,
          number: null,
          status: ComQuoteStatus.BROUILLON,
          regime: quoteRegime,
          currency,
          vatEnabled,
          vatRate,
          promoEnabled: quotePromo,
          promoPercent,
          includeTravel: quoteIncludeTravel,
          object,
          missionNote,
          validUntil:
            validUntil && !Number.isNaN(validUntil.getTime())
              ? validUntil
              : null,
          totalHt: totals.totalHt,
          totalVat: totals.totalVat,
          totalTtc: totals.totalTtc,
          clientId,
          opportunityId,
          ownerId: actor.id,
          createdById: actor.id,
          lines: {
            create: lines.map((l, i) => ({
              sortOrder: i,
              label: l.label,
              qty: l.qty,
              unitPrice: l.unitPrice,
              catalogOfferId: l.catalogOfferId || null,
              isTravel: Boolean(l.isTravel),
            })),
          },
        },
        select: { id: true, draftCode: true, clientId: true },
      });
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        ok: false,
        error: "Un devis existe déjà pour ce prospect.",
      };
    }
    throw e;
  }

  await logComClientEvent({
    clientId: quote.clientId,
    actorId: actor.id,
    type: COM_CLIENT_EVENT.QUOTE_CREATED,
    summary: `Devis créé (${quote.draftCode}).`,
    entityType: "com_quote",
    entityId: quote.id,
    metaJson: { draftCode: quote.draftCode },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.quote.create",
    entityType: "com_quote",
    entityId: quote.id,
  });

  revalidateCommercial([
    `/commercial/devis/${quote.id}`,
    ...(opportunityId ? [`/crm/prospects/${opportunityId}`] : []),
  ]);

  // https://nextjs.org/docs/app/guides/redirecting
  redirect(`/commercial/devis/${quote.id}`);
}

export async function updateQuoteStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const statusRaw = String(formData.get("status") ?? "");
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!quoteId) return { ok: false, error: "Devis manquant" };

  const statusParse = z.nativeEnum(ComQuoteStatus).safeParse(statusRaw);
  if (!statusParse.success) return { ok: false, error: "Statut invalide" };
  const status = statusParse.data;

  const actor = await requireUser({
    permission: permissionForQuoteStatus(status),
  });
  const teamIds = await loadComTeamIds();

  const quote = await prisma.comQuote.findUnique({
    where: { id: quoteId },
    include: { client: { select: { ownerId: true } } },
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
  if (!canTransitionQuoteStatus(quote.status, status)) {
    return {
      ok: false,
      error: `Transition interdite : ${quote.status} → ${status}`,
    };
  }

  const data: {
    status: ComQuoteStatus;
    sentAt?: Date;
    acceptedAt?: Date | null;
    number?: string;
    issuedAt?: Date;
  } = { status };

  if (status === "ENVOYE" || status === "EMISE") {
    data.sentAt = status === "ENVOYE" ? new Date() : undefined;
    if (!quote.issuedAt) data.issuedAt = new Date();
  }
  if (status === "ACCEPTE") data.acceptedAt = new Date();
  if (status === "REFUSE" || status === "ANNULE") {
    data.acceptedAt = null;
  }

  await prisma.$transaction(async (tx) => {
    // Numéro officiel à l’émission uniquement
    if (
      (status === "ENVOYE" || status === "EMISE") &&
      !quote.number
    ) {
      data.number = await nextComNumber("DEVIS", new Date().getFullYear(), tx);
    }
    await tx.comQuote.update({ where: { id: quoteId }, data });

    // Sync CRM : devis envoyé → statut Devis envoyé (si encore Intéressé / Négociation)
    if (status === "ENVOYE" && quote.opportunityId) {
      const deal = await tx.crmOpportunity.findUnique({
        where: { id: quote.opportunityId },
        select: { id: true, stage: true, organizationId: true },
      });
      if (
        deal &&
        (deal.stage === "INTERESSE" || deal.stage === "NEGOCIATION")
      ) {
        await tx.crmOpportunity.update({
          where: { id: deal.id },
          data: { stage: CrmPipelineStage.DEVIS_ENVOYE },
        });
        const displayNo = data.number ?? quote.number ?? quote.draftCode;
        await tx.crmActivity.create({
          data: {
            opportunityId: deal.id,
            organizationId: deal.organizationId,
            type: "NOTE",
            summary: `Devis ${displayNo} marqué envoyé`,
            actorId: actor.id,
          },
        });
      }
    }
  });

  const QUOTE_STATUS_LABELS_FR: Record<ComQuoteStatus, string> = {
    BROUILLON: "brouillon",
    ENVOYE: "envoyé",
    CONSULTE: "consulté",
    ACCEPTE: "accepté",
    REFUSE: "refusé",
    EXPIRE: "expiré",
    ANNULE: "annulé",
    EMISE: "émis",
  };

  await logComClientEvent({
    clientId: quote.clientId,
    actorId: actor.id,
    type: COM_CLIENT_EVENT.QUOTE_STATUS,
    summary: `Devis · ${QUOTE_STATUS_LABELS_FR[status] ?? status}.`,
    entityType: "com_quote",
    entityId: quoteId,
    metaJson: { from: quote.status, to: status },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.quote.status",
    entityType: "com_quote",
    entityId: quoteId,
    metadata: { from: quote.status, status },
  });

  revalidateCommercial([
    `/commercial/devis/${quoteId}`,
    ...(quote.opportunityId ? [`/crm/prospects/${quote.opportunityId}`] : []),
  ]);
  revalidatePath("/crm");
  return { ok: true, message: "Statut mis à jour" };
}

export async function generateQuotePdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "com.devis.edit_own" });
  const teamIds = await loadComTeamIds();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!quoteId) return { ok: false, error: "Devis manquant" };

  const quote = await prisma.comQuote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, firstName: true, lastName: true } },
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
  if (quote.gedDocumentId) {
    return {
      ok: true,
      message: "PDF déjà généré — ouvrez Voir / Télécharger",
      documentId: quote.gedDocumentId,
    };
  }

  const signature = await getSignaturePngBytes({
    ownerUserId: quote.ownerId,
  }).catch(() => null);

  const lines = quote.lines
    .filter((l) => quote.includeTravel || !l.isTravel)
    .map((l) => ({
      label: l.label,
      qty: l.qty,
      unitPrice: l.unitPrice,
      vatRate: quote.vatEnabled ? quote.vatRate : 0,
    }));

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateCommercialPdf({
      type: "DEVIS",
      number: displayDocNumber(quote.number, quote.draftCode),
      clientName: quote.client.contactName || quote.client.name,
      clientCompany: quote.client.name,
      clientAddress: [quote.client.address, quote.client.city]
        .filter(Boolean)
        .join(", "),
      clientPhone: quote.client.phone ?? undefined,
      issueDate: formatDateFr(quote.createdAt),
      validityDate: quote.validUntil
        ? formatDateFr(quote.validUntil)
        : undefined,
      object: quote.object ?? undefined,
      missionNote: quote.missionNote ?? undefined,
      lines,
      currency: quote.currency === "EUR" ? "EUR" : "FCFA",
      vatRate: quote.vatEnabled ? quote.vatRate : 0,
      signaturePng: signature?.bytes,
      signatureLabel: signature
        ? `${quote.owner.firstName} ${quote.owner.lastName}`
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
    clientId: quote.clientId,
    type: "Devis",
    createdById: actor.id,
  });
  const storagePath = `${folder.path.replace(/^\//, "")}/${quote.number}.pdf`;

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
      originalName: `${quote.number}.pdf`,
      mime: "application/pdf",
      size: pdfBytes.byteLength,
      checksum,
      createdById: actor.id,
      links: {
        create: {
          entityType: "com_quote",
          entityId: quote.id,
        },
      },
    },
  });

  const claimed = await prisma.comQuote.updateMany({
    where: { id: quote.id, gedDocumentId: null },
    data: { gedDocumentId: doc.id },
  });
  if (claimed.count === 0) {
    // Course : un autre PDF a gagné — supprimer le Document orphelin
    // (même chemin Storage que le gagnant → ne pas removeGedObject).
    await prisma.document.delete({ where: { id: doc.id } }).catch(() => null);
    const current = await prisma.comQuote.findUnique({
      where: { id: quote.id },
      select: { gedDocumentId: true },
    });
    return {
      ok: true,
      message: "PDF déjà généré — ouvrez la miniature",
      documentId: current?.gedDocumentId ?? undefined,
    };
  }

  await writeAudit({
    actorId: actor.id,
    action: "com.quote.pdf",
    entityType: "com_quote",
    entityId: quote.id,
    metadata: { documentId: doc.id },
  });

  revalidateCommercial([
    `/commercial/devis/${quote.id}`,
    ...(quote.opportunityId ? [`/crm/prospects/${quote.opportunityId}`] : []),
    "/ged",
  ]);
  return { ok: true, message: "PDF généré et classé en GED", documentId: doc.id };
}

export async function createInvoiceFromQuoteAction(
  formData: FormData,
): Promise<ActionResult & { invoiceId?: string }> {
  if (COM_DOCS_GATED) {
    return { ok: false, error: COM_DOCS_GATED_MESSAGE };
  }
  const actor = await requireUser({ permission: "com.factures.create" });
  const teamIds = await loadComTeamIds();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
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
  if (quote.status !== "ACCEPTE" && quote.status !== "ENVOYE") {
    return {
      ok: false,
      error: "Le devis doit être envoyé ou accepté pour facturer",
    };
  }

  let invoiceId: string;
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const existing = await tx.comInvoice.findFirst({
        where: { quoteId: quote.id },
      });
      if (existing) return { created: false as const, invoice: existing };

      const draftCode = `DRF-FAC-${nanoid(8)}`;
      const created = await tx.comInvoice.create({
        data: {
          draftCode,
          number: null,
          source: "QUOTE",
          status: ComInvoiceStatus.BROUILLON,
          regime: quote.regime,
          currency: quote.currency,
          vatEnabled: quote.vatEnabled,
          vatRate: quote.vatRate,
          object: quote.object,
          totalHt: quote.totalHt,
          totalVat: quote.totalVat,
          totalTtc: quote.totalTtc,
          clientId: quote.clientId,
          quoteId: quote.id,
          ownerId: actor.id,
          createdById: actor.id,
          lines: {
            create: quote.lines.map((l) => ({
              sortOrder: l.sortOrder,
              label: l.label,
              qty: l.qty,
              unitPrice: l.unitPrice,
              catalogOfferId: l.catalogOfferId,
              isTravel: l.isTravel,
            })),
          },
        },
      });
      return { created: true as const, invoice: created };
    });

    if (invoice.created) {
      await logComClientEvent({
        clientId: quote.clientId,
        actorId: actor.id,
        type: COM_CLIENT_EVENT.INVOICE_CREATED,
        summary: `Facture créée depuis le devis (${invoice.invoice.draftCode}).`,
        entityType: "com_invoice",
        entityId: invoice.invoice.id,
        metaJson: { quoteId, draftCode: invoice.invoice.draftCode },
      });
      await writeAudit({
        actorId: actor.id,
        action: "com.invoice.from_quote",
        entityType: "com_invoice",
        entityId: invoice.invoice.id,
        metadata: { quoteId },
      });
    }
    invoiceId = invoice.invoice.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await prisma.comInvoice.findFirst({
        where: { quoteId: quote.id },
      });
      if (existing) {
        invoiceId = existing.id;
      } else {
        throw e;
      }
    } else {
      throw e;
    }
  }

  revalidateCommercial([
    `/comptabilite/factures/${invoiceId}`,
    `/commercial/devis/${quoteId}`,
  ]);
  redirect(`/comptabilite/factures/${invoiceId}`);
}

export async function issueInvoiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.factures.issue" });
  const teamIds = await loadComTeamIds();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) return { ok: false, error: "Facture manquante" };

  const invoice = await prisma.comInvoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { ownerId: true } } },
  });
  if (!invoice) return { ok: false, error: "Facture introuvable" };
  if (
    !canAccessComDocForClient(
      actor,
      invoice.client.ownerId,
      teamIds,
      invoice.ownerId,
    )
  ) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (invoice.status === "ANNULEE" || invoice.status === "PAYEE") {
    return { ok: false, error: "Statut non modifiable" };
  }

  const issuedNumber = await prisma.$transaction(async (tx) => {
    const number =
      invoice.number ??
      (await nextComNumber("FACTURE", new Date().getFullYear(), tx));
    await tx.comInvoice.update({
      where: { id: invoiceId },
      data: {
        number,
        status:
          invoice.amountPaid > 0
            ? invoice.amountPaid >= invoice.totalTtc
              ? ComInvoiceStatus.PAYEE
              : ComInvoiceStatus.PARTIELLEMENT_PAYEE
            : ComInvoiceStatus.EMISE,
        issuedAt: invoice.issuedAt ?? new Date(),
      },
    });
    return number;
  });

  const displayNo = displayDocNumber(issuedNumber ?? null, invoice.draftCode);

  await logComClientEvent({
    clientId: invoice.clientId,
    actorId: actor.id,
    type: COM_CLIENT_EVENT.INVOICE_ISSUED,
    summary: `Facture émise · ${displayNo}.`,
    entityType: "com_invoice",
    entityId: invoiceId,
    metaJson: { number: issuedNumber },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.invoice.issue",
    entityType: "com_invoice",
    entityId: invoiceId,
  });

  revalidateCommercial([`/comptabilite/factures/${invoiceId}`]);
  revalidateComptaBridge();
  return { ok: true, message: "Facture émise" };
}

export async function generateInvoicePdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "com.factures.create" });
  const teamIds = await loadComTeamIds();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) return { ok: false, error: "Facture manquante" };

  const invoice = await prisma.comInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!invoice) return { ok: false, error: "Facture introuvable" };
  if (
    !canAccessComDocForClient(
      actor,
      invoice.client.ownerId,
      teamIds,
      invoice.ownerId,
    )
  ) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (invoice.status === "BROUILLON" || invoice.status === "ANNULEE") {
    return {
      ok: false,
      error:
        invoice.status === "BROUILLON"
          ? "Émettez la facture avant de générer le PDF"
          : "Facture annulée — PDF indisponible",
    };
  }
  if (invoice.gedDocumentId) {
    return {
      ok: true,
      message: "PDF déjà généré — ouvrez Voir / Télécharger",
      documentId: invoice.gedDocumentId,
    };
  }

  const signature = await getSignaturePngBytes({
    ownerUserId: invoice.ownerId,
  }).catch(() => null);

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateCommercialPdf({
      type: "FACTURE",
      number: displayDocNumber(invoice.number, invoice.draftCode),
      clientName: invoice.client.contactName || invoice.client.name,
      clientCompany: invoice.client.name,
      clientAddress: [invoice.client.address, invoice.client.city]
        .filter(Boolean)
        .join(", "),
      clientPhone: invoice.client.phone ?? undefined,
      issueDate: formatDateFr(invoice.issuedAt ?? invoice.createdAt),
      object: invoice.object ?? undefined,
      lines: invoice.lines.map((l) => ({
        label: l.label,
        qty: l.qty,
        unitPrice: l.unitPrice,
        vatRate: invoice.vatEnabled ? invoice.vatRate : 0,
      })),
      currency: invoice.currency === "EUR" ? "EUR" : "FCFA",
      vatRate: invoice.vatEnabled ? invoice.vatRate : 0,
      signaturePng: signature?.bytes,
      signatureLabel: signature
        ? `${invoice.owner.firstName} ${invoice.owner.lastName}`
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
    clientId: invoice.clientId,
    type: "Factures",
    createdById: actor.id,
  });
  const storagePath = `${folder.path.replace(/^\//, "")}/${invoice.number}.pdf`;

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
      originalName: `${invoice.number}.pdf`,
      mime: "application/pdf",
      size: pdfBytes.byteLength,
      checksum,
      createdById: actor.id,
      links: {
        create: {
          entityType: "com_invoice",
          entityId: invoice.id,
        },
      },
    },
  });

  const claimed = await prisma.comInvoice.updateMany({
    where: { id: invoice.id, gedDocumentId: null },
    data: { gedDocumentId: doc.id },
  });
  if (claimed.count === 0) {
    await prisma.document.delete({ where: { id: doc.id } }).catch(() => null);
    const current = await prisma.comInvoice.findUnique({
      where: { id: invoice.id },
      select: { gedDocumentId: true },
    });
    return {
      ok: true,
      message: "PDF déjà généré — ouvrez la miniature",
      documentId: current?.gedDocumentId ?? undefined,
    };
  }

  await writeAudit({
    actorId: actor.id,
    action: "com.invoice.pdf",
    entityType: "com_invoice",
    entityId: invoice.id,
    metadata: { documentId: doc.id },
  });

  revalidateCommercial([
    `/comptabilite/factures/${invoice.id}`,
    `/commercial/clients/${invoice.clientId}`,
    "/ged",
  ]);
  return { ok: true, message: "PDF facture classé en GED", documentId: doc.id };
}

export async function recordPaymentAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.paiements.record" });
  const teamIds = await loadComTeamIds();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const amountRaw = Number.parseInt(
    String(formData.get("amount") ?? "").replace(/\s/g, ""),
    10,
  );
  const methodRaw = String(formData.get("method") ?? "VIREMENT");
  const method = paymentMethodSchema.safeParse(methodRaw).success
    ? (methodRaw as ComPaymentMethod)
    : ComPaymentMethod.VIREMENT;
  const note = String(formData.get("note") ?? "").trim() || null;
  const paidAtRaw = String(formData.get("paidAt") ?? "").trim();
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

  if (!invoiceId) return { ok: false, error: "Facture manquante" };
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const paidAtFinal = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;

  let logClientId: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          clientId: string;
          ownerId: string;
          clientOwnerId: string;
          currency: string;
          status: ComInvoiceStatus;
          amountPaid: number;
          totalTtc: number;
        }>
      >`
        SELECT i.id, i."clientId", i."ownerId", c."ownerId" AS "clientOwnerId", i.currency, i.status, i."amountPaid", i."totalTtc"
        FROM com_invoices i
        JOIN com_clients c ON c.id = i."clientId"
        WHERE i.id = ${invoiceId}
        FOR UPDATE
      `;
      const invoice = rows[0];
      if (!invoice) throw new Error("Facture introuvable");
      if (
        !canAccessComDocForClient(
          actor,
          invoice.clientOwnerId,
          teamIds,
          invoice.ownerId,
        )
      ) {
        throw new Error("Hors périmètre");
      }
      if (
        invoice.status === ComInvoiceStatus.ANNULEE ||
        invoice.status === ComInvoiceStatus.BROUILLON
      ) {
        throw new Error("Émettre la facture avant paiement");
      }
      const remaining = invoice.totalTtc - invoice.amountPaid;
      if (amountRaw > remaining) {
        throw new Error(
          remaining <= 0
            ? "Facture déjà soldée"
            : `Montant supérieur au reste dû (${remaining})`,
        );
      }

      const amountPaid = invoice.amountPaid + amountRaw;
      const status =
        amountPaid >= invoice.totalTtc
          ? ComInvoiceStatus.PAYEE
          : ComInvoiceStatus.PARTIELLEMENT_PAYEE;

      const payment = await tx.comPayment.create({
        data: {
          clientId: invoice.clientId,
          invoiceId,
          amount: amountRaw,
          method,
          note,
          paidAt: paidAtFinal,
          recordedById: actor.id,
        },
      });
      await tx.comPaymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId,
          amount: amountRaw,
        },
      });
      await tx.comInvoice.update({
        where: { id: invoiceId },
        data: { amountPaid, status },
      });
      logClientId = invoice.clientId;
      await logComClientEvent(
        {
          clientId: invoice.clientId,
          actorId: actor.id,
          type: COM_CLIENT_EVENT.PAYMENT_RECORDED,
          summary: `Paiement enregistré · ${formatComMoney(amountRaw, invoice.currency)} (${PAYMENT_METHOD_LABELS[method]}).`,
          entityType: "com_invoice",
          entityId: invoiceId,
          metaJson: { amount: amountRaw, method },
        },
        tx,
      );
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Échec enregistrement paiement",
    };
  }

  await writeAudit({
    actorId: actor.id,
    action: "com.payment.record",
    entityType: "com_invoice",
    entityId: invoiceId,
    metadata: { amount: amountRaw, method },
  });

  revalidateCommercial(
    logClientId
      ? [`/comptabilite/factures/${invoiceId}`, `/commercial/clients/${logClientId}`]
      : [`/comptabilite/factures/${invoiceId}`],
  );
  revalidateComptaBridge();
  return { ok: true, message: "Paiement enregistré" };
}
