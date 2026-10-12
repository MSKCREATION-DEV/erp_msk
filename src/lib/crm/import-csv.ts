import type { CrmPipelineStage, CrmSource } from "@prisma/client";
import { mapExcelSource, mapExcelStatus, normalizeOrgName } from "@/lib/crm/labels";

export type ParsedImportRow = {
  orgName: string;
  contactFirst: string;
  contactLast: string;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  source: CrmSource;
  stage: CrmPipelineStage;
  lastAction: string | null;
  nextAction: string | null;
  followUpAt: Date | null;
  offerLabel: string | null;
  notes: string | null;
  ownerHint: string | null;
  sector: string | null;
};

const HEADER_HINTS = [
  "entreprise",
  "societe",
  "prospect",
  "nom",
  "company",
];

function cleanCell(v: string | undefined): string {
  return (v ?? "").trim().replace(/^"|"$/g, "");
}

function nullish(v: string): string | null {
  if (!v || v === "//" || v === "-" || v === "—") return null;
  return v;
}

export function parseFollowUpDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // JJ/MM/AAAA
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  // AAAA-MM-JJ
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  // Excel serial-ish ignored
  return null;
}

/** Détecte la ligne d’en-têtes ; retourne l’index (0-based) ou -1. */
export function findHeaderRowIndex(lines: string[]): number {
  const limit = Math.min(lines.length, 8);
  for (let i = 0; i < limit; i++) {
    const low = lines[i]!.toLowerCase();
    if (HEADER_HINTS.some((h) => low.includes(h)) && low.includes(";")) {
      return i;
    }
  }
  return -1;
}

function splitCsvLine(line: string): string[] {
  // Excel MSK = `;` ; tolère `,` si pas de `;`
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map(cleanCell);
}

/**
 * Parse une ligne données (indices type PROSPECTS Excel MSK).
 * Colonnes attendues après en-tête :
 * 0 # · 1 Entreprise · 2 Contact · 3 Poste · 4 Tél · 5 E-mail · 6 Origine
 * · 7 1er contact · 8 Statut · 9 Dernière · 10 Prochaine · 11 Relance
 * · 12 Offre · 13 Budget · 14 Notes · (+ évent. suivi / secteur)
 */
export function parseImportDataLine(line: string): ParsedImportRow | null {
  const cols = splitCsvLine(line);
  if (cols.length < 6) return null;

  const orgName = cols[1] ?? "";
  if (!orgName || orgName.startsWith("#") || orgName.toLowerCase() === "entreprise") {
    return null;
  }

  const contactName = cols[2] ?? "";
  const parts = contactName.split(/\s+/).filter(Boolean);
  const contactFirst = parts[0] || "—";
  const contactLast = parts.slice(1).join(" ") || "—";

  return {
    orgName,
    contactFirst,
    contactLast,
    jobTitle: nullish(cols[3] ?? ""),
    phone: nullish(cols[4] ?? ""),
    email: nullish(cols[5] ?? ""),
    source: mapExcelSource(cols[6] ?? ""),
    stage: mapExcelStatus(cols[8] ?? ""),
    lastAction: nullish(cols[9] ?? ""),
    nextAction: nullish(cols[10] ?? ""),
    followUpAt: parseFollowUpDate(cols[11] ?? ""),
    offerLabel: nullish(cols[12] ?? ""),
    notes: nullish(cols[14] ?? cols[13] ?? ""),
    ownerHint: nullish(cols[15] ?? cols[16] ?? ""),
    sector: nullish(cols[17] ?? ""),
  };
}

export function parseImportCsv(text: string): {
  rows: ParsedImportRow[];
  skipped: number;
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headerIdx = findHeaderRowIndex(lines);
  const dataStart = headerIdx >= 0 ? headerIdx + 1 : Math.min(2, lines.length);
  const rows: ParsedImportRow[] = [];
  let skipped = 0;

  for (let i = dataStart; i < lines.length; i++) {
    const row = parseImportDataLine(lines[i]!);
    if (!row) {
      skipped += 1;
      continue;
    }
    rows.push(row);
  }

  return { rows, skipped };
}

export { normalizeOrgName };
