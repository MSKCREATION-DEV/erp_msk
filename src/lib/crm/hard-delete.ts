import "server-only";

import { DocStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import type { HardDeleteInventory } from "@/lib/crm/hard-delete-meta";

export type { HardDeleteInventory };

async function countGedForEntities(
  pairs: { entityType: string; entityId: string }[],
): Promise<number> {
  if (pairs.length === 0) return 0;
  const links = await prisma.documentLink.findMany({
    where: {
      OR: pairs.map((p) => ({
        entityType: p.entityType,
        entityId: p.entityId,
      })),
    },
    select: { documentId: true },
  });
  const ids = [...new Set(links.map((l) => l.documentId))];
  if (ids.length === 0) return 0;
  return prisma.document.count({
    where: {
      id: { in: ids },
      softDeletedAt: null,
      status: { not: DocStatus.TRASH },
    },
  });
}

async function softDeleteGedForEntities(
  pairs: { entityType: string; entityId: string }[],
  extraDocumentIds: string[] = [],
): Promise<number> {
  const links =
    pairs.length === 0
      ? []
      : await prisma.documentLink.findMany({
          where: {
            OR: pairs.map((p) => ({
              entityType: p.entityType,
              entityId: p.entityId,
            })),
          },
          select: { documentId: true },
        });
  const ids = [
    ...new Set([
      ...links.map((l) => l.documentId),
      ...extraDocumentIds.filter(Boolean),
    ]),
  ];
  if (ids.length === 0) return 0;
  const now = new Date();
  const res = await prisma.document.updateMany({
    where: {
      id: { in: ids },
      softDeletedAt: null,
    },
    data: { status: DocStatus.TRASH, softDeletedAt: now },
  });
  return res.count;
}

async function softDeleteGedInClientFolder(
  gedFolderCode: string,
): Promise<{ count: number; documentIds: string[] }> {
  const folders = await prisma.documentFolder.findMany({
    where: {
      OR: [
        { code: gedFolderCode },
        { path: { contains: `/${gedFolderCode}` } },
      ],
    },
    select: { id: true },
  });
  if (folders.length === 0) return { count: 0, documentIds: [] };
  const folderIds = folders.map((f) => f.id);
  const docs = await prisma.document.findMany({
    where: {
      folderId: { in: folderIds },
      softDeletedAt: null,
    },
    select: { id: true },
  });
  if (docs.length === 0) return { count: 0, documentIds: [] };
  const documentIds = docs.map((d) => d.id);
  const now = new Date();
  const res = await prisma.document.updateMany({
    where: { id: { in: documentIds } },
    data: { status: DocStatus.TRASH, softDeletedAt: now },
  });
  return { count: res.count, documentIds };
}

export async function loadProspectHardDeleteInventory(
  opportunityId: string,
): Promise<HardDeleteInventory | null> {
  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      organizationId: true,
      organization: { select: { name: true } },
      comClients: { select: { id: true }, take: 1 },
      comQuotes: { select: { id: true, clientId: true }, take: 1 },
    },
  });
  if (!deal) return null;

  if (deal.comClients.length > 0 || deal.comQuotes.length > 0) {
    const clientId =
      deal.comClients[0]?.id ?? deal.comQuotes[0]?.clientId ?? null;
    return {
      label: deal.organization.name,
      blocked: true,
      blockReason:
        "Ce prospect est déjà lié à un client ou un devis commercial. Supprimez-le depuis la fiche client.",
      relatedClientId: clientId,
      willDeleteOrganization: false,
      counts: {
        activities: 0,
        tasks: 0,
        appointments: 0,
        offers: 0,
        assignmentRequests: 0,
        contacts: 0,
        quotes: 0,
        invoices: 0,
        payments: 0,
        contracts: 0,
        creditNotes: 0,
        clientEvents: 0,
        gedDocuments: 0,
        sourceOpportunity: 0,
      },
    };
  }

  const [
    activities,
    tasks,
    appointments,
    offers,
    assignmentRequests,
    contacts,
    otherOpps,
    otherClients,
    gedDocuments,
  ] = await runSeries([
    () => prisma.crmActivity.count({ where: { opportunityId } }),
    () => prisma.crmTask.count({ where: { opportunityId } }),
    () => prisma.crmAppointment.count({ where: { opportunityId } }),
    () => prisma.crmOpportunityOffer.count({ where: { opportunityId } }),
    () => prisma.crmAssignmentRequest.count({ where: { opportunityId } }),
    () =>
      prisma.crmContact.count({
        where: { organizationId: deal.organizationId },
      }),
    () =>
      prisma.crmOpportunity.count({
        where: {
          organizationId: deal.organizationId,
          id: { not: opportunityId },
        },
      }),
    () =>
      prisma.comClient.count({
        where: { crmOrganizationId: deal.organizationId },
      }),
    () =>
      countGedForEntities([
        { entityType: "crm_opportunity", entityId: opportunityId },
      ]),
  ]);

  const willDeleteOrganization = otherOpps === 0 && otherClients === 0;

  return {
    label: deal.organization.name,
    willDeleteOrganization,
    counts: {
      activities,
      tasks,
      appointments,
      offers,
      assignmentRequests,
      contacts: willDeleteOrganization ? contacts : 0,
      quotes: 0,
      invoices: 0,
      payments: 0,
      contracts: 0,
      creditNotes: 0,
      clientEvents: 0,
      gedDocuments,
      sourceOpportunity: 0,
    },
  };
}

