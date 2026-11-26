/**
 * One-shot / idempotent : aligne inventaire Suivi sur seed-data (décision H + Togo).
 * Usage: npx tsx --env-file=.env.local scripts/fix-suivi-stocks.ts
 *
 * Ne touche PAS Auth / mots de passe.
 */
import { createPrisma } from "@/lib/create-prisma";
import {
  SV_SEED_STOCK,
  SV_SEED_STOCK_EXCEL_ARCHIVED_CODES,
  SV_SEED_STOCK_TOGO,
} from "@/lib/suivi/seed-data";
import { seedSuiviTampon } from "../prisma/seed-suivi";

async function main() {
  const prisma = createPrisma();

  process.env.SV_STOCK_FORCE_QTY = "1";
  console.log(
    "→ Resync seed Suivi (stocks Mali H + inventaire Togo, SV_STOCK_FORCE_QTY=1)…",
  );
  await seedSuiviTampon(prisma);

  console.log("\n→ Vérification inventaire Mali actif…");
  const activeMali = await prisma.svStockItem.findMany({
    where: { country: "MALI", archivedAt: null },
    orderBy: [{ family: "asc" }, { code: "asc" }],
  });
  const byCodeMali = new Map(activeMali.map((r) => [r.code, r]));
  let ok = true;

  for (const s of SV_SEED_STOCK) {
    const row = byCodeMali.get(s.code);
    if (!row) {
      console.log(`✗ Mali manquant ${s.code}`);
      ok = false;
      continue;
    }
    const match =
      row.label === s.label &&
      row.unit === s.unit &&
      row.quantity === s.quantity &&
      row.family === s.family;
    console.log(
      `${match ? "✓" : "✗"} ML ${s.code} · ${row.label} · ${row.quantity} ${row.unit}`,
    );
    if (!match) ok = false;
  }

  if (activeMali.length !== SV_SEED_STOCK.length) {
    console.log(
      `✗ Mali nb actifs=${activeMali.length} attendu=${SV_SEED_STOCK.length}`,
    );
    ok = false;
  }

  console.log("\n→ Vérification inventaire Togo actif…");
  const activeTogo = await prisma.svStockItem.findMany({
    where: { country: "TOGO", archivedAt: null },
    orderBy: [{ family: "asc" }, { code: "asc" }],
  });
  const byCodeTogo = new Map(activeTogo.map((r) => [r.code, r]));

  for (const s of SV_SEED_STOCK_TOGO) {
    const row = byCodeTogo.get(s.code);
    if (!row) {
      console.log(`✗ Togo manquant ${s.code}`);
      ok = false;
      continue;
    }
    const match =
      row.label === s.label &&
      row.unit === s.unit &&
      row.quantity === s.quantity &&
      row.family === s.family &&
      (s.observations ? row.observations === s.observations : true);
    console.log(
      `${match ? "✓" : "✗"} TG ${s.code} · ${row.label} · ${row.quantity} ${row.unit}${
        row.observations ? ` · ${row.observations}` : ""
      }`,
    );
    if (!match) ok = false;
  }

  if (activeTogo.length !== SV_SEED_STOCK_TOGO.length) {
    console.log(
      `✗ Togo nb actifs=${activeTogo.length} attendu=${SV_SEED_STOCK_TOGO.length}`,
    );
    ok = false;
    for (const row of activeTogo) {
      if (!SV_SEED_STOCK_TOGO.some((s) => s.code === row.code)) {
        console.log(`  · surplus actif Togo ${row.code}`);
      }
    }
  }

  const archived = await prisma.svStockItem.count({
    where: {
      country: "MALI",
      code: { in: [...SV_SEED_STOCK_EXCEL_ARCHIVED_CODES] },
      archivedAt: { not: null },
    },
  });
  console.log(
    `\n✓ Excel archivés Mali (codes listés) : ${archived}/${SV_SEED_STOCK_EXCEL_ARCHIVED_CODES.length}`,
  );

  if (!ok) {
    console.error("\n✗ Inventaire non conforme — voir ci-dessus.");
    process.exitCode = 1;
  } else {
    console.log(
      "\n✓ Inventaire Direction conforme (Mali décision H + Togo terrain).",
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
