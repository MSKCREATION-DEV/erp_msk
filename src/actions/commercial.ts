"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ComDocRegime,
  ComInvoiceStatus,
  ComPaymentMethod,
  ComQuoteStatus,
  CrmPipelineStage,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { computeDocTotals } from "@/lib/commercial/totals";
import { nextComNumber } from "@/lib/commercial/numbering";
import { ensureClientDocFolder } from "@/lib/commercial/ged-client";
import { buildClientGedFolderCode } from "@/lib/commercial/ged-folder-code";
import { normalizeClientName } from "@/lib/commercial/labels";
import { canAccessOwned } from "@/lib/commercial/scope";
import { assertLinesAboveFloor } from "@/lib/commercial/floor-price";
import {
  canTransitionQuoteStatus,
  permissionForQuoteStatus,
} from "@/lib/commercial/quote-transitions";
import { crmVisibility } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { generateCommercialPdf } from "@/lib/pdf/commercial";
import { uploadGedObject } from "@/lib/ged/storage";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { formatDateFr } from "@/lib/pdf/winansi";
import type { ActionResult } from "@/actions/auth";

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

async function assertCrmDealAccess(
  actor: Awaited<ReturnType<typeof requireUser>>,
  ownerId: string,
): Promise<boolean> {
  const vis = crmVisibility(actor);
  if (vis === "global") return true;
  if (ownerId === actor.id) return true;
  if (vis === "team") {
    const team = await commercialTeamUserIds();
    return team.includes(ownerId);
  }
  return false;
}

function revalidateCommercial(paths: string[] = []) {
  revalidatePath("/commercial");
  revalidatePath("/commercial/clients");
  revalidatePath("/commercial/devis");
  revalidatePath("/commercial/factures");
  for (const p of paths) revalidatePath(p);
}

function revalidateComptaBridge() {
  revalidatePath("/comptabilite/a-comptabiliser");
  revalidatePath("/comptabilite");
}

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult & { clientId?: string }> {
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
    return tx.comClient.update({
      where: { id: created.id },
      data: {
        gedFolderCode: buildClientGedFolderCode(data.name, created.id),
      },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.create",
    entityType: "com_client",
    entityId: client.id,
  });

  revalidateCommercial([`/commercial/clients/${client.id}`]);
  return { ok: true, message: "Client créé", clientId: client.id };
}

export async function convertOpportunityToClientAction(
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
  const convertible: CrmPipelineStage[] = [
    CrmPipelineStage.INTERESSE,
    CrmPipelineStage.DEVIS_ENVOYE,
    CrmPipelineStage.GAGNE,
  ];
  if (!convertible.includes(stage)) {
    return {
      ok: false,
      error:
        "Création client dès le statut Intéressé (pour devis) ou Client.",
    };
  }
  if (!(await assertCrmDealAccess(actor, deal.ownerId))) {
    return { ok: false, error: "Opportunité hors périmètre CRM" };
  }

  const existing = await prisma.comClient.findFirst({
    where: {
      OR: [
        { sourceOpportunityId: deal.id },
        { crmOrganizationId: deal.organizationId },
      ],
    },
  });
  if (existing) {
    return {
      ok: true,
      message: "Client déjà lié",
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
        email: primary?.email ?? null,
        phone: primary?.phone ?? null,
        city: deal.organization.city,
        country: deal.organization.country,
        notes: deal.organization.notes,
        crmOrganizationId: deal.organizationId,
        sourceOpportunityId: deal.id,
        ownerId: deal.ownerId,
        createdById: actor.id,
      },
    });
    return tx.comClient.update({
      where: { id: created.id },
      data: {
        gedFolderCode: buildClientGedFolderCode(
          deal.organization.name,
          created.id,
        ),
      },
    });
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.client.convert_crm",
    entityType: "com_client",
    entityId: client.id,
    metadata: { opportunityId: deal.id },
  });

  revalidateCommercial([
    `/commercial/clients/${client.id}`,
    `/crm/prospects/${deal.id}`,
  ]);
  return { ok: true, message: "Client créé depuis le CRM", clientId: client.id };
}

