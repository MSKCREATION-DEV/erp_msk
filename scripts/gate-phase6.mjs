/**
 * Gate technique Phase 6 — Comptabilité SYSCOHADA + banques + budget.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase6.mjs
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
  const requiredPerms = [
    "cpt.access",
    "cpt.ecritures.manage",
    "cpt.ecritures.validate",
    "cpt.banques.manage",
    "cpt.rapprochement",
    "cpt.etats.view",
    "cpt.reports.view",
    "cpt.cloture",
    "cpt.fiscalite.manage",
    "cpt.plan.configure",
    "bud.view",
    "bud.manage",
  ];
  const perms = await prisma.permission.findMany({
    where: { code: { in: requiredPerms } },
  });
  if (perms.length < requiredPerms.length) {
    fail(`Permissions CPT/BUD incomplètes (${perms.length}/${requiredPerms.length})`);
  } else ok("Permissions Comptabilité Phase 6");

  const packs = await prisma.permissionPack.findMany({
    where: { code: { in: ["comptable", "admin_compta", "direction"] } },
  });
  if (packs.length < 3) fail(`Packs compta manquants (${packs.length}/3)`);
  else ok("Packs comptable / admin_compta / direction");

  await prisma.cptAccount.count();
  await prisma.cptJournal.count();
  await prisma.cptExercise.count();
  await prisma.cptPeriod.count();
  await prisma.cptEntry.count();
  await prisma.cptBankAccount.count();
  await prisma.cptBankTxn.count();
  await prisma.cptFxRate.count();
  await prisma.budExercise.count();
  await prisma.budLine.count();
  await prisma.budPatenteDue.count();
  ok("Tables CPT/BUD accessibles");

  const accounts = await prisma.cptAccount.count();
  if (accounts < 20) fail(`Plan de comptes trop petit (${accounts}) — seed manquant ?`);
  else ok(`Plan de comptes : ${accounts} comptes`);

  const journals = await prisma.cptJournal.findMany({
    where: { code: { in: ["AC", "VE", "BQ", "CA", "OD", "PA", "MM"] } },
  });
  if (journals.length < 7) fail(`Journaux incomplets (${journals.length}/7)`);
  else ok("Journaux AC/VE/BQ/CA/OD/PA/MM");

  const year = new Date().getFullYear();
  const exercise = await prisma.cptExercise.findUnique({ where: { year } });
  if (!exercise) fail(`Exercice ${year} manquant`);
  else {
    const periods = await prisma.cptPeriod.count({
      where: { exerciseId: exercise.id },
    });
    if (periods < 12) fail(`Périodes incomplètes (${periods}/12)`);
    else ok(`Exercice ${year} + 12 périodes`);
  }

  const banks = await prisma.cptBankAccount.findMany({
    where: { code: { in: ["ECOBANK1", "ECOBANK2"] } },
  });
  if (banks.length < 2) fail(`Banques ECOBANK manquantes (${banks.length}/2)`);
  else ok("2 comptes ECOBANK");

  const fx = await prisma.cptFxRate.count({ where: { pair: "EUR/XOF" } });
  if (fx < 1) fail("Taux EUR/XOF manquant");
  else ok("Taux EUR/XOF");

  // Smoke écriture OD équilibrée (transaction rollback via delete)
  const od = await prisma.cptJournal.findUnique({ where: { code: "OD" } });
  const a411 = await prisma.cptAccount.findUnique({ where: { code: "4111" } });
  const a706 = await prisma.cptAccount.findUnique({ where: { code: "706" } });
  const period = await prisma.cptPeriod.findFirst({
    where: { status: "OPEN", exercise: { year, status: "OPEN" } },
    include: { exercise: true },
  });
  const sa = await prisma.user.findFirst({ where: { isSuperAdmin: true } });

  if (!od || !a411 || !a706 || !period || !sa) {
    fail("Prérequis smoke écriture manquants");
  } else {
    const number = `OD-GATE-${Date.now()}`;
    const entry = await prisma.cptEntry.create({
      data: {
        number,
        journalId: od.id,
        periodId: period.id,
        entryDate: new Date(),
        label: "Gate Phase 6 smoke",
        status: "DRAFT",
        createdById: sa.id,
        lines: {
          create: [
            { accountId: a411.id, debit: 1000, credit: 0, sortOrder: 0 },
            { accountId: a706.id, debit: 0, credit: 1000, sortOrder: 1 },
          ],
        },
      },
      include: { lines: true },
    });
    const d = entry.lines.reduce((s, l) => s + l.debit, 0);
    const c = entry.lines.reduce((s, l) => s + l.credit, 0);
    if (d !== c) fail("Smoke écriture déséquilibrée");
    else ok("Smoke écriture OD équilibrée");
    await prisma.cptEntry.delete({ where: { id: entry.id } });
  }

  if (process.exitCode) {
    console.error("Gate Phase 6 ÉCHEC");
  } else {
    console.log(
      "Gate Phase 6 technique OK — reste smoke UI + validation humaine Phase 6 OK",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
