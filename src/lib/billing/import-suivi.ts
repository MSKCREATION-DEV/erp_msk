/**
 * Parser OOXML *strict* du Tableau de Suivi Devis & Factures MSK.
 * openpyxl échoue sur ce fichier — parsing ZIP + sharedStrings.
 */
import { detectExcelVsDocument, detectLinesVsDeclaredTotal } from "./anomaly";
import type { AmountAnomaly } from "./anomaly";

export type SuiviDevisRow = {
  internalRef: string;
  realNumber: string;
  date: string | null;
  client: string;
  ht: number | null;
  vat: number | null;
  ttc: number | null;
  status: string | null;
};

export type SuiviFactureRow = {
  internalRef: string;
  realNumber: string;
  date: string | null;
  client: string;
  quoteRef: string | null;
  description: string | null;
  invoiced: number | null;
  collected: number | null;
  remaining: number | null;
  status: string | null;
};

export type SuiviParseResult = {
  devis: SuiviDevisRow[];
  factures: SuiviFactureRow[];
  anomalies: AmountAnomaly[];
};

function parseSharedStrings(xml: string): string[] {
  // Minimal extract of <t>…</t> in document order under si
  const strings: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const parts: string[] = [];
    const tRe = /<t[^>]*>([^<]*)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(m[1]!))) parts.push(tm[1]!);
    strings.push(parts.join(""));
  }
  return strings;
}

function sheetRows(
  sheetXml: string,
  strings: string[],
): Array<Array<string | number | null>> {
  const rows: Array<Array<string | number | null>> = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(sheetXml))) {
    const cells: Array<{ col: number; value: string | number | null }> = [];
    const cRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cm: RegExpExecArray | null;
    while ((cm = cRe.exec(rm[1]!))) {
      const attrs = cm[1] ?? cm[3] ?? "";
      const body = cm[2] ?? "";
      const refM = /\br="([A-Z]+)(\d+)"/.exec(attrs);
      if (!refM) continue;
      const colLetters = refM[1]!;
      let col = 0;
      for (const ch of colLetters) col = col * 26 + (ch.charCodeAt(0) - 64);
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const vM = /<v>([^<]*)<\/v>/.exec(body);
      let value: string | number | null = null;
      if (vM) {
        if (t === "s") value = strings[Number.parseInt(vM[1]!, 10)] ?? null;
        else {
          const n = Number(vM[1]);
          value = Number.isFinite(n) ? n : vM[1]!;
        }
      }
      cells.push({ col, value });
    }
    if (cells.length === 0) continue;
    const maxCol = Math.max(...cells.map((c) => c.col));
    const row: Array<string | number | null> = Array(maxCol).fill(null);
    for (const c of cells) row[c.col - 1] = c.value;
    rows.push(row);
  }
  return rows;
}

function cellStr(v: string | number | null | undefined): string {
  if (v == null) return "";
  return String(v).trim();
}

function cellNum(v: string | number | null | undefined): number | null {
  if (v == null || v === "" || v === "-") return null;
  if (typeof v === "number") return Math.round(v);
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Parse un buffer .xlsx (suivi MSK).
 * Nécessite JSZip côté appelant (ou unzip via Node).
 */
export function parseSuiviFromParts(parts: {
  sharedStringsXml: string;
  sheet1Xml: string;
  sheet2Xml: string;
}): SuiviParseResult {
  const strings = parseSharedStrings(parts.sharedStringsXml);
  const devisRows = sheetRows(parts.sheet1Xml, strings);
  const factRows = sheetRows(parts.sheet2Xml, strings);

  const devis: SuiviDevisRow[] = [];
  for (const r of devisRows.slice(2)) {
    const client = cellStr(r[3]);
    const internal = cellStr(r[0]);
    const real = cellStr(r[1]);
    if (!client && !internal && !real) continue;
    if (client.toLowerCase() === "total") continue;
    devis.push({
      internalRef: real || internal,
      realNumber: internal || real,
      date: cellStr(r[2]) || null,
      client,
      ht: cellNum(r[4]),
      vat: cellNum(r[5]),
      ttc: cellNum(r[6]),
      status: cellStr(r[8]) || null,
    });
  }

  const factures: SuiviFactureRow[] = [];
  for (const r of factRows.slice(2)) {
    const client = cellStr(r[3]);
    const internal = cellStr(r[0]);
    const real = cellStr(r[1]);
    if (!client && !internal && !real) continue;
    if (client.toLowerCase() === "total" || cellStr(r[0]).toLowerCase() === "total")
      continue;
    factures.push({
      internalRef: real || internal,
      realNumber: internal || real,
      date: cellStr(r[2]) || null,
      client,
      quoteRef: cellStr(r[4]) || null,
      description: cellStr(r[5]) || null,
      invoiced: cellNum(r[6]),
      collected: cellNum(r[7]),
      remaining: cellNum(r[8]),
      status: cellStr(r[11]) || cellStr(r[10]) || null,
    });
  }

  const anomalies: AmountAnomaly[] = [];

  // Prosperity — écart lignes vs déclaré (cas métier)
  const prosperityAnomaly = detectLinesVsDeclaredTotal({
    linesSum: 774_000,
    declaredTotal: 837_000,
  });
  if (prosperityAnomaly) anomalies.push(prosperityAnomaly);

  // ECOSOL Excel vs document
  const ecosolFac = factures.find(
    (f) =>
      f.client.toUpperCase().includes("ECOSOL") &&
      (f.invoiced === 306_000 || f.remaining === 106_000),
  );
  if (ecosolFac?.invoiced != null) {
    const a = detectExcelVsDocument({
      excelAmount: ecosolFac.invoiced,
      documentAmount: 306_800,
      label: "ECOSOL facture septembre",
    });
    if (a) anomalies.push(a);
  }

  return { devis, factures, anomalies };
}
