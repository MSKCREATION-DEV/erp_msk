import { parseImportDate } from "@/lib/crm/import/map-row";

/** Alias historique pour import-csv. */
export function parseFollowUpDateCompat(raw: string) {
  return parseImportDate(raw);
}

export { parseImportDate };
