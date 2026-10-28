import type { CrmActivityType, CrmPipelineStage } from "@prisma/client";

/**
 * Seuil informatif « Relancé N× » (badge) — n’bloque plus le passage PERDU.
 * Aligné LOT-G — voir `OUTREACH_ACTIVITY_TYPES` dans follow-up-count.ts.
 */
export const MIN_ACTIVITIES_BEFORE_LOST = 3;

/** Canaux autorisés au passage Contacté (LOT-B Direction). */
export const CONTACT_STAGE_CHANNELS = [
  "APPEL",
  "WHATSAPP",
  "INSTAGRAM",
  "LINKEDIN",
  "EMAIL",
  "AUTRE",
] as const satisfies readonly CrmActivityType[];

export type ContactStageChannel = (typeof CONTACT_STAGE_CHANNELS)[number];

/** Longueur min. du commentaire au passage Contacté. */
export const CONTACT_COMMENT_MIN_LEN = 10;

/** Longueur min. du commentaire obligatoire au passage Perdu. */
export const LOSS_NOTE_MIN_LEN = CONTACT_COMMENT_MIN_LEN;

/** Stages où une date de relance est obligatoire. */
export function followUpRequiredForStage(stage: CrmPipelineStage): boolean {
  return stage !== "GAGNE" && stage !== "PERDU" && stage !== "NOUVEAU";
}

export function normalizeUiStage(stage: CrmPipelineStage): CrmPipelineStage {
  return stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
}

/** Transition *vers* Contacté (pas si déjà Contacté). */
export function isEnteringContacte(
  from: CrmPipelineStage,
  to: CrmPipelineStage,
): boolean {
  return normalizeUiStage(to) === "CONTACTE" && normalizeUiStage(from) !== "CONTACTE";
}
