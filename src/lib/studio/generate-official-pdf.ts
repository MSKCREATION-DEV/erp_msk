/**
 * Génération PDF officielle / exemplaire depuis un gabarit actif `ENGINE_BLOCKS`.
 * Pipeline unique : DSL/blocs + régions composites → `renderBlocksToPdf`.
 * (ADR : docs/architecture/ADR-studio-pipeline-unifie.md)
 */
import "server-only";

import type { CommercialLine } from "@/lib/pdf/commercial";
import type { ActiveTemplate } from "@/lib/studio/engine";
import { publishedBlocksOf, publishedVariablesOf } from "@/lib/studio/engine";
import type { OfficialPdfPayload } from "@/lib/studio/official-payload";
import { contextFromOfficialPayload } from "@/lib/studio/payload-context";
import { renderBlocksToPdf } from "@/lib/studio/render-blocks";
import type { TemplateBlock } from "@/lib/studio/types";
import {
  applyVariableOverrides,
  extractVariableSlugs,
} from "@/lib/studio/variables";
import {
  mergeDocumentChrome,
  parseDocumentChrome,
  type DocumentChromeInput,
} from "@/lib/studio/document-chrome";

export type OfficialPdfSignature = {
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

export type {
  OfficialCommercialPayload,
  OfficialContractCommercialPayload,
  OfficialRhContractPayload,
  OfficialRhDocPayload,
  OfficialPdfPayload,
} from "@/lib/studio/official-payload";

export type GenerateOfficialOptions = {
  template: ActiveTemplate;
  payload: OfficialPdfPayload;
  signature: OfficialPdfSignature;
  strictVariables: boolean;
  logoAlign?: "left" | "center" | "right";
  /** Playground / persist : chrome document (merge sur structureJson). */
  chromeOverride?: Partial<DocumentChromeInput> | null;
  /** Playground : corps alternatif. */
  blocksOverride?: TemplateBlock[];
  /**
   * @deprecated Plus de mode texte séparé — le pipeline unifié rend DSL +
   * régions. Conservé no-op pour appels legacy éventuels.
   */
  playgroundTextMode?: boolean;
  /** Playground : forcer l’affichage du bloc signature (toggle aperçu). */
  signatureEnabledOverride?: boolean;
  /** Playground : écrase les valeurs `{{slug}}` dérivées du payload. */
  variableOverrides?: Record<string, string>;
};

/**
 * Point d’entrée unique — gabarit `ENGINE_BLOCKS` publié requis en amont.
 * Toujours DSL + régions (plus de court-circuit composite → générateur TS).
 */
export async function generateOfficialPdfFromTemplate(
  opts: GenerateOfficialOptions,
): Promise<Uint8Array> {
  const template = opts.template;
  const blocks = opts.blocksOverride ?? publishedBlocksOf(template);

  let context = contextFromOfficialPayload(opts.payload);
  if (opts.variableOverrides && Object.keys(opts.variableOverrides).length > 0) {
    context = applyVariableOverrides(context, opts.variableOverrides);
  }

  const baseChrome = parseDocumentChrome(template.structureJson);
  const chrome = mergeDocumentChrome(baseChrome, {
    ...opts.chromeOverride,
    logoAlign:
      opts.chromeOverride?.logoAlign ?? opts.logoAlign ?? baseChrome.logoAlign,
  });

  const headerTitle =
    opts.chromeOverride?.headerTitle?.trim() ||
    (opts.payload.kind === "blocks_only" && opts.payload.headerTitle
      ? opts.payload.headerTitle
      : null) ||
    chrome.headerTitle?.trim() ||
    template.name;

  return renderBlocksToPdf(blocks, {
    title: headerTitle,
    context,
    strictVariables: opts.strictVariables,
    signatureEnabled:
      opts.signatureEnabledOverride ?? template.signatureEnabled,
    signaturePng: opts.signature.signaturePng,
    signatureLabel: opts.signature.signatureLabel,
    logoAlign: chrome.logoAlign,
    chrome,
    compositePayload: opts.payload,
  });
}

/** Slugs requis déclarés + ceux extraits du corps publié. */
export function declaredSlugsForTemplate(
  template: ActiveTemplate,
  bodyText?: string,
): string[] {
  const fromVersion = publishedVariablesOf(template).map((v) => v.slug);
  const fromBody = bodyText ? extractVariableSlugs(bodyText) : [];
  return [...new Set([...fromVersion, ...fromBody])];
}

export type { CommercialLine };
