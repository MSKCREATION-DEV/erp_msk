import { normalizeOrgName } from "@/lib/crm/labels";
import { normalizeChannelValue, phoneDigits } from "@/lib/crm/channels";
import type { CrmContactChannelType } from "@prisma/client";

/** Déclenchement live recherche org / e-mail (caractères exploitables). */
export const MIN_LIVE_SEARCH_CHARS = 3;
/** Tél / WhatsApp : seuil de pertinence (évite faux positifs trop tôt). */
export const MIN_PHONE_SEARCH_DIGITS = 6;
export const FUZZY_THRESHOLD = 0.5;
export const MAX_DUPLICATE_CANDIDATES = 5;
/** Candidats DB avant scoring fuzzy (index `normalizedName`). */
export const ORG_CANDIDATE_POOL = 80;

export type DuplicateKind = "exact" | "fuzzy";
export type DuplicateEntity = "prospect" | "client";

/** Identité = tél / e-mail / WhatsApp — ack obligatoire (LOT-F soft create). */
export type ContactMatchSeverity = "identity" | "channel";

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
  severity: ContactMatchSeverity;
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

export function usableOrgSearchLength(name: string): number {
  return normalizeOrgName(name).replace(/\s+/g, "").length;
}

export function orgLiveSearchReady(name: string): boolean {
  return usableOrgSearchLength(name) >= MIN_LIVE_SEARCH_CHARS;
}

export function isIdentityChannelType(type: CrmContactChannelType): boolean {
  return type === "PHONE" || type === "EMAIL" || type === "WHATSAPP";
}

export function contactSeverityForType(
  type: CrmContactChannelType,
): ContactMatchSeverity {
  return isIdentityChannelType(type) ? "identity" : "channel";
}

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

export function scoreOrgNames(
  inputName: string,
  candidateName: string,
): {
  kind: DuplicateKind | null;
  score: number;
} {
  const a = normalizeOrgName(inputName);
  const b = normalizeOrgName(candidateName);
  if (!a || !b) return { kind: null, score: 0 };
  if (a === b) return { kind: "exact", score: 1 };

  // Préfixe dès 3 car. : « smdf » → « smdf sa », « mar » → « marinas »
  const aCompact = a.replace(/\s+/g, "");
  const bCompact = b.replace(/\s+/g, "");
  if (
    aCompact.length >= MIN_LIVE_SEARCH_CHARS &&
    (bCompact.startsWith(aCompact) || aCompact.startsWith(bCompact))
  ) {
    const ratio =
      Math.min(aCompact.length, bCompact.length) /
      Math.max(aCompact.length, bCompact.length);
    return {
      kind: "fuzzy",
      score: Math.max(ratio, FUZZY_THRESHOLD),
    };
  }

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
    return d.length >= MIN_PHONE_SEARCH_DIGITS ? [d, n] : [];
  }
  return [n];
}

/** Tokens utiles pour préfiltrer les orgs via l’index `normalizedName`. */
export function orgSearchTokens(orgName: string): string[] {
  const norm = normalizeOrgName(orgName);
  if (!norm) return [];
  const parts = norm.split(/\s+/).filter((t) => t.length >= 2);
  const out: string[] = [];
  if (norm.length >= 2) out.push(norm);
  for (const p of parts.slice(0, 4)) {
    if (!out.includes(p)) out.push(p);
  }
  const compact = norm.replace(/\s+/g, "");
  if (compact.length >= MIN_LIVE_SEARCH_CHARS) {
    const prefix = compact.slice(0, Math.min(compact.length, 6));
    if (!out.includes(prefix)) out.push(prefix);
  }
  return out;
}

/**
 * Toute correspondance org (exacte ou proche) bloque la création —
 * dès que la recherche live (≥ 3 caractères) renvoie des candidats.
 */
export function hasBlockingOrgMatch(
  candidates: OrgDuplicateCandidate[],
): boolean {
  return candidates.length > 0;
}

export function hasIdentityContactMatch(
  candidates: ContactDuplicateCandidate[],
): boolean {
  return candidates.some((c) => c.severity === "identity");
}
