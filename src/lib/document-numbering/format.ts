import { DOC_NUMBER_PREFIX, type DocNumberKind } from "./kinds";

/** Clé de période journalière YYYYMMDD (UTC ou date locale fournie). */
export function periodKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function formatOfficialNumber(params: {
  kind: DocNumberKind;
  periodKey: string;
  sequence: number;
  pad?: number;
}): string {
  if (!/^\d{8}$/.test(params.periodKey) && !/^\d{4}$/.test(params.periodKey)) {
    throw new Error(`Invalid periodKey: ${params.periodKey}`);
  }
  if (!Number.isInteger(params.sequence) || params.sequence < 1) {
    throw new Error(`Invalid sequence: ${params.sequence}`);
  }
  const pad = params.pad ?? 4;
  const prefix = DOC_NUMBER_PREFIX[params.kind];
  const n = String(params.sequence).padStart(pad, "0");
  return `${prefix}-${params.periodKey}-${n}`;
}

/** Brouillon — ne consomme pas la séquence officielle. */
export function formatDraftCode(params: {
  kind: DocNumberKind;
  idSuffix: string;
}): string {
  const prefix = DOC_NUMBER_PREFIX[params.kind];
  const suffix = params.idSuffix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `DRF-${prefix}-${suffix || "TMP"}`;
}

export function parseOfficialNumber(number: string): {
  kind: DocNumberKind;
  periodKey: string;
  sequence: number;
} | null {
  const m = /^(DEV|FAC|AVO|BDC)-(\d{4}|\d{8})-(\d+)$/.exec(number);
  if (!m) return null;
  const prefix = m[1]!;
  const kindMap: Record<string, DocNumberKind> = {
    DEV: "DEVIS",
    FAC: "FACTURE",
    AVO: "AVOIR",
    BDC: "BDC",
  };
  return {
    kind: kindMap[prefix]!,
    periodKey: m[2]!,
    sequence: Number.parseInt(m[3]!, 10),
  };
}
