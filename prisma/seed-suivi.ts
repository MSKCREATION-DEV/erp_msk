/**
 * Seed module Suivi (tampon) — data depuis inventaire + DECISIONS-SEED uniquement.
 * Phase A Mali/Togo : Mali inchangé ; coquille Togo à 0 ; GRANT Espoir Togo.
 * Ne touche jamais Auth / mots de passe.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { OverrideEffect } from "../src/generated/prisma/client";
import {
  SV_SEED_CLIENTS,
  SV_SEED_CONTRACTS,
  SV_SEED_INVOICES,
  SV_SEED_MOVEMENTS,
  SV_SEED_STOCK,
  SV_SEED_STOCK_EXCEL_ARCHIVED_CODES,
} from "../src/lib/suivi/seed-data";
import { SV_SEED_EXPENSE_INVOICES } from "../src/lib/suivi/expense-seed-data";
import { seedSuiviGed } from "../src/lib/suivi/seed-ged";
import {
  applySvAccountBaseline,
  ensureSvAccounts,
  getSvAccountByKind,
} from "../src/lib/suivi/accounts";
import { SV_TOGO_OPS_PERMISSIONS } from "../src/lib/rbac/catalog";

/** Espoir — ops Togo uniquement (intent suivi-mali-togo). */
const ESPOIR_SV_TOGO_EMAIL = "e.awesso@mskcreation.net";

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

  // Comptes Mali + coquille Togo (ensure) — seed OUT puis bascule Direction Mali (décision I)
  await ensureSvAccounts(prisma);
  const physical = await getSvAccountByKind("PHYSICAL", prisma, "MALI");
  console.log("✓ Sv comptes Mali PHYSICAL+BANK · Togo coquille 0");

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
        // Pre-bascule : archivé juste après via applySvAccountBaseline
        countsTowardBalance: false,
        createdById: actor.id,
      },
    });
    moveCount += 1;
  }
  console.log(
    `✓ Sv mouvements OUT ${moveCount} (historique archive — hors solde courant)`,
  );

  await applySvAccountBaseline(prisma, actor.id);
  console.log(
    "✓ Sv bascule Direction 12/11/2026 — PHYSICAL 145 000 · BANK 204 815",
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
      where: { country_code: { country: "MALI", code: s.code } },
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
        country: "MALI",
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
    const row = await prisma.svStockItem.findUnique({
      where: { country_code: { country: "MALI", code } },
    });
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
  // Tout article Mali actif hors liste courante (sécurité) — ne touche pas Togo
  const stray = await prisma.svStockItem.findMany({
    where: {
      country: "MALI",
      archivedAt: null,
      code: { notIn: [...activeCodes] },
    },
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
    `✓ Sv stocks Mali créés ${stockCreated} · méta ${stockUpdated} · qty forcées ${stockQtySynced} · archivés ${stockArchived}${
      forceStockQty ? " (SV_STOCK_FORCE_QTY=1)" : ""
    }`,
  );

  // Coquille Togo : mêmes familles / codes, qté 0, 0 mouvements — idempotent
  let togoStockCreated = 0;
  let togoStockUpdated = 0;
  for (const s of SV_SEED_STOCK) {
    const existing = await prisma.svStockItem.findUnique({
      where: { country_code: { country: "TOGO", code: s.code } },
    });
    if (existing) {
      await prisma.svStockItem.update({
        where: { id: existing.id },
        data: {
          family: s.family,
          label: s.label,
          unit: s.unit,
          location: s.location ?? existing.location,
          observations:
            existing.observations ??
            "Coquille Togo — quantités à 0 (inventaire à renseigner).",
          archivedAt: null,
          // Ne jamais forcer qty Togo sauf création (évite écraser ops)
        },
      });
      togoStockUpdated += 1;
      continue;
    }
    await prisma.svStockItem.create({
      data: {
        country: "TOGO",
        code: s.code,
        family: s.family,
        label: s.label,
        unit: s.unit,
        quantity: 0,
        location: s.location ?? null,
        observations: "Coquille Togo — quantités à 0 (inventaire à renseigner).",
      },
    });
    togoStockCreated += 1;
  }
  console.log(
    `✓ Sv stocks Togo créés ${togoStockCreated} · méta ${togoStockUpdated} (qté 0, 0 mvts)`,
  );

  await seedEspoirSvTogoGrants(prisma);

  // Charges entreprise (décision J) — factures internes / fournisseurs
  let expenseCreated = 0;
  let expenseSynced = 0;
  for (const exp of SV_SEED_EXPENSE_INVOICES) {
    const existing = await prisma.svExpenseInvoice.findUnique({
      where: { sourceDocument: exp.sourceDocument },
    });
    if (existing) {
      await prisma.svExpensePayment.deleteMany({
        where: { invoiceId: existing.id },
      });
      await prisma.svExpenseInvoice.update({
        where: { id: existing.id },
        data: {
          category: exp.category,
          status: exp.status,
          vendorName: exp.vendorName,
          vendorRef: exp.vendorRef ?? null,
          number: exp.number,
          issuedAt: new Date(exp.issuedAt),
          dueAt: exp.dueAt ? new Date(exp.dueAt) : null,
          periodStart: exp.periodStart ? new Date(exp.periodStart) : null,
          periodEnd: exp.periodEnd ? new Date(exp.periodEnd) : null,
          periodLabel: exp.periodLabel ?? null,
          totalHt: exp.totalHt,
          totalVat: exp.totalVat,
          totalTtc: exp.totalTtc,
          amountPaid: exp.amountPaid,
          object: exp.object,
          notes: exp.notes ?? null,
          payments: {
            create: exp.payments.map((p) => ({
              amount: p.amount,
              paidAt: new Date(p.paidAt),
              method: p.method ?? null,
              reference: p.reference ?? null,
              note: p.note ?? null,
            })),
          },
        },
      });
      expenseSynced += 1;
      continue;
    }
    await prisma.svExpenseInvoice.create({
      data: {
        category: exp.category,
        status: exp.status,
        vendorName: exp.vendorName,
        vendorRef: exp.vendorRef ?? null,
        number: exp.number,
        issuedAt: new Date(exp.issuedAt),
        dueAt: exp.dueAt ? new Date(exp.dueAt) : null,
        periodStart: exp.periodStart ? new Date(exp.periodStart) : null,
        periodEnd: exp.periodEnd ? new Date(exp.periodEnd) : null,
        periodLabel: exp.periodLabel ?? null,
        totalHt: exp.totalHt,
        totalVat: exp.totalVat,
        totalTtc: exp.totalTtc,
        amountPaid: exp.amountPaid,
        object: exp.object,
        notes: exp.notes ?? null,
        sourceDocument: exp.sourceDocument,
        createdById: actor.id,
        payments: {
          create: exp.payments.map((p) => ({
            amount: p.amount,
            paidAt: new Date(p.paidAt),
            method: p.method ?? null,
            reference: p.reference ?? null,
            note: p.note ?? null,
          })),
        },
      },
    });
    expenseCreated += 1;
  }
  console.log(
    `✓ Sv charges créées ${expenseCreated} · resync ${expenseSynced}`,
  );

  // Task 14 — dépôt GED contrats + factures clients + charges
  await seedSuiviGed(prisma, actor.id);
}

/**
 * GRANT idempotent Espoir → 3 piliers + sv.country.togo (pas Mali, pas clients/HR).
 * Ne crée pas l’utilisateur ; no-op si email absent. Ne touche pas Auth MDP.
 */
export async function seedEspoirSvTogoGrants(prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: { email: ESPOIR_SV_TOGO_EMAIL },
    select: { id: true, email: true },
  });
  if (!user) {
    console.log(
      `⚠ Espoir Suivi Togo : user ${ESPOIR_SV_TOGO_EMAIL} introuvable — GRANT ignoré`,
    );
    return;
  }

  const perms = await prisma.permission.findMany({
    where: { code: { in: [...SV_TOGO_OPS_PERMISSIONS] } },
    select: { id: true, code: true },
  });
  const byCode = Object.fromEntries(perms.map((p) => [p.code, p.id]));

  let granted = 0;
  for (const code of SV_TOGO_OPS_PERMISSIONS) {
    const permissionId = byCode[code];
    if (!permissionId) {
      console.warn(`⚠ Permission manquante catalogue: ${code}`);
      continue;
    }
    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionId: { userId: user.id, permissionId },
      },
      create: {
        userId: user.id,
        permissionId,
        effect: OverrideEffect.GRANT,
        reason: "Suivi Togo ops (Phase A Mali/Togo) — sans Mali",
      },
      update: {
        effect: OverrideEffect.GRANT,
        reason: "Suivi Togo ops (Phase A Mali/Togo) — sans Mali",
      },
    });
    granted += 1;
  }
  console.log(
    `✓ Espoir GRANT Suivi Togo (${granted}/${SV_TOGO_OPS_PERMISSIONS.length}) — ${user.email}`,
  );
}
