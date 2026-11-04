import type { CrmActivityType } from "@/generated/prisma/client";
import { MIN_ACTIVITIES_BEFORE_LOST } from "@/lib/crm/guide-rules";

/**
 * LOT-G — activités de suivi comptées comme « relances ».
 * Exclut NOTE (journaux système / libres).
 * Safe client — pas d’import Prisma runtime.
 */
export const OUTREACH_ACTIVITY_TYPES: CrmActivityType[] = [
  "APPEL",
  "WHATSAPP",
  "INSTAGRAM",
  "LINKEDIN",
  "EMAIL",
  "RDV",
  "AUTRE",
];

/** Seuil GUIDE / badge coral (≥ N relances). */
export const RELANCE_GUIDE_THRESHOLD = MIN_ACTIVITIES_BEFORE_LOST;

export function formatRelanceCount(n: number): string {
  return `${Math.max(0, Math.trunc(n))}×`;
}

/** Somme des N relances d’une Map id→count. */
export function sumOutreachCounts(counts: Map<string, number>): number {
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}

/** Filtre pur Map id→count (testable sans DB). */
export function idsMeetingMinOutreach(
  counts: Map<string, number>,
  min: number,
): string[] {
  if (min <= 0) return [...counts.keys()];
  return [...counts.entries()]
    .filter(([, n]) => n >= min)
    .map(([id]) => id);
}

/** NOTE exclue du compteur historique. */
export function isOutreachActivityType(type: CrmActivityType): boolean {
  return (OUTREACH_ACTIVITY_TYPES as readonly string[]).includes(type);
}
