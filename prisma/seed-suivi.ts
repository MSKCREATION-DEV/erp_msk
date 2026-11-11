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
  SV_SEED_STOCK_EXCEL_ARCHIVED_CODES,
} from "../src/lib/suivi/seed-data";
import { seedSuiviGed } from "../src/lib/suivi/seed-ged";
import {
  ensureSvAccounts,
  getSvAccountByKind,
} from "../src/lib/suivi/accounts";

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
  let invSynced = 0;
  for (const inv of SV_SEED_INVOICES) {
    const clientId = clientIds.get(inv.clientKey);
    if (!clientId) continue;

    const existing = await prisma.svInvoice.findFirst({
      where: { number: inv.number, clientId },
      include: { payments: true },
    });
    if (existing) {
      // Sync soldes / paiements (décision G) — sans toucher Auth
      await prisma.svPayment.deleteMany({ where: { invoiceId: existing.id } });
      await prisma.svInvoice.update({
        where: { id: existing.id },
        data: {
          status: inv.status,
          totalHt: inv.totalHt,
          totalVat: inv.totalVat,
          totalTtc: inv.totalTtc,
          amountPaid: inv.amountPaid,
          object: inv.object,
          notes: inv.notes,
          sourceDocument: inv.sourceDocument,
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
      invSynced += 1;
      continue;
    }

    await prisma.svInvoice.create({
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
    invCount += 1;
  }
  console.log(
    `✓ Sv factures créées ${invCount} · soldes/paiements resync ${invSynced}`,
  );

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

  // Comptes physique / banque (soldes initiaux 0 — pas d’ouverture inventée)
  await ensureSvAccounts(prisma);
  const physical = await getSvAccountByKind("PHYSICAL", prisma);
  console.log("✓ Sv comptes PHYSICAL + BANK (ouverture 0)");

  let moveCount = 0;
  for (const m of SV_SEED_MOVEMENTS) {
    const existing = await prisma.svCashMovement.findFirst({
      where: { reference: m.reference },
    });
    if (existing) {
      // Rattache les OUT seed Espèces au compte physique si pas encore lié
      if (!existing.accountId) {
        await prisma.svCashMovement.update({
          where: { id: existing.id },
          data: { accountId: physical.id },
        });
      }
      continue;
    }
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
        accountId: physical.id,
        createdById: actor.id,
      },
    });
    moveCount += 1;
  }
  console.log(
    `✓ Sv mouvements OUT ${moveCount} (rattachés compte physique — solde peut être négatif sans ouverture)`,
  );

  // Stocks — inventaire Direction (décision H) : upsert méta + archive Excel hors liste.
  // Quantités : posées à la création ; resync soldes seulement si SV_STOCK_FORCE_QTY=1
  // (script fix-suivi-stocks) pour ne pas écraser les mouvements opérationnels.
  const forceStockQty = process.env.SV_STOCK_FORCE_QTY === "1";
  const activeCodes = new Set(SV_SEED_STOCK.map((s) => s.code));
  let stockCreated = 0;
  let stockUpdated = 0;
  let stockQtySynced = 0;
  for (const s of SV_SEED_STOCK) {
    const existing = await prisma.svStockItem.findUnique({
      where: { code: s.code },
    });
    if (existing) {
      const qtyChanged = forceStockQty && existing.quantity !== s.quantity;
      await prisma.svStockItem.update({
        where: { id: existing.id },
        data: {
          family: s.family,
          label: s.label,
          unit: s.unit,
          ...(qtyChanged ? { quantity: s.quantity } : {}),
          location: s.location ?? existing.location,
          observations: s.observations ?? existing.observations,
          archivedAt: null,
        },
      });
      if (qtyChanged) {
        await prisma.svStockMovement.create({
          data: {
            itemId: existing.id,
            kind: "ADJUST",
            quantity: Math.abs(s.quantity - existing.quantity),
            note: "Inventaire Direction 2026-11-11 (décision H)",
            sourceRef: "seed:decision-H",
            createdById: actor.id,
          },
        });
        stockQtySynced += 1;
      }
      stockUpdated += 1;
      continue;
    }
    const row = await prisma.svStockItem.create({
      data: {
        code: s.code,
        family: s.family,
        label: s.label,
        unit: s.unit,
        quantity: s.quantity,
        location: s.location ?? null,
        observations: s.observations ?? null,
      },
    });
    if (s.quantity > 0) {
      await prisma.svStockMovement.create({
        data: {
          itemId: row.id,
          kind: "ADJUST",
          quantity: s.quantity,
          note: "Ouverture inventaire Direction 2026-11-11 (décision H)",
          sourceRef: "seed:decision-H",
          createdById: actor.id,
        },
      });
    }
    stockCreated += 1;
  }

  let stockArchived = 0;
  const archiveAt = new Date("2026-11-11T12:00:00.000Z");
  for (const code of SV_SEED_STOCK_EXCEL_ARCHIVED_CODES) {
    if (activeCodes.has(code)) continue;
    const row = await prisma.svStockItem.findUnique({ where: { code } });
    if (!row || row.archivedAt) continue;
    await prisma.svStockItem.update({
      where: { id: row.id },
      data: {
        archivedAt: archiveAt,
        observations: [
          row.observations,
          "Archivé : hors inventaire Direction 2026-11-11 (décision H / Excel snapshot)",
        ]
          .filter(Boolean)
          .join(" · "),
      },
    });
    stockArchived += 1;
  }
  // Tout article actif hors liste courante (sécurité)
  const stray = await prisma.svStockItem.findMany({
    where: { archivedAt: null, code: { notIn: [...activeCodes] } },
  });
  for (const row of stray) {
    await prisma.svStockItem.update({
      where: { id: row.id },
      data: {
        archivedAt: archiveAt,
        observations: [
          row.observations,
          "Archivé : hors inventaire Direction 2026-11-11 (décision H)",
        ]
          .filter(Boolean)
          .join(" · "),
      },
    });
    stockArchived += 1;
  }
  console.log(
    `✓ Sv stocks créés ${stockCreated} · méta ${stockUpdated} · qty forcées ${stockQtySynced} · archivés ${stockArchived}${
      forceStockQty ? " (SV_STOCK_FORCE_QTY=1)" : ""
    }`,
  );

  // Task 14 — dépôt GED contrats + factures (Document / DocumentLink)
  await seedSuiviGed(prisma, actor.id);
}
