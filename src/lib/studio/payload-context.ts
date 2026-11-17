/**
 * Contexte `{{slug}}` dérivé d’un `OfficialPdfPayload` — source unique pour
 * DSL + régions composites (pipeline unifié).
 */
import { company } from "@/lib/company";
import { formatDateFr, formatMoneyFr } from "@/lib/pdf/winansi";
import type { OfficialPdfPayload } from "@/lib/studio/official-payload";
import {
  buildAttestationContext,
  buildContractStageContext,
  buildContractTravailContext,
  buildReglementContext,
  buildSoldeContext,
} from "@/lib/studio/rh-template-context";
import type { RhContractPdfInput } from "@/lib/pdf/rh";

function buildCommercialContext(
  payload: Extract<OfficialPdfPayload, { kind: "commercial" }>,
): Record<string, unknown> {
  const input = payload.input;
  const vatRate = input.vatRate ?? 18;
  const currency = input.currency ?? company.currency;
  return {
    client: {
      nom: input.clientName,
      entreprise: input.clientCompany ?? "",
      adresse: input.clientAddress ?? "",
      telephone: input.clientPhone ?? "",
    },
    devis: {
      objet: input.object ?? "",
      mission: input.missionNote ?? "",
    },
    document: {
      numero: input.number,
      date: input.issueDate ?? formatDateFr(),
      validite: input.validityDate ?? "30 jours",
      tva_taux: `${vatRate} %`,
    },
    entreprise: {
      nom: company.legalName,
      devise: currency,
    },
  };
}

function buildCommercialContractContext(
  payload: Extract<OfficialPdfPayload, { kind: "commercial_contract" }>,
): Record<string, unknown> {
  const input = payload.input;
  const currency = input.currency ?? company.currency;
  const ht = input.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const monthly =
    input.lines.length > 0 ? `${formatMoneyFr(ht)} ${currency}` : "—";
  return {
    client: {
      nom: input.clientName,
      entreprise: input.clientCompany ?? "",
      entreprise_suffixe: input.clientCompany
        ? ` (${input.clientCompany})`
        : "",
      adresse: input.clientAddress ?? "",
      telephone: input.clientPhone ?? "",
      email: input.clientEmail ?? "",
      contact_nom: input.contactName ?? input.clientName,
    },
    contrat: {
      offre_libelle:
        input.offerTier != null
          ? `${input.serviceKindLabel} — ${input.offerTier}`
          : input.serviceKindLabel,
      montant_mensuel: monthly,
      delai_validation_h: String(input.validationHours ?? 48),
      delai_acces_h: String(input.adminAccessHours ?? 48),
      preavis_jours: String(input.noticeDays ?? 30),
      med_jours: String(input.cureDays ?? 15),
      restitution_acces_h: String(input.accessReturnHours ?? 48),
      acompte_pct: String(input.depositPercent ?? 50),
      penalite_retard_pct: String(input.latePenaltyPercentPerWeek ?? 1),
      confidentialite_annees: String(input.confidentialityYears ?? 5),
      plafond_mois: String(input.liabilityCapMonths ?? 3),
      amiable_jours: String(input.amicableDays ?? 30),
    },
    document: {
      numero: input.number,
      date: input.issueDate ?? input.startDate ?? formatDateFr(),
    },
    entreprise: { nom: company.legalName },
  };
}

function buildContractPrestaContext(
  input: RhContractPdfInput,
  issueDate?: string,
): Record<string, unknown> {
  const e = input.employee;
  const dispositionsParticulieres = input.notes
    ? `Dispositions particulières : ${input.notes}`
    : "";
  return {
    entreprise: { nom: company.legalName },
    collaborateur: {
      civilite: e.civility ?? "M.",
      prenom: e.firstName,
      nom: e.lastName,
      fonction: e.jobTitle ?? input.title,
      adresse_suffixe: e.address ? `, demeurant à ${e.address}` : "",
    },
    contrat: {
      dispositions_particulieres_block: dispositionsParticulieres,
    },
    document: {
      date: issueDate ?? formatDateFr(),
      numero: input.title,
    },
  };
}

function buildPayslipContext(
  payload: Extract<OfficialPdfPayload, { kind: "rh_payslip" }>,
): Record<string, unknown> {
  const input = payload.input;
  const net = input.netSalaryXof ?? input.baseSalaryXof;
  return {
    entreprise: {
      nom: company.legalName,
      devise: company.currency,
      heures_hebdo: String(company.weeklyHours),
    },
    collaborateur: {
      prenom: input.employee.firstName,
      nom: input.employee.lastName,
      fonction: input.employee.jobTitle ?? "—",
      email: input.employee.email ?? "",
    },
    paie: {
      type_contrat: input.contractTypeLabel ?? "Temps plein",
      periode_debut: input.periodStart,
      periode_fin: input.periodEnd,
      net: formatMoneyFr(net),
      brut: formatMoneyFr(input.baseSalaryXof),
      conges_solde: String(input.leaveBalanceDays ?? 0),
      conges_pris: String(input.leaveTakenDays ?? 0),
    },
    document: {
      date: input.computedAt ?? formatDateFr(),
      numero: `PAIE-${input.periodStart}`,
    },
  };
}

/**
 * Contexte variables pour n’importe quel payload officiel.
 */
export function contextFromOfficialPayload(
  payload: OfficialPdfPayload,
): Record<string, unknown> {
  switch (payload.kind) {
    case "blocks_only":
      return payload.context;
    case "commercial":
      return buildCommercialContext(payload);
    case "commercial_contract":
      return buildCommercialContractContext(payload);
    case "rh_payslip":
      return buildPayslipContext(payload);
    case "rh_attestation":
      return buildAttestationContext(payload.input);
    case "rh_solde":
      return buildSoldeContext(payload.input);
    case "rh_reglement":
      return buildReglementContext(payload.input);
    case "rh_contract":
      if (payload.variant === "STAGE") {
        return buildContractStageContext(payload.input);
      }
      if (payload.variant === "PRESTA") {
        return buildContractPrestaContext(payload.input);
      }
      return buildContractTravailContext(payload.input);
    default: {
      const _exhaustive: never = payload;
      return _exhaustive;
    }
  }
}
