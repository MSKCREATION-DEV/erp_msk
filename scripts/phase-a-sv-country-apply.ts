/**
 * Phase A Mali/Togo — sync permissions pays + seed Suivi (Togo + GRANT Espoir).
 * Usage: npx tsx --env-file=.env.local scripts/phase-a-sv-country-apply.ts
 * Ne touche PAS Auth / mots de passe.
 */
import { createPrisma } from "@/lib/create-prisma";
import { PACK_PERMISSIONS, PERMISSIONS } from "@/lib/rbac/catalog";
import { accountBalanceFromMoves } from "@/lib/suivi/accounts";
import { seedSuiviTampon } from "../prisma/seed-suivi";

async function main() {
  const prisma = createPrisma({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    max: 1,
  });

  for (const p of PERMISSIONS.filter((x) => x.code.startsWith("sv.country."))) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, domain: p.domain, description: p.description },
      update: { domain: p.domain, description: p.description },
    });
  }

  const permByCode = Object.fromEntries(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );

  for (const packCode of ["direction", "admin_plateforme"]) {
    const pack = await prisma.permissionPack.findUnique({
      where: { code: packCode },
    });
    if (!pack) {
      console.warn(`⚠ pack ${packCode} introuvable`);
      continue;
    }
    const codes = PACK_PERMISSIONS[packCode] ?? [];
    await prisma.packPermission.deleteMany({ where: { packId: pack.id } });
    for (const code of codes) {
      const permissionId = permByCode[code];
      if (!permissionId) continue;
      await prisma.packPermission.create({
        data: { packId: pack.id, permissionId },
      });
    }
    const svCount = codes.filter((c) => c.startsWith("sv.")).length;
    console.log(`✓ pack ${packCode} resync (${svCount} sv.*)`);
  }

  await seedSuiviTampon(prisma);

  const accounts = await prisma.svAccount.findMany({
    orderBy: [{ country: "asc" }, { kind: "asc" }],
  });
  console.log(`\n→ Comptes: ${accounts.length}`);
  for (const a of accounts) {
    const moves = await prisma.svCashMovement.findMany({
      where: { accountId: a.id },
      select: {
        direction: true,
        amount: true,
        countsTowardBalance: true,
      },
    });
    console.log(
      `  ${a.country} ${a.kind} balance=${accountBalanceFromMoves(moves)} baseline=${a.baselineBalance ?? "null"}`,
    );
  }

  const maliStock = await prisma.svStockItem.count({
    where: { country: "MALI", archivedAt: null },
  });
  const togoStock = await prisma.svStockItem.count({
    where: { country: "TOGO", archivedAt: null },
  });
  const togoMoves = await prisma.svStockMovement.count({
    where: { item: { country: "TOGO" } },
  });
  console.log(
    `→ Stocks actifs Mali=${maliStock} Togo=${togoStock} mvts Togo=${togoMoves}`,
  );

  const espoir = await prisma.user.findUnique({
    where: { email: "e.awesso@mskcreation.net" },
    include: { overrides: { include: { permission: true } } },
  });
  if (espoir) {
    const grants = espoir.overrides
      .filter((o) => o.effect === "GRANT")
      .map((o) => o.permission.code)
      .sort();
    console.log(`→ Espoir GRANT: ${grants.join(", ") || "(aucun)"}`);
  } else {
    console.log("→ Espoir user absent");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
