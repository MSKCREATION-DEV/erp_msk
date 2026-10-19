/**
 * Backfill `createdAt` des deals datés du jour d’import à partir de l’Excel.
 *
 * Priorité date : 1er Contact → Date de création → Date dernière action.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/crm-import/backfill-created-at.ts
 *   npx tsx --env-file=.env.local scripts/crm-import/backfill-created-at.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/crm-import/backfill-created-at.ts \
 *     --file=docs/CRM_Prospection_MSK.xlsx --day=2026-10-19
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseImportFile } from "../../src/lib/crm/import/parse-tabular";
import { resolveImportCreatedAt } from "../../src/lib/crm/import/map-row";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  let file = "docs/CRM_Prospection_MSK.xlsx";
  let day = "2026-10-19";
  let dryRun = false;
  for (const a of argv) {
    if (a.startsWith("--file=")) file = a.slice("--file=".length);
    else if (a.startsWith("--day=")) day = a.slice("--day=".length);
    else if (a === "--dry-run") dryRun = true;
  }
  return { file: resolve(process.cwd(), file), day, dryRun };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dayStart = new Date(`${args.day}T00:00:00.000Z`);
  const dayEnd = new Date(`${args.day}T23:59:59.999Z`);
  if (Number.isNaN(dayStart.getTime())) {
    throw new Error(`Jour invalide: ${args.day}`);
  }

  const buf = readFileSync(args.file);
  const parsed = await parseImportFile({
    fileName: args.file,
    bytes: buf,
  });
  const byNorm = new Map(parsed.rows.map((r) => [r.normalizedName, r]));

  const targets = await prisma.crmOpportunity.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    select: {
      id: true,
      createdAt: true,
      lastActivityAt: true,
      organization: {
        select: { id: true, name: true, normalizedName: true, createdAt: true },
      },
    },
  });

  console.log(
    `Deals créés le ${args.day}: ${targets.length} · Excel rows: ${parsed.rows.length}`,
  );
  if (args.dryRun) console.log("[dry-run] aucune écriture");

  let updated = 0;
  let skippedNoExcel = 0;
  let skippedNoDate = 0;

  for (const deal of targets) {
    const row = byNorm.get(deal.organization.normalizedName);
    if (!row) {
      skippedNoExcel += 1;
      console.log(`  ✗ pas dans Excel: ${deal.organization.name}`);
      continue;
    }
    const next = resolveImportCreatedAt(row);
    if (!next) {
      skippedNoDate += 1;
      console.log(
        `  · sans date Excel (1er contact / création / dernière action): ${deal.organization.name}`,
      );
      continue;
    }

    const source =
      row.firstContactAt === next
        ? "1er Contact"
        : row.excelCreatedAt === next
          ? "Date de création"
          : "Date dernière action";

    console.log(
      `  → ${deal.organization.name}: ${deal.createdAt.toISOString().slice(0, 10)} → ${next.toISOString().slice(0, 10)} (${source})`,
    );

    if (!args.dryRun) {
      await prisma.$transaction([
        prisma.crmOpportunity.update({
          where: { id: deal.id },
          data: {
            createdAt: next,
            lastActivityAt: deal.lastActivityAt ?? row.lastActionAt ?? next,
          },
        }),
        prisma.crmOrganization.update({
          where: { id: deal.organization.id },
          data: { createdAt: next },
        }),
      ]);
    }
    updated += 1;
  }

  console.log(
    `\nRésumé: updated=${updated} noExcel=${skippedNoExcel} noDate=${skippedNoDate}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
