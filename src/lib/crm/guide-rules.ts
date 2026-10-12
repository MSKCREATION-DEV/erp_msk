import type { CrmPipelineStage } from "@prisma/client";

/** GUIDE MSK : min. 3 actions journalisées avant passage PERDU. */
export const MIN_ACTIVITIES_BEFORE_LOST = 3;

/** Stages où une date de relance est obligatoire. */
export function followUpRequiredForStage(stage: CrmPipelineStage): boolean {
  return stage !== "GAGNE" && stage !== "PERDU" && stage !== "NOUVEAU";
}

export function normalizeUiStage(stage: CrmPipelineStage): CrmPipelineStage {
  return stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage;
}
