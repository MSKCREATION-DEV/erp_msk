/**
 * Gate technique Phase 5 — Paie + INPS.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase5.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";

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
    "rh.payroll.run",
    "rh.payroll.view",
    "rh.payroll.approve",
    "rh.inps.manage",
    "self.payslip.view",
  ];
  const perms = await prisma.permission.findMany({
    where: { code: { in: required } },
  });
  if (perms.length < required.length) {
    fail(`Permissions paie incomplètes (${perms.length}/${required.length}) — relancer seed`);
  } else ok("Permissions Phase 5");

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'rh_payroll_periods','rh_payslips','rh_inps_settings','rh_inps_lines',
        'rh_contract_type_rules'
      )
  `;
  if (tables.length < 5) fail(`Tables paie manquantes (${tables.length}/5)`);
  else ok("Tables paie / INPS / éligibilité");

  const stageRule = await prisma.rhContractTypeRule.findUnique({
    where: { contractType: "STAGE" },
  });
  if (
    !stageRule ||
    !stageRule.includeInPayroll ||
    !stageRule.applyInpsRates ||
    stageRule.accruePaidLeave
  ) {
    fail("Règle STAGE incorrecte (paie+INPS on, congés off attendus)");
  } else ok("Éligibilité STAGE conforme");

  const prestaRule = await prisma.rhContractTypeRule.findUnique({
    where: { contractType: "PRESTA" },
  });
  if (!prestaRule || prestaRule.includeInPayroll) {
    fail("Règle PRESTA incorrecte (exclu paie attendu)");
  } else ok("Éligibilité PRESTA conforme");

  const settings = await prisma.rhInpsSettings.count();
  if (settings < 1) fail("Aucun RhInpsSettings — seed");
  else ok("Settings INPS");

  const journal = await prisma.cptJournal.findUnique({ where: { code: "PA" } });
  const a661 = await prisma.cptAccount.findUnique({ where: { code: "661" } });
  const a421 = await prisma.cptAccount.findUnique({ where: { code: "421" } });
  const a4313 = await prisma.cptAccount.findUnique({ where: { code: "4313" } });
  if (!journal || !a661 || !a421 || !a4313) fail("Comptes/journal PA incomplets");
  else ok("Journal PA + comptes 661/421/4313");

  const calc = spawnSync("npx", ["tsx", "src/lib/paie/calc.test.ts"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (calc.status !== 0) fail("test:paie-calc");
  else ok("test:paie-calc");

  await prisma.$disconnect();
  if (process.exitCode) {
    console.error("\nGate Phase 5 KO");
    process.exit(1);
  }
  console.log("\nGate Phase 5 OK");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
