/**
 * Gate technique Phase 4 — RH cœur.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase4.mjs
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
    "rh.access",
    "rh.employees.view",
    "rh.employees.manage",
    "rh.contracts.manage",
    "rh.leave.validate",
    "rh.leave.view_team",
    "rh.absence.manage",
    "rh.timesheet.validate",
    "self.leave.request",
    "self.absence.submit",
    "self.timesheet.submit",
  ];
  const perms = await prisma.permission.findMany({
    where: { code: { in: required } },
  });
  if (perms.length < required.length) {
    fail(`Permissions RH incomplètes (${perms.length}/${required.length})`);
  } else ok("Permissions RH Phase 4");

  const pack = await prisma.permissionPack.findUnique({
    where: { code: "admin_rh" },
  });
  if (!pack) fail("Pack admin_rh manquant");
  else ok("Pack admin_rh");

  await prisma.rhEmployee.count();
  await prisma.rhContract.count();
  await prisma.rhLeaveRequest.count();
  await prisma.rhAbsence.count();
  await prisma.rhTimesheet.count();
  ok("Tables RH accessibles");

  const employees = await prisma.rhEmployee.count();
  if (employees < 1) fail("Aucune fiche RH (seed manquant ?)");
  else ok(`Fiches RH : ${employees}`);

  const sa = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (sa) {
    const linked = await prisma.rhEmployee.findUnique({
      where: { userId: sa.id },
    });
    if (!linked) fail("Super Admin sans fiche RH");
    else ok("Super Admin lié à une fiche RH");
  }

  if (process.exitCode) console.error("Gate Phase 4 ÉCHEC");
  else {
    console.log(
      "Gate Phase 4 technique OK — reste smoke UI + validation humaine Phase 4 OK",
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
