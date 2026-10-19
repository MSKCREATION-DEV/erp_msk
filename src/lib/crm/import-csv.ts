/**
 * Compat — l’ancien parse CSV délègue au moteur header-based.
 * Préférer `@/lib/crm/import/parse-tabular` + `apply-import`.
 */
import { parseCsvText } from "@/lib/crm/import/parse-tabular";
import type { MappedImportRow } from "@/lib/crm/import/map-row";
import { parseImportDate, parseFollowUpDateCompat } from "@/lib/crm/import/map-row-compat";
import { normalizeOrgName } from "@/lib/crm/labels";

export type ParsedImportRow = MappedImportRow;

export function parseFollowUpDate(raw: string) {
  return parseFollowUpDateCompat(raw);
}

export function parseImportCsv(text: string): {
  rows: MappedImportRow[];
  skipped: number;
} {
  const { rows, skipped } = parseCsvText(text);
  return { rows, skipped };
}

export { normalizeOrgName, parseImportDate };
