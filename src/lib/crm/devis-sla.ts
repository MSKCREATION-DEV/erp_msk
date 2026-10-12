import type { CrmPipelineStage } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DevisSlaDeal = {
  stage: CrmPipelineStage;
  interestedAt?: Date | null;
  updatedAt: Date;
  quoteCount: number;
};

/** Normalise Négociation → Devis envoyé (UI). */
function uiStage(stage: CrmPipelineStage): CrmPipelineStage {
  return stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
}

/** Horodatage d’entrée en Intéressé (fallback updatedAt si pas encore renseigné). */
export function interestedSince(deal: {
  interestedAt?: Date | null;
  updatedAt: Date;
}): Date {
  return deal.interestedAt ?? deal.updatedAt;
}

/**
 * GUIDE : Intéressé sans devis lié → devis sous 24h.
 * Compte depuis `interestedAt` (sinon updatedAt).
 */
export function isDevisSlaBreached(
  deal: DevisSlaDeal,
  now = Date.now(),
): boolean {
  if (uiStage(deal.stage) !== "INTERESSE") return false;
  if (deal.quoteCount > 0) return false;
  return now - interestedSince(deal).getTime() > DAY_MS;
}
