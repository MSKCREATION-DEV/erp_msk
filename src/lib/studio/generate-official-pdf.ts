/**
 * Génération PDF officielle / exemplaire depuis un gabarit actif `ENGINE_BLOCKS`.
 * Composite → générateur historique ; sinon → `renderBlocksToPdf`.
 */
import "server-only";

import type { DocumentTemplate } from "@/generated/prisma/client";
import {
  generateCommercialPdf,
  generateContractPdf,
  type CommercialLine,
  type ContractPdfInput,
} from "@/lib/pdf/commercial";
import {
  generateContractPrestaPdf,
  generateContractStagePdf,
  generateContractTravailPdf,
  generateFichePaiePdf,
  type RhAttestationInput,
  type RhContractPdfInput,
  type RhPayslipInput,
  type RhReglementInput,
  type RhSoldeInput,
} from "@/lib/pdf/rh";
import type { ActiveTemplate } from "@/lib/studio/engine";
import { publishedBlocksOf, publishedVariablesOf } from "@/lib/studio/engine";
import { findCompositeRenderer, type CompositeRenderer } from "@/lib/studio/composite";
import { renderBlocksToPdf } from "@/lib/studio/render-blocks";
import {
  buildAttestationContext,
  buildContractStageContext,
  buildContractTravailContext,
  buildReglementContext,
  buildSoldeContext,
} from "@/lib/studio/rh-template-context";
import { extractVariableSlugs } from "@/lib/studio/variables";
import type { TemplateBlock } from "@/lib/studio/types";

export type OfficialPdfSignature = {
  signaturePng?: Uint8Array | Buffer;
  signatureLabel?: string;
};

export type OfficialCommercialPayload = {
  kind: "commercial";
  input: Parameters<typeof generateCommercialPdf>[0];
};

export type OfficialContractCommercialPayload = {
  kind: "commercial_contract";
  input: ContractPdfInput;
};

export type OfficialRhContractPayload = {
  kind: "rh_contract";
  variant: "TRAVAIL" | "STAGE" | "PRESTA";
  input: RhContractPdfInput;
};

export type OfficialRhDocPayload =
  | { kind: "rh_attestation"; input: RhAttestationInput }
  | { kind: "rh_solde"; input: RhSoldeInput }
  | { kind: "rh_reglement"; input: RhReglementInput }
  | { kind: "rh_payslip"; input: RhPayslipInput };

export type OfficialPdfPayload =
  | OfficialCommercialPayload
  | OfficialContractCommercialPayload
  | OfficialRhContractPayload
  | OfficialRhDocPayload
  | { kind: "blocks_only"; context: Record<string, unknown>; headerTitle?: string };

export type GenerateOfficialOptions = {
  template: ActiveTemplate;
  payload: OfficialPdfPayload;
  signature: OfficialPdfSignature;
  strictVariables: boolean;
  logoAlign?: "left" | "center" | "right";
  /** Playground : corps alternatif. */
  blocksOverride?: TemplateBlock[];
};

function stripCompositeBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
  return blocks.filter((b) => b.kind !== "composite");
}

async function runComposite(
  renderer: CompositeRenderer,
  opts: GenerateOfficialOptions,
): Promise<Uint8Array> {
  const sig = opts.signature;
  const p = opts.payload;

  switch (renderer) {
    case "commercial_devis":
    case "commercial_facture":
      if (p.kind !== "commercial") {
        throw new Error("Payload commercial attendu pour ce gabarit");
      }
      return generateCommercialPdf({ ...p.input, ...sig });
    case "commercial_contract":
      if (p.kind !== "commercial_contract") {
        throw new Error("Payload contrat commercial attendu");
      }
      return generateContractPdf({ ...p.input, ...sig });
    case "rh_contract_travail":
      if (p.kind !== "rh_contract" || p.variant !== "TRAVAIL") {
        throw new Error("Payload contrat travail attendu");
      }
      return generateContractTravailPdf({ ...p.input, ...sig });
    case "rh_contract_stage":
      if (p.kind !== "rh_contract" || p.variant !== "STAGE") {
        throw new Error("Payload contrat stage attendu");
      }
      return generateContractStagePdf({ ...p.input, ...sig });
    case "rh_contract_presta":
      if (p.kind !== "rh_contract" || p.variant !== "PRESTA") {
        throw new Error("Payload contrat presta attendu");
      }
      return generateContractPrestaPdf({ ...p.input, ...sig });
    case "rh_payslip":
      if (p.kind !== "rh_payslip") {
        throw new Error("Payload fiche de paie attendu");
      }
      return generateFichePaiePdf({ ...p.input, ...sig });
    default:
      throw new Error(`Composite inconnu : ${renderer satisfies never}`);
  }
}

function contextForRhBlocks(
  payload: OfficialPdfPayload,
): Record<string, unknown> {
  if (payload.kind === "rh_attestation") {
    return buildAttestationContext(payload.input);
  }
  if (payload.kind === "rh_solde") {
    return buildSoldeContext(payload.input);
  }
  if (payload.kind === "rh_reglement") {
    return buildReglementContext(payload.input);
  }
  if (payload.kind === "rh_contract") {
    return payload.variant === "STAGE"
      ? buildContractStageContext(payload.input)
      : buildContractTravailContext(payload.input);
  }
  if (payload.kind === "blocks_only") {
    return payload.context;
  }
  throw new Error("Contexte blocks RH indisponible pour ce payload");
}

/**
 * Point d’entrée unique — gabarit `ENGINE_BLOCKS` publié requis en amont.
 */
export async function generateOfficialPdfFromTemplate(
  opts: GenerateOfficialOptions,
): Promise<Uint8Array> {
  const template = opts.template;
  const blocks =
    opts.blocksOverride ??
    publishedBlocksOf(template);

  const composite = findCompositeRenderer(blocks);
  if (composite) {
    return runComposite(composite, opts);
  }

  const context =
    opts.payload.kind === "blocks_only"
      ? opts.payload.context
      : contextForRhBlocks(opts.payload);

  const textBlocks = stripCompositeBlocks(blocks);
  const headerTitle =
    opts.payload.kind === "blocks_only" && opts.payload.headerTitle
      ? opts.payload.headerTitle
      : template.name;

  return renderBlocksToPdf(textBlocks, {
    title: headerTitle,
    context,
    strictVariables: opts.strictVariables,
    signatureEnabled: template.signatureEnabled,
    signaturePng: opts.signature.signaturePng,
    signatureLabel: opts.signature.signatureLabel,
    logoAlign: opts.logoAlign,
  });
}

/** Slugs requis déclarés + ceux extraits du corps publié. */
export function declaredSlugsForTemplate(template: ActiveTemplate, bodyText?: string): string[] {
  const fromVersion = publishedVariablesOf(template).map((v) => v.slug);
  const fromBody = bodyText ? extractVariableSlugs(bodyText) : [];
  return [...new Set([...fromVersion, ...fromBody])];
}

export type { CommercialLine };
