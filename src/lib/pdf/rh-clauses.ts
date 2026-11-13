/**
 * Clauses contractuelles RH MSK — texte partagé entre générateurs legacy
 * (`rh.ts`) et gabarits Studio (`ENGINE_BLOCKS`). Source : modèles hors dépôt
 * (Contrat Travail / Stage / Presta, v2–v3 2026-11-08).
 */
import { company } from "@/lib/company";

export function employerIntroText(): string {
  return (
    `La société ${company.legalName}, société à responsabilité limitée au capital de ${company.capital}, ` +
    `dont le siège social est situé à Bamako, ${company.addressOneLine}, immatriculée au Registre du Commerce ` +
    `et du Crédit Mobilier (RCCM) sous le numéro ${company.rccm}, représentée par Monsieur ${company.managerName}, ` +
    `en sa qualité de ${company.managerTitle}, ci-après dénommée « l'Employeur » ou « la Société », d'une part,`
  );
}

export function workScheduleArticleText(): string {
  return (
    `La durée hebdomadaire de travail sera de ${company.weeklyHours} heures, réparties du lundi au vendredi. ` +
    `Horaire type : lundi, mardi, jeudi, vendredi de 8h à 17h (pause 1h) ; mercredi de 8h à 17h (télétravail possible).`
  );
}

export function confidentialityArticleText(personLabel: string): string {
  return (
    `${personLabel} s'engage à conserver confidentiels, pendant toute la durée du contrat et après sa cessation, ` +
    `tous les documents, informations, procédés techniques, bases de données, codes sources, identifiants, informations ` +
    `commerciales ou stratégiques dont il/elle pourrait avoir connaissance dans le cadre de ses fonctions. Toute ` +
    `divulgation non autorisée fera l'objet de poursuites disciplinaires et/ou judiciaires.`
  );
}

export function materielArticleText(personLabel: string): string {
  return (
    `${personLabel} s'engage à utiliser avec soin tout matériel, équipement ou ressource mis à sa disposition par ` +
    `l'entreprise. Sauf autorisation écrite, tout matériel fourni (ordinateur, téléphone, logiciels, supports, etc.) ` +
    `doit rester dans l'enceinte de l'entreprise et ne peut être utilisé à des fins personnelles. En cas de ` +
    `télétravail autorisé, les règles de sécurité et de confidentialité restent applicables.`
  );
}

export function propertyArticleText(personLabel: string): string {
  return (
    `Tout travail, développement, montage, code, design, contenu, base de données, logiciel, application ou ` +
    `système réalisé par ${personLabel.toLowerCase()} dans le cadre de son contrat, ou avec les moyens de ` +
    `l'entreprise, demeure la propriété exclusive de ${company.legalName}. ${personLabel} cède, à titre exclusif ` +
    `et gratuit, l'ensemble de ses droits de propriété intellectuelle sur lesdites créations.`
  );
}

export function disciplineArticleText(): string {
  return (
    `Tout manquement aux obligations contractuelles pourra donner lieu à des sanctions disciplinaires ` +
    `conformément aux dispositions du Code du travail malien, pouvant aller de l'avertissement au licenciement ` +
    `pour faute grave.`
  );
}

export function achatsLogicielsArticleText(
  nounGenitive: "du salarié" | "du/de la stagiaire",
  personLabel: "le salarié" | "le/la stagiaire",
): string {
  return (
    `Tout achat de logiciel, abonnement, service en ligne, banque d'image, ou autre ressource nécessaire à ` +
    `l'exercice des missions ${nounGenitive}, doit être pré-approuvé par l'entreprise et pris en charge ` +
    `financièrement par ${company.legalName}. Aucun frais ne sera supporté personnellement par ${personLabel}.`
  );
}

export function resiliationArticleText(): string {
  return (
    `Le présent contrat peut être résilié par l'une ou l'autre des parties moyennant le respect du préavis légal ` +
    `en vigueur au Mali, sauf en cas de faute grave justifiant un licenciement immédiat.`
  );
}

export function dispositionsGeneralesArticleText(): string {
  return (
    `Pour tout point non prévu au présent contrat, les parties se réfèrent aux dispositions du Code du travail ` +
    `de la République du Mali. Tout litige relatif à l'interprétation ou à l'exécution du présent contrat ` +
    `relèvera de la compétence des juridictions maliennes compétentes.`
  );
}