export async function createQuoteAction(
  formData: FormData,
): Promise<ActionResult & { quoteId?: string }> {
  const actor = await requireUser({ permission: "com.devis.create" });

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
    includeTravel: formData.get("includeTravel") === "on",
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
    includeTravel,
    promoPercent,
    validUntil,
  } = meta.data;
  const lines = parseLinesJson(String(formData.get("lines") ?? "[]"));

  if (!lines || lines.length === 0) {
    return { ok: false, error: "Au moins une ligne obligatoire" };
  }

  const client = await prisma.comClient.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client introuvable" };
  if (!canAccessOwned(actor, client.ownerId)) {
    return { ok: false, error: "Client hors périmètre" };
  }

  if (opportunityId) {
    const deal = await prisma.crmOpportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, organizationId: true, ownerId: true },
    });
    if (!deal) return { ok: false, error: "Prospect lié introuvable" };
    if (!(await assertCrmDealAccess(actor, deal.ownerId))) {
      return { ok: false, error: "Prospect hors périmètre CRM" };
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
    includeTravel,
  });

  const quote = await prisma.$transaction(async (tx) => {
    const number = await nextComNumber("DEVIS", new Date().getFullYear(), tx);
    return tx.comQuote.create({
      data: {
        number,
        status: ComQuoteStatus.BROUILLON,
        regime: quoteRegime,
        currency,
        vatEnabled,
        vatRate,
        promoEnabled: quotePromo,
        promoPercent,
        includeTravel,
        object,
        missionNote,
        validUntil:
          validUntil && !Number.isNaN(validUntil.getTime()) ? validUntil : null,
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
    });
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
  return { ok: true, message: "Devis créé", quoteId: quote.id };
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

  const quote = await prisma.comQuote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false, error: "Devis introuvable" };
  if (!canAccessOwned(actor, quote.ownerId)) {
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
  } = { status };

  if (status === "ENVOYE") data.sentAt = new Date();
  if (status === "ACCEPTE") data.acceptedAt = new Date();
  if (status === "REFUSE" || status === "ANNULE") {
    data.acceptedAt = null;
  }

  await prisma.$transaction(async (tx) => {
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
        await tx.crmActivity.create({
          data: {
            opportunityId: deal.id,
            organizationId: deal.organizationId,
            type: "NOTE",
            summary: `Devis ${quote.number} marqué envoyé`,
            actorId: actor.id,
          },
        });
      }
    }
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
  if (!canAccessOwned(actor, quote.ownerId)) {
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
      number: quote.number,
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

  await prisma.comQuote.update({
    where: { id: quote.id },
    data: { gedDocumentId: doc.id },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.quote.pdf",
    entityType: "com_quote",
    entityId: quote.id,
    metadata: { documentId: doc.id },
  });

  revalidateCommercial([`/commercial/devis/${quote.id}`, "/ged"]);
  return { ok: true, message: "PDF généré et classé en GED", documentId: doc.id };
}

export async function createInvoiceFromQuoteAction(
  formData: FormData,
): Promise<ActionResult & { invoiceId?: string }> {
  const actor = await requireUser({ permission: "com.factures.create" });
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!quoteId) return { ok: false, error: "Devis manquant" };

  const quote = await prisma.comQuote.findUnique({
    where: { id: quoteId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) return { ok: false, error: "Devis introuvable" };
  if (!canAccessOwned(actor, quote.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (quote.status !== "ACCEPTE" && quote.status !== "ENVOYE") {
    return {
      ok: false,
      error: "Le devis doit être envoyé ou accepté pour facturer",
    };
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const existing = await tx.comInvoice.findUnique({
        where: { quoteId: quote.id },
      });
      if (existing) return { created: false as const, invoice: existing };

      const number = await nextComNumber("FACTURE", new Date().getFullYear(), tx);
      const created = await tx.comInvoice.create({
        data: {
          number,
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
      await writeAudit({
        actorId: actor.id,
        action: "com.invoice.from_quote",
        entityType: "com_invoice",
        entityId: invoice.invoice.id,
        metadata: { quoteId },
      });
    }

    revalidateCommercial([
      `/commercial/factures/${invoice.invoice.id}`,
      `/commercial/devis/${quoteId}`,
    ]);
    return {
      ok: true,
      message: invoice.created ? "Facture créée" : "Facture déjà créée",
      invoiceId: invoice.invoice.id,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await prisma.comInvoice.findUnique({
        where: { quoteId: quote.id },
      });
      if (existing) {
        return {
          ok: true,
          message: "Facture déjà créée",
          invoiceId: existing.id,
        };
      }
    }
    throw e;
  }
}

export async function issueInvoiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.factures.issue" });
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) return { ok: false, error: "Facture manquante" };

  const invoice = await prisma.comInvoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return { ok: false, error: "Facture introuvable" };
  if (!canAccessOwned(actor, invoice.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (invoice.status === "ANNULEE" || invoice.status === "PAYEE") {
    return { ok: false, error: "Statut non modifiable" };
  }

  await prisma.comInvoice.update({
    where: { id: invoiceId },
    data: {
      status:
        invoice.amountPaid > 0
          ? invoice.amountPaid >= invoice.totalTtc
            ? ComInvoiceStatus.PAYEE
            : ComInvoiceStatus.PARTIELLEMENT_PAYEE
          : ComInvoiceStatus.EMISE,
      issuedAt: invoice.issuedAt ?? new Date(),
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.invoice.issue",
    entityType: "com_invoice",
    entityId: invoiceId,
  });

  revalidateCommercial([`/commercial/factures/${invoiceId}`]);
  revalidateComptaBridge();
  return { ok: true, message: "Facture émise" };
}

export async function generateInvoicePdfAction(
  formData: FormData,
): Promise<ActionResult & { documentId?: string }> {
  const actor = await requireUser({ permission: "com.factures.create" });
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
  if (!canAccessOwned(actor, invoice.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (invoice.status === "BROUILLON") {
    return {
      ok: false,
      error: "Émettez la facture avant de générer le PDF",
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
      number: invoice.number,
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

  await prisma.comInvoice.update({
    where: { id: invoice.id },
    data: { gedDocumentId: doc.id },
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.invoice.pdf",
    entityType: "com_invoice",
    entityId: invoice.id,
    metadata: { documentId: doc.id },
  });

  revalidateCommercial([`/commercial/factures/${invoice.id}`, "/ged"]);
  return { ok: true, message: "PDF facture classé en GED", documentId: doc.id };
}

export async function recordPaymentAction(
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser({ permission: "com.paiements.record" });
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

  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          ownerId: string;
          status: ComInvoiceStatus;
          amountPaid: number;
          totalTtc: number;
        }>
      >`
        SELECT id, "ownerId", status, "amountPaid", "totalTtc"
        FROM com_invoices
        WHERE id = ${invoiceId}
        FOR UPDATE
      `;
      const invoice = rows[0];
      if (!invoice) throw new Error("Facture introuvable");
      if (!canAccessOwned(actor, invoice.ownerId)) {
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

      await tx.comPayment.create({
        data: {
          invoiceId,
          amount: amountRaw,
          method,
          note,
          paidAt: paidAtFinal,
          recordedById: actor.id,
        },
      });
      await tx.comInvoice.update({
        where: { id: invoiceId },
        data: { amountPaid, status },
      });
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

  revalidateCommercial([`/commercial/factures/${invoiceId}`]);
  revalidateComptaBridge();
  return { ok: true, message: "Paiement enregistré" };
}
