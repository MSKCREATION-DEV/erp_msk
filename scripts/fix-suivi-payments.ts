/**
 * One-shot / idempotent : aligne soldes & paiements Suivi sur seed-data (décision G).
 * Usage: npx tsx --env-file=.env.local scripts/fix-suivi-payments.ts
 *
 * Ne touche PAS Auth / mots de passe.
 */
import { createPrisma } from "@/lib/create-prisma";
import { clientBalance } from "@/lib/suivi/balances";
import {
  SV_SEED_CLIENTS,
  SV_SEED_EXPECTED_CLIENT_REMAINING,
  SV_SEED_INVOICES,
} from "@/lib/suivi/seed-data";
import { seedSuiviTampon } from "../prisma/seed-suivi";

async function main() {
  const prisma = createPrisma();

  console.log("→ Resync seed Suivi (clients + factures/paiements)…");
  await seedSuiviTampon(prisma);

  console.log("\n→ Vérification soldes clients attendus (décision G)…");
  let ok = true;
  for (const c of SV_SEED_CLIENTS) {
    const client = await prisma.svClient.findFirst({
      where: { sourceRef: c.sourceRef },
      include: {
        invoices: {
          select: {
            number: true,
            totalTtc: true,
            amountPaid: true,
            status: true,
            dueAt: true,
            issuedAt: true,
            payments: {
              select: { amount: true, paidAt: true, method: true, note: true },
              orderBy: { paidAt: "asc" },
            },
          },
        },
      },
    });
    if (!client) {
      console.warn(`⚠ Client manquant: ${c.key}`);
      ok = false;
      continue;
    }
    const bal = clientBalance(client.invoices);
    const expected = SV_SEED_EXPECTED_CLIENT_REMAINING[c.key];
    const mark = bal.restant === expected ? "✓" : "✗";
    if (bal.restant !== expected) ok = false;
    console.log(
      `${mark} ${c.name}: restant=${bal.restant} (attendu ${expected}) · payé=${bal.paye} · totale=${bal.totale}`,
    );
    for (const inv of client.invoices) {
      const reste = inv.totalTtc - inv.amountPaid;
      console.log(
        `    · ${inv.number} ${inv.status} TTC=${inv.totalTtc} paid=${inv.amountPaid} reste=${reste}`,
      );
      for (const p of inv.payments) {
        console.log(
          `      ↳ ${p.paidAt.toISOString().slice(0, 10)} ${p.amount} ${p.method ?? ""} ${p.note ?? ""}`,
        );
      }
    }
  }

  // Contrôle cohérence amountPaid vs Σ paiements seed
  for (const inv of SV_SEED_INVOICES) {
    const sum = inv.payments.reduce((s, p) => s + p.amount, 0);
    if (sum !== inv.amountPaid) {
      console.error(
        `✗ Incohérence seed ${inv.number}: Σ payments ${sum} ≠ amountPaid ${inv.amountPaid}`,
      );
      ok = false;
    }
  }

  await prisma.$disconnect();
  if (!ok) {
    console.error("\nÉchec vérification soldes.");
    process.exit(1);
  }
  console.log("\n✓ Soldes alignés (décision G).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
