/**
 * Gate technique Phase 7B — Ops (achats, patrimoine, projets, anomalies).
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase7b.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

async function main() {
  const required = [
    "stk.achats.manage",
    "stk.fournisseurs.manage",
    "pat.access",
    "pat.manage",
    "prj.access",
    "prj.manage",
    "ops.access",
    "ops.ticket.create",
    "ops.ticket.manage",
  ];
  const perms = await prisma.permission.findMany({
    where: { code: { in: required } },
  });
  if (perms.length < required.length) {
    fail(`Permissions 7B incomplètes (${perms.length}/${required.length}) — seed`);
  } else ok("Permissions Phase 7B");

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'stk_purchases','stk_purchase_lines','pat_assets',
        'prj_projects','prj_members','prj_expenses','ops_tickets'
      )
  `;
  if (tables.length < 7) fail(`Tables 7B manquantes (${tables.length}/7)`);
  else ok("Tables achats / patrimoine / projets / anomalies");

  const journal = await prisma.cptJournal.findUnique({ where: { code: "AC" } });
  const a601 = await prisma.cptAccount.findUnique({ where: { code: "601" } });
  const a4011 = await prisma.cptAccount.findUnique({ where: { code: "4011" } });
  if (!journal || !a601 || !a4011) fail("Journal AC / comptes 601/4011 manquants");
  else ok("Compta AC prête pour réceptions");

  const stockPack = await prisma.permissionPack.findUnique({
    where: { code: "stock" },
    include: { permissions: { include: { permission: true } } },
  });
  const codes = new Set(
    (stockPack?.permissions ?? []).map((p) => p.permission.code),
  );
  if (!codes.has("stk.achats.manage") || !codes.has("pat.manage")) {
    fail("Pack stock incomplet (achats/patrimoine)");
  } else ok("Pack stock élargi 7B");

  await prisma.$disconnect();
  if (process.exitCode) {
    console.error("\nGate Phase 7B KO");
    process.exit(1);
  }
  console.log("\nGate Phase 7B OK");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
