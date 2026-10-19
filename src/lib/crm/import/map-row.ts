import type { CrmPipelineStage, CrmSource } from "@prisma/client";
import {
  mapExcelSource,
  mapExcelStatus,
  normalizeOrgName,
} from "@/lib/crm/labels";
import type { ImportField } from "@/lib/crm/import/headers";

export type MappedImportRow = {
  orgName: string;
  normalizedName: string;
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
  firstContactAt: Date | null;
  offerLabel: string | null;
  budgetXof: number | null;
  notes: string | null;
  ownerHint: string | null;
  createdByHint: string | null;
  probability: number | null;
};

function cleanCell(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    // Excel serial date → handled separately for date fields
    return String(v);
  }
  return String(v).trim().replace(/^"|"$/g, "");
}

function nullish(v: string): string | null {
  if (!v || v === "//" || v === "-" || v === "—" || v.toLowerCase() === "null") {
    return null;
  }
  return v;
}

/** Excel serial (days since 1899-12-30) ou formats FR / ISO. */
export function parseImportDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial
    const epoch = Date.UTC(1899, 11, 30);
    const ms = epoch + raw * 86400000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = cleanCell(raw);
  if (!s || s === "//") return null;

  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  // Nombre sérial en string
  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseImportDate(Number(s));
  }
  return null;
}

/** Budget Excel souvent en € — convertit en XOF (×655) si < 50_000. */
export function parseBudgetXof(raw: unknown): number | null {
  const s = cleanCell(raw).replace(/\s/g, "").replace(",", ".");
  if (!s || s === "//") return null;
  const n = Number(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 50_000) return Math.round(n * 655);
  return Math.round(n);
}

function cell(
  row: unknown[],
  colMap: Partial<Record<ImportField, number>>,
  field: ImportField,
): unknown {
  const i = colMap[field];
  if (i == null) return undefined;
  return row[i];
}

export function mapDataRow(
  row: unknown[],
  colMap: Partial<Record<ImportField, number>>,
): MappedImportRow | null {
  const orgName = nullish(cleanCell(cell(row, colMap, "orgName")));
  if (!orgName) return null;
  if (orgName.startsWith("#")) return null;
  const low = orgName.toLowerCase();
  if (low === "entreprise" || low === "societe" || low === "société") {
    return null;
  }

  const contactName = cleanCell(cell(row, colMap, "contactName"));
  const parts = contactName.split(/\s+/).filter(Boolean);
  const contactFirst = parts[0] || "—";
  const contactLast = parts.slice(1).join(" ") || "—";

  const sourceRaw = cleanCell(cell(row, colMap, "source"));
  const stageRaw = cleanCell(cell(row, colMap, "stage"));

  let notes = nullish(cleanCell(cell(row, colMap, "notes")));
  if (
    sourceRaw.toLowerCase().includes("chatgpt") ||
    sourceRaw.toLowerCase().includes("gpt")
  ) {
    notes = [notes, "Origine Excel : ChatGPT / IA"].filter(Boolean).join("\n");
  }

  const probRaw = cleanCell(cell(row, colMap, "probability"));
  let probability: number | null = null;
  if (probRaw && probRaw !== "//") {
    const p = Number(String(probRaw).replace("%", "").replace(",", "."));
    if (Number.isFinite(p)) {
      probability = p <= 1 ? Math.round(p * 100) : Math.round(p);
    }
  }

  return {
    orgName,
    normalizedName: normalizeOrgName(orgName),
    contactFirst,
    contactLast,
    jobTitle: nullish(cleanCell(cell(row, colMap, "jobTitle"))),
    phone: nullish(cleanCell(cell(row, colMap, "phone"))),
    email: nullish(cleanCell(cell(row, colMap, "email"))),
    source: mapExcelSource(sourceRaw),
    stage: mapExcelStatus(stageRaw),
    lastAction: nullish(cleanCell(cell(row, colMap, "lastAction"))),
    nextAction: nullish(cleanCell(cell(row, colMap, "nextAction"))),
    followUpAt: parseImportDate(cell(row, colMap, "followUpAt")),
    firstContactAt: parseImportDate(cell(row, colMap, "firstContact")),
    offerLabel: nullish(cleanCell(cell(row, colMap, "offerLabel"))),
    budgetXof: parseBudgetXof(cell(row, colMap, "budget")),
    notes,
    ownerHint: nullish(cleanCell(cell(row, colMap, "owner"))),
    createdByHint: nullish(cleanCell(cell(row, colMap, "createdBy"))),
    probability,
  };
}
