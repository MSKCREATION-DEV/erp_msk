/**
 * Migration CRM Excel MSK — inventaire / purge / ensure-users / import.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/crm-excel-migrate.ts --dry-run --file=docs/CRM_Prospection_MSK.xlsx
 *   CONFIRM_PURGE=YES npx tsx --env-file=.env.local scripts/crm-excel-migrate.ts \
 *     --purge --ensure-users --import --file=docs/CRM_Prospection_MSK.xlsx
 *
 * Flags: --dry-run --purge --ensure-users --import --file=PATH --no-archive-users
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildInventory, formatInventory } from "../src/lib/crm/import/inventory";
import { parseImportFile } from "../src/lib/crm/import/parse-tabular";
import { purgeCrmDomain } from "../src/lib/crm/import/purge";
import { ensureImportUsers } from "../src/lib/crm/import/ensure-users";
import { applyCrmImport } from "../src/lib/crm/import/apply-import";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  let file = "docs/CRM_Prospection_MSK.xlsx";
  for (const a of argv) {
    if (a.startsWith("--file=")) file = a.slice("--file=".length);
    else if (a.startsWith("--")) flags.add(a.slice(2));
  }
  return {
    dryRun: flags.has("dry-run"),
    purge: flags.has("purge"),
    ensureUsers: flags.has("ensure-users"),
    doImport: flags.has("import"),
    noArchiveUsers: flags.has("no-archive-users"),
    file: resolve(process.cwd(), file),
  };
}

async function resolveFallbackUserId(): Promise<string> {
  const guiro = await prisma.user.findUnique({
    where: { email: "a.guiro@mskcreation.net" },
    select: { id: true },
  });
  if (guiro) return guiro.id;
  const any = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
    select: { id: true },
  });
  if (!any) throw new Error("Aucun super-admin pour fallback owner");
  return any.id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("File:", args.file);
  console.log("Flags:", {
    dryRun: args.dryRun,
    purge: args.purge,
    ensureUsers: args.ensureUsers,
    import: args.doImport,
    noArchiveUsers: args.noArchiveUsers,
  });

  const buf = readFileSync(args.file);
  const parsed = await parseImportFile({
    fileName: args.file,
    bytes: buf,
  });
  console.log(
    `\nParsed Excel/CSV: ${parsed.rows.length} rows (skipped ${parsed.skipped}) sheet=${parsed.sheetName ?? "csv"}`,
  );
  console.log("Col map:", parsed.colMap);

  const inventory = await buildInventory(prisma, parsed.rows);
  console.log("\n" + formatInventory(inventory));

  if (args.dryRun && !args.purge && !args.ensureUsers && !args.doImport) {
    console.log("\n✓ Dry-run inventaire seul — aucune écriture.");
    return;
  }

  if (args.purge) {
    if (process.env.CONFIRM_PURGE !== "YES") {
      console.error(
        "\n✗ --purge refusé : définir CONFIRM_PURGE=YES (sécurité).",
      );
      process.exit(1);
    }
    if (args.dryRun) {
      console.log("\n[dry-run] Purge CRM + archive users (simulé, pas d’écriture).");
    } else {
      console.log("\n→ Purge CRM…");
      const result = await purgeCrmDomain(prisma, {
        archiveUsers: !args.noArchiveUsers,
      });
      console.log("✓ Purge:", JSON.stringify(result, null, 2));
    }
  }

  if (args.ensureUsers) {
    if (args.dryRun) {
      console.log("\n[dry-run] Ensure users (simulé).");
    } else {
      console.log("\n→ Ensure users…");
      const result = await ensureImportUsers(prisma);
      console.log("✓ Users:", result.ensured);
      if (result.passwords.length) {
        console.log("⚠ MDP temporaires (nouveaux comptes login) :");
        for (const p of result.passwords) {
          console.log(`  ${p.email} → ${p.tempPassword}`);
        }
      }
    }
  }

  if (args.doImport) {
    const fallbackUserId = await resolveFallbackUserId();
    console.log("\n→ Import (fallback owner:", fallbackUserId, ")…");
    const result = await applyCrmImport({
      prisma,
      rows: parsed.rows,
      fallbackUserId,
      dryRun: args.dryRun,
      max: 500,
    });
    console.log("✓ Import:", result);
  }

  if (!args.purge && !args.ensureUsers && !args.doImport) {
    console.log(
      "\nRien à faire hors inventaire. Ajouter --purge / --ensure-users / --import.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