export async function hardDeleteProspect(
  opportunityId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inv = await loadProspectHardDeleteInventory(opportunityId);
  if (!inv) return { ok: false, error: "Prospect introuvable" };
  if (inv.blocked) {
    return { ok: false, error: inv.blockReason ?? "Suppression impossible" };
  }

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    select: { organizationId: true },
  });
  if (!deal) return { ok: false, error: "Prospect introuvable" };

  await softDeleteGedForEntities([
    { entityType: "crm_opportunity", entityId: opportunityId },
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.crmOpportunity.delete({ where: { id: opportunityId } });
    if (inv.willDeleteOrganization) {
      await tx.crmOrganization.delete({
        where: { id: deal.organizationId },
      });
    }
  });

  return { ok: true };
}

export async function loadClientHardDeleteInventory(
  clientId: string,
): Promise<HardDeleteInventory | null> {
  const client = await prisma.comClient.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      gedFolderCode: true,
      crmOrganizationId: true,
      sourceOpportunityId: true,
    },
  });
  if (!client) return null;

  const quotes = await prisma.comQuote.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });
  const invoices = await prisma.comInvoice.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });
  const contracts = await prisma.comContract.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });
  const creditNotes = await prisma.comCreditNote.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });

  const [
    payments,
    clientEvents,
    activities,
    tasks,
    appointments,
    offers,
    assignmentRequests,
    contacts,
  ] = await runSeries([
    () => prisma.comPayment.count({ where: { clientId } }),
    () => prisma.comClientEvent.count({ where: { clientId } }),
    () =>
      client.sourceOpportunityId
        ? prisma.crmActivity.count({
            where: { opportunityId: client.sourceOpportunityId },
          })
        : Promise.resolve(0),
    () =>
      client.sourceOpportunityId
        ? prisma.crmTask.count({
            where: { opportunityId: client.sourceOpportunityId },
          })
        : Promise.resolve(0),
    () =>
      client.sourceOpportunityId
        ? prisma.crmAppointment.count({
            where: { opportunityId: client.sourceOpportunityId },
          })
        : Promise.resolve(0),
    () =>
      client.sourceOpportunityId
        ? prisma.crmOpportunityOffer.count({
            where: { opportunityId: client.sourceOpportunityId },
          })
        : Promise.resolve(0),
    () =>
      client.sourceOpportunityId
        ? prisma.crmAssignmentRequest.count({
            where: { opportunityId: client.sourceOpportunityId },
          })
        : Promise.resolve(0),
    () =>
      client.crmOrganizationId
        ? prisma.crmContact.count({
            where: { organizationId: client.crmOrganizationId },
          })
        : Promise.resolve(0),
  ]);

  const linkPairs: { entityType: string; entityId: string }[] = [
    { entityType: "com_client", entityId: clientId },
    ...quotes.map((q) => ({ entityType: "com_quote", entityId: q.id })),
    ...invoices.map((i) => ({ entityType: "com_invoice", entityId: i.id })),
    ...contracts.map((c) => ({
      entityType: "com_contract",
      entityId: c.id,
    })),
  ];
  if (client.sourceOpportunityId) {
    linkPairs.push({
      entityType: "crm_opportunity",
      entityId: client.sourceOpportunityId,
    });
  }

  const linkedGed = await countGedForEntities(linkPairs);
  const folderDocCount = await prisma.document.count({
    where: {
      softDeletedAt: null,
      folder: {
        OR: [
          { code: client.gedFolderCode },
          { path: { contains: `/${client.gedFolderCode}` } },
        ],
      },
    },
  });

  let willDeleteOrganization = false;
  if (client.crmOrganizationId) {
    const [otherOpps, otherClients] = await runSeries([
      () =>
        prisma.crmOpportunity.count({
          where: {
            organizationId: client.crmOrganizationId!,
            ...(client.sourceOpportunityId
              ? { id: { not: client.sourceOpportunityId } }
              : {}),
          },
        }),
      () =>
        prisma.comClient.count({
          where: {
            crmOrganizationId: client.crmOrganizationId!,
            id: { not: clientId },
          },
        }),
    ]);
    willDeleteOrganization = otherOpps === 0 && otherClients === 0;
  }

  return {
    label: client.name,
    willDeleteOrganization,
    counts: {
      activities,
      tasks,
      appointments,
      offers,
      assignmentRequests,
      contacts: willDeleteOrganization ? contacts : 0,
      quotes: quotes.length,
      invoices: invoices.length,
      payments,
      contracts: contracts.length,
      creditNotes: creditNotes.length,
      clientEvents,
      gedDocuments: Math.max(linkedGed, folderDocCount),
      sourceOpportunity: client.sourceOpportunityId ? 1 : 0,
    },
  };
}

