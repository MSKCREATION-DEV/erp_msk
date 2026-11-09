import type { ClientFinancialSnapshot } from "@/lib/billing/client-financials";
import { normalizeClientName } from "@/lib/commercial/labels";
import type { SortDir } from "@/lib/list/sort";

export type ClientAccountSummary = {
  id: string;
  name: string;
  status: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  ownerName: string;
  createdAt: Date;
};

export type ClientAccountRow = {
  client: ClientAccountSummary;
  fin: ClientFinancialSnapshot;
};

/** Statut dérivé du solde — utilisé pour filtre + badge (liste et compte). */
export type ClientAccountStatut = "OUVERT" | "RETARD" | "SOLDE";

export const CLIENT_ACCOUNT_STATUT_VALUES: ClientAccountStatut[] = [
  "RETARD",
  "OUVERT",
  "SOLDE",
];

export const CLIENT_ACCOUNT_STATUT_LABELS: Record<ClientAccountStatut, string> = {
  RETARD: "En retard",
  OUVERT: "Ouvert",
  SOLDE: "Soldé",
};

export function deriveClientAccountStatut(
  fin: Pick<ClientFinancialSnapshot, "openReceivable" | "overdueAmount">,
): ClientAccountStatut {
  if (fin.openReceivable === 0) return "SOLDE";
  if (fin.overdueAmount > 0) return "RETARD";
  return "OUVERT";
}

/** Recherche texte — nom, contact, email, téléphone (insensible accents/casse). */
export function matchesClientAccountQuery(
  client: ClientAccountSummary,
  q: string,
): boolean {
  const needle = normalizeClientName(q);
  if (!needle) return true;
  const haystacks = [client.name, client.contactName, client.email, client.phone];
  return haystacks.some(
    (h) => h != null && normalizeClientName(h).includes(needle),
  );
}

export function parseClientAccountStatutFilter(
  sp: Record<string, string | undefined>,
): ClientAccountStatut[] {
  const raw = sp.statut?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return raw.filter((s): s is ClientAccountStatut =>
    (CLIENT_ACCOUNT_STATUT_VALUES as string[]).includes(s),
  );
}

export function filterClientAccountRows(
  rows: ClientAccountRow[],
  opts: { q?: string; statut?: ClientAccountStatut[] },
): ClientAccountRow[] {
  let out = rows;
  if (opts.statut && opts.statut.length > 0) {
    const allowed = new Set(opts.statut);
    out = out.filter((r) => allowed.has(deriveClientAccountStatut(r.fin)));
  }
  const q = opts.q?.trim();
  if (q) {
    out = out.filter((r) => matchesClientAccountQuery(r.client, q));
  }
  return out;
}

export const CLIENT_ACCOUNT_SORT_KEYS = [
  "name",
  "owner",
  "invoiced",
  "paid",
  "balance",
  "overdue",
  "due",
] as const;

export type ClientAccountSortKey = (typeof CLIENT_ACCOUNT_SORT_KEYS)[number];

function compareNullableDates(a: Date | null, b: Date | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.getTime() - b.getTime();
}

function compareClientAccountRows(
  a: ClientAccountRow,
  b: ClientAccountRow,
  key: ClientAccountSortKey,
): number {
  switch (key) {
    case "name":
      return a.client.name.localeCompare(b.client.name, "fr", {
        sensitivity: "base",
      });
    case "owner":
      return a.client.ownerName.localeCompare(b.client.ownerName, "fr", {
        sensitivity: "base",
      });
    case "invoiced":
      return a.fin.totalInvoiced - b.fin.totalInvoiced;
    case "paid":
      return a.fin.totalPaidAllocated - b.fin.totalPaidAllocated;
    case "balance":
      return a.fin.openReceivable - b.fin.openReceivable;
    case "overdue":
      return a.fin.overdueAmount - b.fin.overdueAmount;
    case "due":
      return compareNullableDates(a.fin.nextDueDate, b.fin.nextDueDate);
    default:
      return 0;
  }
}

export function parseClientAccountSortKey(
  raw: string | undefined,
): ClientAccountSortKey {
  if (raw && (CLIENT_ACCOUNT_SORT_KEYS as readonly string[]).includes(raw)) {
    return raw as ClientAccountSortKey;
  }
  return "balance";
}

export function sortClientAccountRows(
  rows: ClientAccountRow[],
  key: ClientAccountSortKey,
  dir: SortDir,
): ClientAccountRow[] {
  const sorted = [...rows].sort((a, b) => compareClientAccountRows(a, b, key));
  return dir === "asc" ? sorted : sorted.reverse();
}

export function sumClientAccountTotals(rows: ClientAccountRow[]) {
  return rows.reduce(
    (acc, r) => ({
      totalInvoiced: acc.totalInvoiced + r.fin.totalInvoiced,
      totalPaid: acc.totalPaid + r.fin.totalPaidAllocated,
      totalOpen: acc.totalOpen + r.fin.openReceivable,
      totalOverdue: acc.totalOverdue + r.fin.overdueAmount,
    }),
    { totalInvoiced: 0, totalPaid: 0, totalOpen: 0, totalOverdue: 0 },
  );
}
