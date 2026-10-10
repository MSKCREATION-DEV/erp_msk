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
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { writeAudit } from "@/lib/audit";
import { computeDocTotals } from "@/lib/commercial/totals";
import { nextComNumber } from "@/lib/commercial/numbering";
import { ensureClientDocFolder } from "@/lib/commercial/ged-client";
import { normalizeClientName } from "@/lib/commercial/labels";
import { canAccessOwned } from "@/lib/commercial/scope";
import { generateCommercialPdf } from "@/lib/pdf/commercial";
import { uploadGedObject } from "@/lib/ged/storage";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { formatDateFr } from "@/lib/pdf/winansi";
import type { ActionResult } from "@/actions/auth";

const regimeSchema = z.nativeEnum(ComDocRegime);
const paymentMethodSchema = z.nativeEnum(ComPaymentMethod);

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

function revalidateCommercial(paths: string[] = []) {
  revalidatePath("/commercial");
  revalidatePath("/commercial/clients");
  revalidatePath("/commercial/devis");
  revalidatePath("/commercial/factures");
  for (const p of paths) revalidatePath(p);
}

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult & { clientId?: string }> {
  const actor = await requireUser({ permission: "com.clients.manage" });

  const name = String(formData.get("name") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "ML").trim() || "ML";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const includeTravelDefault = formData.get("includeTravelDefault") === "on";

  if (!name) return { ok: false, error: "Nom client obligatoire" };

  const client = await prisma.comClient.create({
    data: {
      name,
      normalizedName: normalizeClientName(name),
      contactName,
      email,
      phone,
      address,
      city,
      country,
      notes,
      includeTravelDefault,
      ownerId: actor.id,
      createdById: actor.id,
    },
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

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      organization: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
    },
  });
  if (!deal) return { ok: false, error: "Opportunité introuvable" };
  if (deal.stage !== CrmPipelineStage.GAGNE) {
    return { ok: false, error: "Seuls les deals Gagné peuvent être convertis" };
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

  const client = await prisma.comClient.create({
    data: {
      name: deal.organization.name,
      normalizedName: normalizeClientName(deal.organization.name),
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

  const clientId = String(formData.get("clientId") ?? "").trim();
  const opportunityId =
    String(formData.get("opportunityId") ?? "").trim() || null;
  const object = String(formData.get("object") ?? "").trim() || null;
  const missionNote = String(formData.get("missionNote") ?? "").trim() || null;
  const regimeRaw = String(formData.get("regime") ?? "ML");
  const regime = regimeSchema.safeParse(regimeRaw).success
    ? (regimeRaw as ComDocRegime)
    : ComDocRegime.ML;
  const currency =
    String(formData.get("currency") ?? "").trim() ||
    (regime === "FR" ? "EUR" : "XOF");
  const vatEnabled = formData.get("vatEnabled") !== "off";
  const vatRateRaw = Number.parseInt(
    String(formData.get("vatRate") ?? (regime === "FR" ? "20" : "18")),
    10,
  );
  const vatRate = Number.isFinite(vatRateRaw)
    ? vatRateRaw
    : regime === "FR"
      ? 20
      : 18;
  const promoEnabled = formData.get("promoEnabled") === "on";
  const promoPercentRaw = Number.parseInt(
    String(formData.get("promoPercent") ?? ""),
    10,
  );
  const promoPercent =
    promoEnabled && Number.isFinite(promoPercentRaw) ? promoPercentRaw : null;
  const includeTravel = formData.get("includeTravel") === "on";
  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;
  const lines = parseLinesJson(String(formData.get("lines") ?? "[]"));

  if (!clientId) return { ok: false, error: "Client obligatoire" };
  if (!lines || lines.length === 0) {
    return { ok: false, error: "Au moins une ligne obligatoire" };
  }

  const client = await prisma.comClient.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client introuvable" };
  if (!canAccessOwned(actor, client.ownerId) && client.ownerId !== actor.id) {
    // Créateur peut créer un devis même si client d'un autre si manage + global
    if (!hasPermission(actor, "com.reports.view") && !actor.isSuperAdmin) {
      if (client.ownerId !== actor.id) {
        return { ok: false, error: "Client hors périmètre" };
      }
    }
  }

  const totals = computeDocTotals({
    lines,
    vatEnabled,
    vatRate,
    promoEnabled,
    promoPercent,
    includeTravel,
  });

  const quote = await prisma.$transaction(async (tx) => {
    const number = await nextComNumber("DEVIS", new Date().getFullYear(), tx);
    return tx.comQuote.create({
      data: {
        number,
        status: ComQuoteStatus.BROUILLON,
        regime,
        currency,
        vatEnabled,
        vatRate,
        promoEnabled,
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

  revalidateCommercial([`/commercial/devis/${quote.id}`]);
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

  let permission = "com.devis.edit_own";
  if (status === "ENVOYE") permission = "com.devis.send";
  if (status === "ACCEPTE" || status === "REFUSE") {
    permission = "com.devis.accept_reject";
  }
  const actor = await requireUser({ permission });

  const quote = await prisma.comQuote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false, error: "Devis introuvable" };
  if (!canAccessOwned(actor, quote.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }

  const data: {
    status: ComQuoteStatus;
    sentAt?: Date;
    acceptedAt?: Date | null;
  } = { status };

  if (status === "ENVOYE") data.sentAt = new Date();
  if (status === "ACCEPTE") data.acceptedAt = new Date();
  if (status === "REFUSE" || status === "ANNULE" || status === "BROUILLON") {
    data.acceptedAt = null;
  }

  await prisma.comQuote.update({ where: { id: quoteId }, data });

  await writeAudit({
    actorId: actor.id,
    action: "com.quote.status",
    entityType: "com_quote",
    entityId: quoteId,
    metadata: { status },
  });

  revalidateCommercial([`/commercial/devis/${quoteId}`]);
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
    },
  });
  if (!quote) return { ok: false, error: "Devis introuvable" };
  if (!canAccessOwned(actor, quote.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }

  const signature = await getSignaturePngBytes({
    ownerUserId: actor.id,
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
        ? `${actor.firstName} ${actor.lastName}`
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
    clientName: quote.client.name,
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

  const existing = await prisma.comInvoice.findFirst({
    where: { quoteId: quote.id },
  });
  if (existing) {
    return {
      ok: true,
      message: "Facture déjà créée",
      invoiceId: existing.id,
    };
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextComNumber("FACTURE", new Date().getFullYear(), tx);
    return tx.comInvoice.create({
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
  });

  await writeAudit({
    actorId: actor.id,
    action: "com.invoice.from_quote",
    entityType: "com_invoice",
    entityId: invoice.id,
    metadata: { quoteId },
  });

  revalidateCommercial([
    `/commercial/factures/${invoice.id}`,
    `/commercial/devis/${quoteId}`,
  ]);
  return { ok: true, message: "Facture créée", invoiceId: invoice.id };
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
    },
  });
  if (!invoice) return { ok: false, error: "Facture introuvable" };
  if (!canAccessOwned(actor, invoice.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }

  const signature = await getSignaturePngBytes({
    ownerUserId: actor.id,
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
        ? `${actor.firstName} ${actor.lastName}`
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
    clientName: invoice.client.name,
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

  const invoice = await prisma.comInvoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return { ok: false, error: "Facture introuvable" };
  if (!canAccessOwned(actor, invoice.ownerId)) {
    return { ok: false, error: "Hors périmètre" };
  }
  if (invoice.status === "ANNULEE" || invoice.status === "BROUILLON") {
    return { ok: false, error: "Émettre la facture avant paiement" };
  }

  const amountPaid = invoice.amountPaid + amountRaw;
  let status: ComInvoiceStatus = ComInvoiceStatus.PARTIELLEMENT_PAYEE;
  if (amountPaid >= invoice.totalTtc) status = ComInvoiceStatus.PAYEE;
  else if (amountPaid <= 0) status = ComInvoiceStatus.EMISE;

  await prisma.$transaction([
    prisma.comPayment.create({
      data: {
        invoiceId,
        amount: amountRaw,
        method,
        note,
        paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
        recordedById: actor.id,
      },
    }),
    prisma.comInvoice.update({
      where: { id: invoiceId },
      data: { amountPaid, status },
    }),
  ]);

  await writeAudit({
    actorId: actor.id,
    action: "com.payment.record",
    entityType: "com_invoice",
    entityId: invoiceId,
    metadata: { amount: amountRaw, method },
  });

  revalidateCommercial([`/commercial/factures/${invoiceId}`]);
  return { ok: true, message: "Paiement enregistré" };
}
