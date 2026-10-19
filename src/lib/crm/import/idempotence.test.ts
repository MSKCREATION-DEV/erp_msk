/**
 * Idempotence apply-import : 1er passage importe les uniques,
 * 2e passe = 0 créé / toutes lignes en doublons.
 *
 *   CONFIRM_PURGE=YES npx tsx --env-file=.env.local src/lib/crm/import/idempotence.test.ts
 *
 * Sans CONFIRM_PURGE=YES : vérifie seulement l’état actuel + 2e passe (non destructif).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseXlsxBuffer } from "@/lib/crm/import/parse-tabular";
import { applyCrmImport } from "@/lib/crm/import/apply-import";
import { ensureImportUsers } from "@/lib/crm/import/ensure-users";
import { purgeCrmDomain } from "@/lib/crm/import/purge";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("⏭ skip — DATABASE_URL absent");
    return;
  }

  const buf = readFileSync(
    resolve(process.cwd(), "docs/CRM_Prospection_MSK.xlsx"),
  );
  const { rows } = parseXlsxBuffer(buf);
  assert.ok(rows.length >= 300, `rows=${rows.length}`);

  const uniqueNames = new Set(rows.map((r) => r.normalizedName));
  console.log({
    rows: rows.length,
    unique: uniqueNames.size,
    internalExcelDupes: rows.length - uniqueNames.size,
  });

  if (process.env.CONFIRM_PURGE === "YES") {
    console.log("→ purge + ensure-users…");
    await purgeCrmDomain(prisma, { archiveUsers: false });
    await ensureImportUsers(prisma);

    const guiro = await prisma.user.findUniqueOrThrow({
      where: { email: "a.guiro@mskcreation.net" },
      select: { id: true },
    });

    console.log("→ 1er import…");
    const first = await applyCrmImport({
      prisma,
      rows,
      fallbackUserId: guiro.id,
      max: 500,
      concurrency: 8,
    });
    console.log("  1er:", first);
    assert.equal(first.imported, uniqueNames.size);
    assert.equal(first.duplicates, rows.length - uniqueNames.size);
    assert.equal(first.imported + first.duplicates, rows.length);
  }

  const orgs = await prisma.crmOrganization.count();
  const deals = await prisma.crmOpportunity.count();
  console.log({ orgs, deals });
  assert.equal(orgs, uniqueNames.size);
  assert.equal(deals, uniqueNames.size);

  const madina = await prisma.user.findUnique({
    where: { email: "m.tall@mskcreation.net" },
    select: { id: true },
  });
  const mathieu = await prisma.user.findUnique({
    where: { email: "m.diarra@mskcreation.net" },
    select: { id: true },
  });
  assert.ok(madina && mathieu);
  const byMadina = await prisma.crmOpportunity.count({
    where: { ownerId: madina.id },
  });
  const byMathieu = await prisma.crmOpportunity.count({
    where: { ownerId: mathieu.id },
  });
  console.log(`  owners Madina=${byMadina} Mathieu=${byMathieu}`);
  assert.ok(byMadina >= 300, `Madina ${byMadina}`);
  assert.equal(byMathieu, 11);

  const guiro = await prisma.user.findUniqueOrThrow({
    where: { email: "a.guiro@mskcreation.net" },
    select: { id: true },
  });

  console.log("→ 2e import (doit tout skipper)…");
  const second = await applyCrmImport({
    prisma,
    rows,
    fallbackUserId: guiro.id,
    max: 500,
    concurrency: 8,
  });
  console.log("  2e:", second);
  assert.equal(second.imported, 0, "2e import ne doit rien créer");
  assert.equal(second.duplicates, rows.length);

  const orgs2 = await prisma.crmOrganization.count();
  assert.equal(orgs2, orgs, "orgs inchangé");

  const dupes = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT "normalizedName" FROM crm_organizations
      GROUP BY "normalizedName" HAVING COUNT(*) > 1
    ) t
  `;
  assert.equal(dupes[0]?.n ?? 0, 0, "aucun normalizedName en double en DB");

  console.log("✓ idempotence OK — pas d’enregistrement en double");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
