import type { CrmPipelineStage } from "@prisma/client";
import { normalizeUiStage } from "@/lib/crm/guide-rules";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DevisSlaDeal = {
  stage: CrmPipelineStage;
  interestedAt?: Date | null;
  updatedAt: Date;
  quoteCount: number;
};

/** Horodatage d’entrée en Intéressé (fallback updatedAt si pas encore renseigné). */
export function interestedSince(deal: {
  interestedAt?: Date | null;
  updatedAt: Date;
}): Date {
  return deal.interestedAt ?? deal.updatedAt;
}

/**
 * Règle métier : Intéressé sans devis lié → devis sous 24 h.
 * Compte depuis `interestedAt` (sinon updatedAt).
 */
export function isDevisSlaBreached(
  deal: DevisSlaDeal,
  now = Date.now(),
): boolean {
  if (normalizeUiStage(deal.stage) !== "INTERESSE") return false;
  if (deal.quoteCount > 0) return false;
  return now - interestedSince(deal).getTime() > DAY_MS;
}
