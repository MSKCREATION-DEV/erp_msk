/**
 * One-shot / idempotent : aligne inventaire Suivi sur seed-data (décision H).
 * Usage: npx tsx --env-file=.env.local scripts/fix-suivi-stocks.ts
 *
 * Ne touche PAS Auth / mots de passe.
 */
import { createPrisma } from "@/lib/create-prisma";
import {
  SV_SEED_STOCK,
  SV_SEED_STOCK_EXCEL_ARCHIVED_CODES,
} from "@/lib/suivi/seed-data";
import { seedSuiviTampon } from "../prisma/seed-suivi";

async function main() {
  const prisma = createPrisma();

  process.env.SV_STOCK_FORCE_QTY = "1";
  console.log(
    "→ Resync seed Suivi (stocks décision H, SV_STOCK_FORCE_QTY=1)…",
  );
  await seedSuiviTampon(prisma);

  console.log("\n→ Vérification inventaire actif…");
  const active = await prisma.svStockItem.findMany({
    where: { archivedAt: null },
    orderBy: [{ family: "asc" }, { code: "asc" }],
  });
  const byCode = new Map(active.map((r) => [r.code, r]));
  let ok = true;

  for (const s of SV_SEED_STOCK) {
    const row = byCode.get(s.code);
    if (!row) {
      console.log(`✗ manquant ${s.code}`);
      ok = false;
      continue;
    }
    const match =
      row.label === s.label &&
      row.unit === s.unit &&
      row.quantity === s.quantity &&
      row.family === s.family;
    console.log(
      `${match ? "✓" : "✗"} ${s.code} · ${row.label} · ${row.quantity} ${row.unit}`,
    );
    if (!match) ok = false;
  }

  if (active.length !== SV_SEED_STOCK.length) {
    console.log(
      `✗ Nb actifs=${active.length} attendu=${SV_SEED_STOCK.length}`,
    );
    ok = false;
    for (const row of active) {
      if (!SV_SEED_STOCK.some((s) => s.code === row.code)) {
        console.log(`  · surplus actif ${row.code}`);
      }
    }
  }

  const archived = await prisma.svStockItem.count({
    where: {
      code: { in: [...SV_SEED_STOCK_EXCEL_ARCHIVED_CODES] },
      archivedAt: { not: null },
    },
  });
  console.log(
    `\n✓ Excel archivés (codes listés) : ${archived}/${SV_SEED_STOCK_EXCEL_ARCHIVED_CODES.length}`,
  );

  if (!ok) {
    console.error("\n✗ Inventaire non conforme — voir ci-dessus.");
    process.exitCode = 1;
  } else {
    console.log("\n✓ Inventaire Direction conforme (décision H).");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
