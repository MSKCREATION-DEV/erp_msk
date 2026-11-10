/**
 * Seed GED Suivi — upload inventaire → Document + DocumentLink.
 * Idempotent ; ne touche jamais Auth / MDP.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import {
  SV_GED_ENTITY,
  upsertSvSourceDocument,
} from "@/lib/suivi/ged";

export async function seedSuiviGed(
  prisma: PrismaClient,
  createdById: string,
): Promise<void> {
  let created = 0;
  let linked = 0;
  let missing = 0;

  const contracts = await prisma.svContractMeta.findMany({
    where: { sourceDocument: { not: null } },
    select: {
      id: true,
      clientId: true,
      sourceDocument: true,
      gedDocumentId: true,
    },
  });

  for (const ct of contracts) {
    if (!ct.sourceDocument) continue;
    const res = await upsertSvSourceDocument({
      clientId: ct.clientId,
      folderType: "Contrats",
      sourceDocument: ct.sourceDocument,
      createdById,
      contractMetaId: ct.id,
      links: [
        { entityType: SV_GED_ENTITY.CONTRACT, entityId: ct.id },
        { entityType: SV_GED_ENTITY.CLIENT, entityId: ct.clientId },
      ],
    });
    if (!res) {
      missing += 1;
      continue;
    }
    if (res.created) created += 1;
    else linked += 1;
  }

  const invoices = await prisma.svInvoice.findMany({
    where: { sourceDocument: { not: null } },
    select: {
      id: true,
      clientId: true,
      sourceDocument: true,
      number: true,
    },
  });

  for (const inv of invoices) {
    if (!inv.sourceDocument) continue;
    const res = await upsertSvSourceDocument({
      clientId: inv.clientId,
      folderType: "Factures",
      sourceDocument: inv.sourceDocument,
      createdById,
      links: [
        { entityType: SV_GED_ENTITY.INVOICE, entityId: inv.id },
        { entityType: SV_GED_ENTITY.CLIENT, entityId: inv.clientId },
      ],
    });
    if (!res) {
      missing += 1;
      continue;
    }
    if (res.created) created += 1;
    else linked += 1;
  }

  console.log(
    `✓ Sv GED documents créés ${created}, déjà liés ${linked}, fichiers manquants ${missing}`,
  );
}
