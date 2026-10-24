/**
 * 1) Purge uniquement orgs `[TEST]` (+ satellites liés)
 * 2) Archive comptes *@test.msk.local (sans reset MDP Auth)
 * 3) Import Excel merge (skip normalizedName existants)
 * 4) Réaffecte Madina→Yaye les collisions Excel (anti-doublon, Madina ARCHIVED)
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/crm-import-yaye-merge.ts --dry-run
 *   CONFIRM_TEST_PURGE=YES CONFIRM_IMPORT=YES npx tsx --env-file=.env.local scripts/crm-import-yaye-merge.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, CrmActivityType } from "@prisma/client";
import { parseImportFile } from "../src/lib/crm/import/parse-tabular";
import { applyCrmImport } from "../src/lib/crm/import/apply-import";
import {
  buildUserIdResolver,
  resolveOwnerId,
} from "../src/lib/crm/import/resolve-users";

const prisma = new PrismaClient();
const FILE = resolve("docs/CRM_Prospection_MSK Copier.xlsx");
const dryRun = process.argv.includes("--dry-run");

async function purgeTestOrgsOnly() {
  const orgs = await prisma.crmOrganization.findMany({
    where: { name: { startsWith: "[TEST]" } },
    select: { id: true, name: true },
  });
  const ids = orgs.map((o) => o.id);
  console.log(`[TEST] orgs à purger: ${ids.length}`);
  if (ids.length === 0 || dryRun) return { orgs: ids.length };

  const deals = await prisma.crmOpportunity.findMany({
    where: { organizationId: { in: ids } },
    select: { id: true },
  });
  const dealIds = deals.map((d) => d.id);

  await prisma.crmAssignmentRequest.deleteMany({
    where: { opportunityId: { in: dealIds } },
  });
  await prisma.crmOpportunityOffer.deleteMany({
    where: { opportunityId: { in: dealIds } },
  });
  await prisma.crmActivity.deleteMany({
    where: { organizationId: { in: ids } },
  });
  await prisma.crmTask.deleteMany({
    where: { organizationId: { in: ids } },
  });
  // Détacher devis COM éventuels
  await prisma.comQuote.updateMany({
    where: { opportunityId: { in: dealIds } },
    data: { opportunityId: null },
  });
  const testClients = await prisma.comClient.findMany({
    where: {
      OR: [
        { name: { startsWith: "[TEST]" } },
        { crmOrganizationId: { in: ids } },
        { sourceOpportunityId: { in: dealIds } },
      ],
    },
    select: { id: true },
  });
  const clientIds = testClients.map((c) => c.id);
  if (clientIds.length) {
    await prisma.comInvoice.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    await prisma.comQuote.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    await prisma.comClient.deleteMany({ where: { id: { in: clientIds } } });
  }
  await prisma.crmOpportunity.deleteMany({
    where: { organizationId: { in: ids } },
  });
  await prisma.crmOrganization.deleteMany({ where: { id: { in: ids } } });
  return { orgs: ids.length, clients: clientIds.length };
}

async function archiveTestUsers() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@test.msk.local" } },
        { lastName: { contains: "[TEST]" } },
      ],
      status: { not: "ARCHIVED" },
    },
    select: { id: true, email: true },
  });
  console.log(`Comptes test à archiver: ${users.map((u) => u.email).join(", ") || "(aucun)"}`);
  if (dryRun) return users.length;
  for (const u of users) {
    await prisma.userPack.deleteMany({ where: { userId: u.id } });
    await prisma.groupMember.deleteMany({ where: { userId: u.id } });
    await prisma.user.update({
      where: { id: u.id },
      data: { status: "ARCHIVED", mustChangePassword: false },
    });
  }
  return users.length;
}

async function reassignMadinaConflictsToYaye(rows, resolver, yayeId, actorId) {
  const madina = await prisma.user.findUnique({
    where: { email: "m.tall@mskcreation.net" },
  });
  if (!madina) {
    console.warn("Madina introuvable — skip réaffectation");
    return { reassigned: 0 };
  }

  const existing = await prisma.crmOrganization.findMany({
    select: {
      id: true,
      normalizedName: true,
      name: true,
      ownerId: true,
      opportunities: { select: { id: true, ownerId: true, stage: true } },
    },
  });
  const byNorm = new Map(existing.map((o) => [o.normalizedName, o]));

  let reassigned = 0;
  const details = [];
  for (const row of rows) {
    const wantOwner = resolveOwnerId(resolver, row.ownerHint);
    if (wantOwner !== yayeId) continue;
    const hit = byNorm.get(row.normalizedName);
    if (!hit) continue;
    if (hit.ownerId === yayeId) continue;
    // Uniquement si encore chez Madina (ex-collab) — pas Mathieu / autre actif
    if (hit.ownerId !== madina.id) {
      details.push({
        name: hit.name,
        skipped: true,
        reason: `owner actuel ≠ Madina`,
      });
      continue;
    }
    details.push({ name: hit.name, from: "Madina", to: "Yaye" });
    if (dryRun) {
      reassigned += 1;
      continue;
    }
    await prisma.crmOrganization.update({
      where: { id: hit.id },
      data: { ownerId: yayeId },
    });
    for (const d of hit.opportunities) {
      await prisma.crmOpportunity.update({
        where: { id: d.id },
        data: { ownerId: yayeId },
      });
      await prisma.crmTask.updateMany({
        where: { opportunityId: d.id, status: "OPEN" },
        data: { assigneeId: yayeId },
      });
      await prisma.crmActivity.create({
        data: {
          organizationId: hit.id,
          opportunityId: d.id,
          type: CrmActivityType.NOTE,
          summary: "Réaffectation import Excel Yaye (ex-Madina, anti-doublon)",
          actorId,
          occurredAt: new Date(),
        },
      });
    }
    reassigned += 1;
  }
  console.log("Réaffectations Madina→Yaye:", JSON.stringify(details, null, 2));
  return { reassigned };
}

async function main() {
  if (!dryRun) {
    if (process.env.CONFIRM_TEST_PURGE !== "YES") {
      console.error("✗ Définir CONFIRM_TEST_PURGE=YES");
      process.exit(1);
    }
    if (process.env.CONFIRM_IMPORT !== "YES") {
      console.error("✗ Définir CONFIRM_IMPORT=YES");
      process.exit(1);
    }
  }

  console.log(dryRun ? "=== DRY-RUN ===" : "=== WRITE ===");
  console.log("File:", FILE);

  const purged = await purgeTestOrgsOnly();
  console.log("Purge [TEST]:", purged);
  const archived = await archiveTestUsers();
  console.log("Users test archivés:", archived);

  const buf = readFileSync(FILE);
  const parsed = await parseImportFile({
    fileName: FILE,
    bytes: buf,
  });
  console.log(`Excel: ${parsed.rows.length} rows (skipped ${parsed.skipped})`);

  const guiro = await prisma.user.findUnique({
    where: { email: "a.guiro@mskcreation.net" },
  });
  const yaye = await prisma.user.findUnique({
    where: { email: "y.bah@mskcreation.net" },
  });
  if (!guiro || !yaye) throw new Error("Guiro ou Yaye manquant");

  const resolver = await buildUserIdResolver(prisma, guiro.id);

  const before = {
    orgs: await prisma.crmOrganization.count(),
    yayeOpen: await prisma.crmOpportunity.count({
      where: { ownerId: yaye.id, stage: { notIn: ["GAGNE", "PERDU"] } },
    }),
  };
  console.log("Avant import:", before);

  const importResult = await applyCrmImport({
    prisma,
    rows: parsed.rows,
    fallbackUserId: guiro.id,
    dryRun,
    max: 500,
  });
  console.log("Import:", importResult);

  const reassigned = await reassignMadinaConflictsToYaye(
    parsed.rows,
    resolver,
    yaye.id,
    guiro.id,
  );
  console.log("Réaffectation:", reassigned);

  const after = {
    orgs: await prisma.crmOrganization.count(),
    testOrgs: await prisma.crmOrganization.count({
      where: { name: { startsWith: "[TEST]" } },
    }),
    yayeOpen: await prisma.crmOpportunity.count({
      where: { ownerId: yaye.id, stage: { notIn: ["GAGNE", "PERDU"] } },
    }),
    yayeAll: await prisma.crmOpportunity.count({
      where: { ownerId: yaye.id },
    }),
    mathieuOpen: await prisma.crmOpportunity.count({
      where: {
        ownerId:
          (
            await prisma.user.findUnique({
              where: { email: "m.diarra@mskcreation.net" },
            })
          )?.id ?? "__none__",
        stage: { notIn: ["GAGNE", "PERDU"] },
      },
    }),
  };
  console.log("Après:", after);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
