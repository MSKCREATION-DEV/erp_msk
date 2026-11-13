/**
 * Contexte `{{slug}}` pour gabarits RH `ENGINE_BLOCKS` (génération stricte).
 */
import { company } from "@/lib/company";
import { formatDateFr, formatMoneyFr } from "@/lib/pdf/winansi";
import type { RhAttestationInput, RhContractPdfInput, RhReglementInput, RhSoldeInput } from "@/lib/pdf/rh";

function civility(person: { civility?: "M." | "Mme" }) {
  return person.civility ?? "M.";
}

function personLabel(person: { firstName: string; lastName: string; civility?: "M." | "Mme" }) {
  return `${civility(person)} ${person.firstName} ${person.lastName}`;
}

export function buildContractTravailContext(
  input: RhContractPdfInput,
  issueDate?: string,
): Record<string, unknown> {
  const e = input.employee;
  const dispositionsParticulieres = input.notes
    ? `# Article 15 : Dispositions particulières\n${input.notes}`
  : "";
  const dispositionsTitre = input.notes
    ? "Article 16 : Dispositions générales"
    : "Article 15 : Dispositions générales";

  const dateDebutPhrase = input.endDate
    ? `Le présent contrat prend effet le ${input.startDate} et est conclu jusqu'au ${input.endDate}.`
    : `Le présent contrat prend effet le ${input.startDate} et est conclu pour une durée indéterminée.`;

  const remunerationPhrase = input.salaryXof
    ? `En contrepartie, le salarié percevra une rémunération mensuelle nette de ${formatMoneyFr(input.salaryXof)} ${company.currency}, versée à terme échu par virement ou tout mode autorisé.`
    : `La rémunération est fixée d'un commun accord et précisée en annexe ou avenant.`;

  return {
    entreprise: { nom: company.legalName },
    collaborateur: {
      civilite: civility(e),
      prenom: e.firstName,
      nom: e.lastName,
      fonction: e.jobTitle ?? input.title,
      naissance_suffixe: e.birthDate ? `, né(e) le ${e.birthDate}` : "",
      adresse_suffixe: e.address ? `, demeurant à ${e.address}` : "",
      piece_identite_suffixe: e.idCard ? `, titulaire de la pièce d'identité n° ${e.idCard}` : "",
    },
    contrat: {
      date_debut_phrase: dateDebutPhrase,
      periode_essai_mois: String(input.trialMonths ?? 3),
      remuneration_phrase: remunerationPhrase,
      dispositions_particulieres_block: dispositionsParticulieres,
      dispositions_generales_titre: `# ${dispositionsTitre}`,
    },
    document: { date: issueDate ?? formatDateFr() },
  };
}

export function buildContractStageContext(
  input: RhContractPdfInput,
  issueDate?: string,
): Record<string, unknown> {
  const e = input.employee;
  const dispositionsParticulieres = input.notes
    ? `# Article 12 : Dispositions particulières\n${input.notes}`
    : "";
  const dispositionsTitre = input.notes
    ? "Article 13 : Dispositions générales"
    : "Article 12 : Dispositions générales";

  const datePhrase = input.endDate
    ? `Le stage prend effet le ${input.startDate} et s'achève le ${input.endDate}.`
    : `Le stage prend effet le ${input.startDate} pour une durée déterminée précisée par avenant.`;

  const gratification = input.salaryXof
    ? `Gratification mensuelle nette de ${formatMoneyFr(input.salaryXof)} ${company.currency}, versée à terme échu.`
    : `La gratification éventuelle est précisée en annexe.`;

  return {
    entreprise: { nom: company.legalName },
    collaborateur: {
      civilite: civility(e),
      prenom: e.firstName,
      nom: e.lastName,
      fonction: e.jobTitle ?? "Stagiaire",
      naissance_suffixe: e.birthDate ? `, né(e) le ${e.birthDate}` : "",
      adresse_suffixe: e.address ? `, demeurant à ${e.address}.` : ".",
    },
    contrat: {
      date_debut_phrase_stage: datePhrase,
      gratification_phrase: gratification,
      dispositions_particulieres_block: dispositionsParticulieres,
      dispositions_generales_titre_stage: `# ${dispositionsTitre}`,
    },
    document: { date: issueDate ?? formatDateFr() },
  };
}

export function buildAttestationContext(input: RhAttestationInput): Record<string, unknown> {
  return {
    entreprise: { nom: company.legalName },
    collaborateur: {
      civilite: civility(input.employee),
      prenom: input.employee.firstName,
      nom: input.employee.lastName,
      fonction: input.jobTitle,
    },
    contrat: {
      date_debut: input.startDate,
      date_fin: input.endDate,
      lieu: input.place ?? "Bamako, Mali",
    },
    document: { date: input.issueDate ?? formatDateFr() },
  };
}

export function buildSoldeContext(input: RhSoldeInput): Record<string, unknown> {
  const words =
    input.amountWords ?? `${formatMoneyFr(input.amountXof)} ${company.currency}`;
  return {
    entreprise: { nom: company.legalName },
    collaborateur: {
      prenom: input.employee.firstName,
      nom: input.employee.lastName,
      adresse_suffixe: input.employee.address ? `, demeurant à ${input.employee.address}` : "",
    },
    solde: {
      attestation_clause:
        input.includeAttestation !== false
          ? "mon attestation de fin de relation ainsi que, "
          : " ",
      montant: formatMoneyFr(input.amountXof),
      montant_lettres: `(${words})`,
      reference: input.paymentRef ? ` — référence ${input.paymentRef}` : "",
    },
    document: { date: input.issueDate ?? formatDateFr() },
  };
}

export function buildReglementContext(input: RhReglementInput): Record<string, unknown> {
  return {
    entreprise: { nom: company.legalName },
    collaborateur: {
      prenom: input.employee.firstName,
      nom: input.employee.lastName,
    },
    document: { date: input.issueDate ?? formatDateFr() },
  };
}

export function attestPersonLabel(person: RhAttestationInput["employee"]) {
  return personLabel(person);
}
