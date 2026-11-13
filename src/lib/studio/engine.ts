/**
 * Studio documentaire — moteur central. Point d’entrée unique que les
 * modules métier (Commercial, RH, …) doivent appeler avant de générer un
 * PDF officiel : un document = un gabarit central, jamais improvisé.
 *
 * - `requireActiveTemplate` : gabarit manquant / inactif / non publié →
 *   erreur métier explicite (jamais de document silencieux).
 * - `resolveTemplateSignature` : la signature n’est jamais injectée si le
 *   gabarit n’a pas explicitement `signatureEnabled = true`.
 */
import "server-only";

import type { DocumentTemplate, DocumentTemplateVersion } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSignaturePngBytes } from "@/lib/signatures/resolve";
import { parseBlocks, parseDeclaredVariables } from "@/lib/studio/types";

export class TemplateNotFoundError extends Error {
  constructor(code: string) {
    super(
      `Gabarit « ${code} » introuvable — créez-le dans Administration ▸ Gabarits avant de générer ce document.`,
    );
    this.name = "TemplateNotFoundError";
  }
}

export class TemplateInactiveError extends Error {
  constructor(code: string) {
    super(
      `Gabarit « ${code} » désactivé — réactivez-le dans Administration ▸ Gabarits pour générer ce document.`,
    );
    this.name = "TemplateInactiveError";
  }
}

export class TemplateNotPublishedError extends Error {
  constructor(code: string) {
    super(
      `Gabarit « ${code} » n’a aucune version publiée — publiez une version dans le Studio avant de générer ce document.`,
    );
    this.name = "TemplateNotPublishedError";
  }
}

export type ActiveTemplate = DocumentTemplate & {
  publishedVersion: DocumentTemplateVersion | null;
};

/**
 * Charge un gabarit par son `code` et garantit qu’il est utilisable :
 * existe, actif, et — pour les gabarits `ENGINE_BLOCKS` — publié.
 * À appeler en tout premier dans toute action de génération PDF.
 */
export async function requireActiveTemplate(code: string): Promise<ActiveTemplate> {
  const template = await prisma.documentTemplate.findUnique({
    where: { code },
    include: { publishedVersion: true },
  });
  if (!template) throw new TemplateNotFoundError(code);
  if (!template.active) throw new TemplateInactiveError(code);
  if (template.generatorKind === "ENGINE_BLOCKS" && !template.publishedVersion) {
    throw new TemplateNotPublishedError(code);
  }
  return template;
}

/**
 * Signature pour un gabarit donné — centralise la règle absolue « OFF par
 * défaut » : aucune image de signature n’est résolue si
 * `template.signatureEnabled` est `false`, même si l’acteur a une signature
 * active enregistrée.
 */
export async function resolveTemplateSignature(opts: {
  template: Pick<DocumentTemplate, "signatureEnabled">;
  ownerUserId?: string;
  signerLabel?: string;
}): Promise<{ bytes?: Buffer; label?: string }> {
  if (!opts.template.signatureEnabled) return {};
  const signature = await getSignaturePngBytes({
    ownerUserId: opts.ownerUserId,
  }).catch(() => null);
  if (!signature) return {};
  return { bytes: signature.bytes, label: opts.signerLabel ?? signature.label };
}

/** Blocs publiés d’un gabarit `ENGINE_BLOCKS` (typés, jamais `unknown` nu dans l’UI/moteur). */
export function publishedBlocksOf(template: ActiveTemplate) {
  return parseBlocks(template.publishedVersion?.bodyJson);
}

/** Variables déclarées par la version publiée d’un gabarit `ENGINE_BLOCKS`. */
export function publishedVariablesOf(template: ActiveTemplate) {
  return parseDeclaredVariables(template.publishedVersion?.variablesJson);
}
