/**
 * One-shot / idempotent : aligne charges Suivi sur seed-data (décision J).
 * Usage: npx tsx --env-file=.env.local scripts/fix-suivi-expenses.ts
 *
 * Ne touche PAS Auth / mots de passe.
 * Ne lance PAS le seed GED (évite hang réseau Storage).
 */
import { createPrisma } from "@/lib/create-prisma";
import { SV_SEED_EXPENSE_INVOICES } from "@/lib/suivi/expense-seed-data";

async function main() {
  const prisma = createPrisma();

  const actor =
    (await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  if (!actor) {
    console.error("✗ Aucun user pour createdById — abort.");
    process.exit(1);
  }

  console.log("→ Sync charges (décision J)…");
  let created = 0;
  let synced = 0;

  for (const exp of SV_SEED_EXPENSE_INVOICES) {
    const existing = await prisma.svExpenseInvoice.findUnique({
      where: { sourceDocument: exp.sourceDocument },
    });
    const paymentsCreate = exp.payments.map((p) => ({
      amount: p.amount,
      paidAt: new Date(p.paidAt),
      method: p.method ?? null,
      reference: p.reference ?? null,
      note: p.note ?? null,
    }));
    const data = {
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
    };

    if (existing) {
      await prisma.svExpensePayment.deleteMany({
        where: { invoiceId: existing.id },
      });
      await prisma.svExpenseInvoice.update({
        where: { id: existing.id },
        data: {
          ...data,
          payments: { create: paymentsCreate },
        },
      });
      synced += 1;
    } else {
      await prisma.svExpenseInvoice.create({
        data: {
          ...data,
          sourceDocument: exp.sourceDocument,
          createdById: actor.id,
          payments: { create: paymentsCreate },
        },
      });
      created += 1;
    }
  }
  console.log(`✓ créées ${created} · resync ${synced}`);

  console.log("\n→ Vérification…");
  let ok = true;
  for (const exp of SV_SEED_EXPENSE_INVOICES) {
    const row = await prisma.svExpenseInvoice.findUnique({
      where: { sourceDocument: exp.sourceDocument },
      include: {
        payments: {
          select: { amount: true, paidAt: true, note: true },
          orderBy: { paidAt: "asc" },
        },
      },
    });
    if (!row) {
      console.log(`✗ manquante ${exp.number}`);
      ok = false;
      continue;
    }
    const reste = row.totalTtc - row.amountPaid;
    const match =
      row.status === exp.status &&
      row.amountPaid === exp.amountPaid &&
      row.totalTtc === exp.totalTtc &&
      row.payments.length === exp.payments.length;
    console.log(
      `${match ? "✓" : "✗"} ${row.number} · ${row.status} · TTC=${row.totalTtc} · paid=${row.amountPaid} · reste=${reste}`,
    );
    for (const p of row.payments) {
      console.log(
        `    ↳ ${p.paidAt.toISOString().slice(0, 10)} ${p.amount} ${p.note ?? ""}`,
      );
    }
    if (!match) ok = false;
  }

  const unpaid = SV_SEED_EXPENSE_INVOICES.filter((e) => e.status !== "PAYEE");
  const paid = SV_SEED_EXPENSE_INVOICES.filter((e) => e.status === "PAYEE");
  console.log(
    `\nAttendu Direction : ${unpaid.length} non payée(s) · ${paid.length} PAYEE`,
  );

  await prisma.$disconnect();
  if (!ok) {
    console.error("\n✗ Charges non conformes.");
    process.exit(1);
  }
  console.log("\n✓ Charges alignées (décision J).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