/**
 * Hard delete client + enfants commerciaux + opportunité source + org orpheline.
 * Ordre manuel pour éviter les Restrict (avoirs / arriérés).
 */
export async function hardDeleteClient(
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await prisma.comClient.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      gedFolderCode: true,
      crmOrganizationId: true,
      sourceOpportunityId: true,
    },
  });
  if (!client) return { ok: false, error: "Client introuvable" };

  const quotes = await prisma.comQuote.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });
  const invoices = await prisma.comInvoice.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });
  const contracts = await prisma.comContract.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });
  const creditNotes = await prisma.comCreditNote.findMany({
    where: { clientId },
    select: { id: true, gedDocumentId: true },
  });

  const linkPairs: { entityType: string; entityId: string }[] = [
    { entityType: "com_client", entityId: clientId },
    ...quotes.map((q) => ({ entityType: "com_quote", entityId: q.id })),
    ...invoices.map((i) => ({ entityType: "com_invoice", entityId: i.id })),
    ...contracts.map((c) => ({
      entityType: "com_contract",
      entityId: c.id,
    })),
  ];
  if (client.sourceOpportunityId) {
    linkPairs.push({
      entityType: "crm_opportunity",
      entityId: client.sourceOpportunityId,
    });
  }

  const extraDocIds = [
    ...quotes.map((q) => q.gedDocumentId),
    ...invoices.map((i) => i.gedDocumentId),
    ...contracts.map((c) => c.gedDocumentId),
    ...creditNotes.map((n) => n.gedDocumentId),
  ].filter((id): id is string => Boolean(id));

  await softDeleteGedForEntities(linkPairs, extraDocIds);
  await softDeleteGedInClientFolder(client.gedFolderCode);

  const invoiceIds = invoices.map((i) => i.id);

  await prisma.$transaction(async (tx) => {
    if (invoiceIds.length > 0) {
      await tx.comInvoiceArrearsRef.deleteMany({
        where: {
          OR: [
            { invoiceId: { in: invoiceIds } },
            { sourceInvoiceId: { in: invoiceIds } },
          ],
        },
      });
      await tx.comPaymentAllocation.deleteMany({
        where: { invoiceId: { in: invoiceIds } },
      });
      await tx.comInvoiceReminder.deleteMany({
        where: { invoiceId: { in: invoiceIds } },
      });
    }

    await tx.comCreditNote.deleteMany({ where: { clientId } });
    await tx.comPayment.deleteMany({ where: { clientId } });
    await tx.comInvoice.deleteMany({ where: { clientId } });
    await tx.comContract.deleteMany({ where: { clientId } });
    await tx.comQuote.deleteMany({ where: { clientId } });
    await tx.comClientEvent.deleteMany({ where: { clientId } });
    await tx.comClient.delete({ where: { id: clientId } });

    if (client.sourceOpportunityId) {
      await tx.crmOpportunity.delete({
        where: { id: client.sourceOpportunityId },
      });
    }

    if (client.crmOrganizationId) {
      const [otherOpps, otherClients] = await Promise.all([
        tx.crmOpportunity.count({
          where: { organizationId: client.crmOrganizationId! },
        }),
        tx.comClient.count({
          where: { crmOrganizationId: client.crmOrganizationId! },
        }),
      ]);
      if (otherOpps === 0 && otherClients === 0) {
        await tx.crmOrganization.delete({
          where: { id: client.crmOrganizationId },
        });
      }
    }
  });

  return { ok: true };
}
