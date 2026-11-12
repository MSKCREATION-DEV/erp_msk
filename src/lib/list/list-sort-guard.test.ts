/**
 * Garde-fou repo : pas de tri client sur lignes de listing,
 * pas de th onClick pour tri (pattern SortableTh / URL obligatoire).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name) && !name.includes(".test.")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const offenders: string[] = [];

for (const file of files) {
  const rel = file.slice(process.cwd().length + 1);
  // Exceptions documentées (explorateur GED, libs non-UI, pickers formulaire)
  if (
    rel.includes("components/ged/") ||
    rel.includes("lib/ged/") ||
    rel.includes("lib/crm/team") ||
    rel.includes("lib/rbac/") ||
    rel.includes("lib/templates/") ||
    rel.includes("lib/signatures/") ||
    rel.includes("lib/espace/") ||
    rel.includes("lib/comptabilite/reports") ||
    rel.includes("lib/comptabilite/client-accounts") || // tri mémoire agrégats — exception audit
    rel.includes("lib/crm/prospect-timeline") ||
    rel.includes("lib/crm/duplicate") ||
    rel.includes("lib/suivi/dashboard") ||
    rel.includes("lib/rh/docs-query") ||
    rel.includes("components/crm/crm-week-picker") ||
    rel.includes("components/admin/permission-domains") ||
    rel.includes("components/crm/prospect-select-table") || // picker client paginé
    rel.includes("email/")
  ) {
    continue;
  }

  const src = readFileSync(file, "utf8");
  if (!src.includes("<table") && !src.includes("<thead")) continue;

  // th onClick pour tri
  if (/<th[^>]*\bonClick\b/.test(src)) {
    offenders.push(`${rel}: <th onClick> (utiliser SortableTh / URL)`);
  }

  // Tri JS sur lignes — listings (`page.tsx` hors fiches `[id]` / formulaires)
  const isListingPage =
    rel.includes("app/(app)/") &&
    rel.endsWith("/page.tsx") &&
    !rel.includes("/[") &&
    !rel.includes("/nouveau/") &&
    !rel.includes("/edit/");
  if (
    isListingPage &&
    /\.sort\s*\(/.test(src) &&
    /localeCompare|\.sort\s*\(\s*\(/.test(src)
  ) {
    offenders.push(`${rel}: .sort()/localeCompare sur page listing`);
  }
}

assert.deepEqual(
  offenders,
  [],
  `Garde-fou tri listes — violations:\n${offenders.join("\n")}`,
);

console.log(`list-sort-guard.test.ts OK (${files.length} fichiers scannés)`);
