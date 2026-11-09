import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseSuiviFromParts } from "./import-suivi";

const xlsxPath = join(
  process.cwd(),
  process.env.SUIVI_XLSX_PATH ??
    "docs/Tableau de Suivi des Devis & Factures Clients.xlsx",
);

if (!existsSync(xlsxPath)) {
  console.log(
    "import-suivi.test.ts SKIP (Excel hors dépôt — SUIVI_XLSX_PATH)",
  );
  process.exit(0);
}

function unzipEntry(entry: string): string {
  return execFileSync("unzip", ["-p", xlsxPath, entry], {
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
  });
}

const result = parseSuiviFromParts({
  sharedStringsXml: unzipEntry("xl/sharedStrings.xml"),
  sheet1Xml: unzipEntry("xl/worksheets/sheet1.xml"),
  sheet2Xml: unzipEntry("xl/worksheets/sheet2.xml"),
});

assert.ok(result.devis.length >= 10, "devis rows");
assert.ok(result.factures.length >= 5, "factures rows");

const prosperity = result.factures.filter((f) =>
  f.client.toUpperCase().includes("PROSPERITY"),
);
assert.ok(prosperity.length >= 1);

const anomaly63 = result.anomalies.find(
  (a) => a.code === "LINES_VS_DECLARED_TOTAL" && a.delta === 63_000,
);
assert.ok(anomaly63, "Prosperity 63k anomaly");

const ecosolAnomaly = result.anomalies.find(
  (a) => a.code === "EXCEL_VS_DOCUMENT",
);
assert.ok(ecosolAnomaly, "ECOSOL excel vs doc anomaly");

console.log(
  `import-suivi.test.ts OK (${result.devis.length} devis, ${result.factures.length} factures, ${result.anomalies.length} anomalies)`,
);
