import { normalizeOrgName } from "@/lib/crm/labels";
import { normalizeChannelValue, phoneDigits } from "@/lib/crm/channels";
import type { CrmContactChannelType } from "@prisma/client";

export const FUZZY_THRESHOLD = 0.5;
export const MAX_DUPLICATE_CANDIDATES = 5;

export type DuplicateKind = "exact" | "fuzzy";
export type DuplicateEntity = "prospect" | "client";

export type OrgDuplicateCandidate = {
  kind: DuplicateKind;
  entity: DuplicateEntity;
  score: number;
  href: string;
  id: string;
  opportunityId: string | null;
  name: string;
  city: string | null;
  sector: string | null;
  stageLabel: string | null;
  primaryContact: string | null;
  createdBy: string;
  owner: string;
};

export type ContactDuplicateCandidate = {
  kind: "exact";
  entity: DuplicateEntity;
  href: string;
  id: string;
  opportunityId: string | null;
  orgName: string;
  contactName: string;
  matchedVia: string;
  city: string | null;
  createdBy: string;
  owner: string;
};

/** Dice coefficient on bigrams — 0..1. */
export function diceCoefficient(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x.length || !y.length) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) {
    return x === y ? 1 : 0;
  }
  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const A = bigrams(x);
  const B = bigrams(y);
  let intersection = 0;
  for (const [g, ca] of A) {
    const cb = B.get(g);
    if (cb) intersection += Math.min(ca, cb);
  }
  return (2 * intersection) / (x.length - 1 + (y.length - 1));
}

export function scoreOrgNames(inputName: string, candidateName: string): {
  kind: DuplicateKind | null;
  score: number;
} {
  const a = normalizeOrgName(inputName);
  const b = normalizeOrgName(candidateName);
  if (!a || !b) return { kind: null, score: 0 };
  if (a === b) return { kind: "exact", score: 1 };
  const score = diceCoefficient(a, b);
  if (score >= FUZZY_THRESHOLD) return { kind: "fuzzy", score };
  return { kind: null, score };
}

export function channelMatchKeys(
  type: CrmContactChannelType,
  value: string,
): string[] {
  const n = normalizeChannelValue(type, value);
  if (!n) return [];
  if (type === "PHONE" || type === "WHATSAPP") {
    const d = phoneDigits(n);
    return d.length >= 6 ? [d, n] : [];
  }
  return [n];
}
