/**
 * Payloads métier pour `generateOfficialPdfFromTemplate` (DSL + régions).
 */
import type {
  CommercialPdfInput,
  ContractPdfInput,
} from "@/lib/pdf/commercial";
import type {
  RhAttestationInput,
  RhContractPdfInput,
  RhPayslipInput,
  RhReglementInput,
  RhSoldeInput,
} from "@/lib/pdf/rh";

export type OfficialCommercialPayload = {
  kind: "commercial";
  input: CommercialPdfInput;
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
