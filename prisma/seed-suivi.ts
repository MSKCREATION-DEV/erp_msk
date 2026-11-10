/**
 * Seed module Suivi (tampon) — data depuis inventaire + DECISIONS-SEED uniquement.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import {
  SV_SEED_CLIENTS,
  SV_SEED_CONTRACTS,
  SV_SEED_INVOICES,
  SV_SEED_MOVEMENTS,
  SV_SEED_STOCK,
} from "../src/lib/suivi/seed-data";
import { seedSuiviGed } from "../src/lib/suivi/seed-ged";

export async function seedSuiviTampon(prisma: PrismaClient) {
  const actor =
    (await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({ select: { id: true } }));

  if (!actor) {
    console.warn("⚠ Seed Suivi ignoré — aucun user pour createdById");
    return;
  }

  const clientIds = new Map<string, string>();

  for (const c of SV_SEED_CLIENTS) {
    const existing = await prisma.svClient.findFirst({
      where: { sourceRef: c.sourceRef },
    });
    if (existing) {
      clientIds.set(c.key, existing.id);
      continue;
    }
    const row = await prisma.svClient.create({
      data: {
        name: c.name,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        city: c.city,
        country: c.country,
        notes: c.notes,
        sourceRef: c.sourceRef,
      },
    });
    clientIds.set(c.key, row.id);
  }
  console.log(`✓ Sv clients ${clientIds.size}`);

  let invCount = 0;
  for (const inv of SV_SEED_INVOICES) {
    const clientId = clientIds.get(inv.clientKey);
    if (!clientId) continue;

    const existing = await prisma.svInvoice.findFirst({
      where: { number: inv.number, clientId },
    });
    if (existing) continue;

    const created = await prisma.svInvoice.create({
      data: {
        number: inv.number,
        legacyNumber: inv.legacyNumber,
        status: inv.status,
        clientId,
        issuedAt: new Date(inv.issuedAt),
        dueAt: inv.dueAt ? new Date(inv.dueAt) : null,
        totalHt: inv.totalHt,
        totalVat: inv.totalVat,
        totalTtc: inv.totalTtc,
        amountPaid: inv.amountPaid,
        object: inv.object,
        notes: inv.notes,
        sourceDocument: inv.sourceDocument,
        createdById: actor.id,
        lines: {
          create: inv.lines.map((l, i) => ({
            sortOrder: i,
            label: l.label,
            description: l.description,
            qty: l.qty,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate ?? null,
          })),
        },
        payments: {
          create: inv.payments.map((p) => ({
            amount: p.amount,
            paidAt: new Date(p.paidAt),
            method: p.method,
            reference: p.reference,
            note: p.note,
          })),
        },
      },
    });
    void created;
    invCount += 1;
  }
  console.log(`✓ Sv factures créées ${invCount} (idempotent skip si existantes)`);

  let contractCount = 0;
  for (const ct of SV_SEED_CONTRACTS) {
    const clientId = clientIds.get(ct.clientKey);
    if (!clientId) continue;
    const existing = await prisma.svContractMeta.findFirst({
      where: { clientId, sourceDocument: ct.sourceDocument },
    });
    if (existing) continue;
    await prisma.svContractMeta.create({
      data: {
        clientId,
        title: ct.title,
        partyName: ct.partyName,
        effectiveFrom: ct.effectiveFrom ? new Date(ct.effectiveFrom) : null,
        durationNote: ct.durationNote,
        monthlyAmount: ct.monthlyAmount ?? null,
        sourceDocument: ct.sourceDocument,
        notes: ct.notes,
      },
    });
    contractCount += 1;
  }
  console.log(`✓ Sv contrats ${contractCount}`);

  let moveCount = 0;
  for (const m of SV_SEED_MOVEMENTS) {
    const existing = await prisma.svCashMovement.findFirst({
      where: { reference: m.reference },
    });
    if (existing) continue;
    await prisma.svCashMovement.create({
      data: {
        movedAt: new Date(m.movedAt),
        direction: "OUT",
        amount: m.amount,
        category: m.category,
        description: m.description,
        clientProject: m.clientProject,
        paidBy: m.paidBy,
        paymentMethod: m.paymentMethod ?? "Espèces",
        reference: m.reference,
        createdById: actor.id,
      },
    });
    moveCount += 1;
  }
  console.log(`✓ Sv mouvements OUT ${moveCount}`);

  let stockCount = 0;
  for (const s of SV_SEED_STOCK) {
    const existing = await prisma.svStockItem.findUnique({
      where: { code: s.code },
    });
    if (existing) continue;
    await prisma.svStockItem.create({
      data: {
        code: s.code,
        family: s.family,
        label: s.label,
        unit: s.unit,
        quantity: s.quantity,
        location: s.location,
      },
    });
    stockCount += 1;
  }
  console.log(`✓ Sv stocks ${stockCount}`);

  // Task 14 — dépôt GED contrats + factures (Document / DocumentLink)
  await seedSuiviGed(prisma, actor.id);
}
