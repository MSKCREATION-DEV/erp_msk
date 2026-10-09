/**
 * Gate technique Phase 2 — catalogue + CRM.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/gate-phase2.mjs
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
  const offers = await prisma.catalogOffer.count();
  if (offers < 5) fail(`Catalogue offres < 5 (${offers})`);
  else ok(`${offers} offres catalogue`);

  const pillars = await prisma.catalogOffer.groupBy({
    by: ["pillar"],
    _count: true,
  });
  if (pillars.length < 3) fail("Moins de 3 piliers couverts");
  else ok(`${pillars.length} piliers avec offres`);

  const scripts = await prisma.crmScript.count({ where: { active: true } });
  if (scripts < 3) fail(`Scripts CRM < 3 (${scripts})`);
  else ok(`${scripts} scripts CRM`);

  const perms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          "crm.access",
          "crm.prospect.create",
          "crm.activity.log",
          "crm.scripts.view",
          "crm.import",
          "com.catalogue.view",
          "com.catalogue.manage",
        ],
      },
    },
  });
  if (perms.length < 7) fail("Permissions Phase 2 incomplètes");
  else ok("Permissions CRM/catalogue");

  // Tables accessibles
  await prisma.crmOrganization.count();
  await prisma.crmOpportunity.count();
  ok("Tables CRM OK");

  if (process.exitCode) {
    console.error("Gate Phase 2 ÉCHEC");
  } else {
    console.log(
      "Gate Phase 2 technique OK — reste validation UI humaine + Phase 2 OK",
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
