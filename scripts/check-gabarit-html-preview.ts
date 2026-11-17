/**
 * Gate : preview HTML de chaque gabarit inventaire vs titres / chrome.
 * npx tsx scripts/check-gabarit-html-preview.ts
 */
import { textToBlocks } from "../src/lib/studio/dsl";
import { renderBlocksToHtml } from "../src/lib/studio/render-blocks-html";
import {
  CHARGE_TEMPLATE_DSL_SPECS,
  LEGACY_TEMPLATE_DSL_SPECS,
} from "../src/lib/studio/template-dsl-bodies";
import { applyVariableOverrides } from "../src/lib/studio/variables";

const ATTESTATION_PRESENCE = [
  "# Attestation de présence",
  "",
  "{{entreprise.nom}} atteste que {{collaborateur.prenom}} {{collaborateur.nom}}.",
].join("\n");

const ALL = [
  ...LEGACY_TEMPLATE_DSL_SPECS,
  ...CHARGE_TEMPLATE_DSL_SPECS,
  {
    code: "attestation_presence_libre",
    body: ATTESTATION_PRESENCE,
    changelog: "canon",
  },
];

const ctx = applyVariableOverrides(
  {},
  {
    "collaborateur.prenom": "Awa",
    "collaborateur.nom": "Traoré",
    "collaborateur.fonction": "Chargée",
    "collaborateur.civilite": "Mme",
    "collaborateur.email": "a@mskcreation.net",
    "client.nom": "Boutique Awa",
    "client.adresse": "Bamako",
    "client.telephone": "+223",
    "client.email": "a@x.ml",
    "client.entreprise": "KOUNDJI",
    "client.entreprise_suffixe": "",
    "client.contact_nom": "Awa",
    "entreprise.nom": "MSK CREATION",
    "entreprise.adresse": "ACI 2000",
    "entreprise.devise": "FCFA",
    "entreprise.heures_hebdo": "40",
    "document.numero": "DOC-1",
    "document.date": "17/11/2026",
    "document.validite": "30 jours",
    "document.tva_taux": "18 %",
    "devis.objet": "RS 3 mois",
    "devis.mission": "CM",
    "contrat.offre_libelle": "PRO",
    "contrat.montant_mensuel": "150 000",
    "contrat.delai_validation_h": "48",
    "contrat.delai_acces_h": "48",
    "contrat.preavis_jours": "30",
    "contrat.med_jours": "15",
    "contrat.restitution_acces_h": "48",
    "contrat.acompte_pct": "50",
    "contrat.penalite_retard_pct": "1",
    "contrat.confidentialite_annees": "5",
    "contrat.plafond_mois": "3",
    "contrat.amiable_jours": "30",
    "contrat.date_debut": "01/09/2026",
    "contrat.date_fin": "30/09/2026",
    "contrat.lieu": "Bamako",
    "contrat.date_debut_phrase": "Effet le 01/09/2026.",
    "contrat.date_debut_phrase_stage": "Stage du 01/09 au 30/09.",
    "contrat.periode_essai_mois": "3",
    "contrat.remuneration_phrase": "Net 165 000 FCFA.",
    "contrat.gratification_phrase": "Gratification 85 000.",
    "contrat.dispositions_particulieres_block": "",
    "contrat.dispositions_generales_titre": "Article 15",
    "contrat.dispositions_generales_titre_stage": "Article 12",
    "solde.montant": "85 000",
    "solde.montant_lettres": "(Quatre-vingt-cinq mille)",
    "solde.reference": " chèque",
    "solde.attestation_clause": "attestation, ",
    "collaborateur.adresse_suffixe": ", Bamako",
    "collaborateur.naissance_suffixe": "",
    "collaborateur.piece_identite_suffixe": "",
    "paie.periode_debut": "01/09/2026",
    "paie.periode_fin": "30/09/2026",
    "paie.net": "165 000",
    "paie.brut": "224 673",
    "paie.type_contrat": "CDI",
    "paie.conges_solde": "4",
    "paie.conges_pris": "0",
  },
);

let failures = 0;
for (const spec of ALL) {
  const html = renderBlocksToHtml(textToBlocks(spec.body), {
    title: spec.code,
    context: ctx,
    signatureEnabled: false,
    logoAlign: "left",
  });
  const checks = [
    ["sheet", html.includes("msk-doc-sheet")],
    ["header", html.includes("msk-doc-chrome-header")],
    ["footer", html.includes("msk-doc-chrome-footer")],
    ["title", html.includes(spec.code)],
    ["nif", html.includes("NIF")],
    ["no-missing-critical", !html.includes("⟪document.numero manquant⟫")],
  ] as const;
  const bad = checks.filter(([, ok]) => !ok).map(([n]) => n);
  if (bad.length) {
    failures += 1;
    console.log("FAIL", spec.code, bad.join(", "));
  } else {
    const headings = (spec.body.match(/^# .+$/gm) ?? []).length;
    console.log("OK ", spec.code, `headings=${headings}`, `html=${html.length}c`);
  }
}

if (failures) {
  console.error(`✗ ${failures} gabarit(s) en échec`);
  process.exit(1);
}
console.log("✓ check-gabarit-html-preview — tous OK");
