import * as XLSX from "xlsx";
import {
  isLikelyHeaderRow,
  mapHeaderRow,
  type ImportField,
} from "@/lib/crm/import/headers";
import { mapDataRow, type MappedImportRow } from "@/lib/crm/import/map-row";

export type ParseTabularResult = {
  rows: MappedImportRow[];
  skipped: number;
  sheetName: string | null;
  headers: string[];
  colMap: Partial<Record<ImportField, number>>;
};

function splitCsvLine(line: string): string[] {
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
}

export function parseCsvText(text: string): ParseTabularResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const cells = splitCsvLine(lines[i]!);
    if (isLikelyHeaderRow(cells)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    headerIdx = Math.min(1, lines.length - 1);
  }
  const headers = splitCsvLine(lines[headerIdx] ?? "");
  const colMap = mapHeaderRow(headers);
  const rows: MappedImportRow[] = [];
  let skipped = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const mapped = mapDataRow(cells, colMap);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    rows.push(mapped);
  }
  return { rows, skipped, sheetName: null, headers, colMap };
}

function pickProspectsSheet(wb: XLSX.WorkBook): string {
  const names = wb.SheetNames;
  const hit = names.find((n) => /prospect/i.test(n));
  if (hit) return hit;
  return names[0] ?? "";
}

export function parseXlsxBuffer(
  buf: ArrayBuffer | Buffer,
  sheetHint?: string,
): ParseTabularResult {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const sheetName =
    (sheetHint && wb.SheetNames.includes(sheetHint)
      ? sheetHint
      : pickProspectsSheet(wb)) || wb.SheetNames[0]!;
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return {
      rows: [],
      skipped: 0,
      sheetName: null,
      headers: [],
      colMap: {},
    };
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
    sheet,
    { header: 1, defval: null, raw: true },
  ) as unknown[][];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 8); i++) {
    const cells = (matrix[i] ?? []).map((c) =>
      c == null ? "" : String(c),
    );
    if (isLikelyHeaderRow(cells)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) headerIdx = Math.min(1, matrix.length - 1);

  const headers = (matrix[headerIdx] ?? []).map((c) =>
    c == null ? "" : String(c),
  );
  const colMap = mapHeaderRow(headers);
  const rows: MappedImportRow[] = [];
  let skipped = 0;
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const mapped = mapDataRow(matrix[i] ?? [], colMap);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    rows.push(mapped);
  }
  return { rows, skipped, sheetName, headers, colMap };
}

export async function parseImportFile(opts: {
  fileName: string;
  bytes: ArrayBuffer | Buffer;
  textFallback?: string;
}): Promise<ParseTabularResult> {
  const lower = opts.fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsxBuffer(opts.bytes);
  }
  const text =
    opts.textFallback ??
    (typeof Buffer !== "undefined" && Buffer.isBuffer(opts.bytes)
      ? opts.bytes.toString("utf8")
      : new TextDecoder().decode(opts.bytes as ArrayBuffer));
  return parseCsvText(text);
}
