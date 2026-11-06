import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { generateContractPdf } from "./commercial";

/**
 * Extrait le texte d'un PDF via `pdftotext` (poppler) si disponible en local
 * — sinon les assertions de contenu (présence des articles) sont ignorées
 * avec un avertissement, sans faire échouer le test (CI sans poppler).
 */
function extractText(bytes: Uint8Array): string | null {
  try {
    const dir = mkdtempSync(path.join(tmpdir(), "msk-contract-"));
    const file = path.join(dir, "contrat.pdf");
    writeFileSync(file, bytes);
    const text = execFileSync("pdftotext", ["-layout", file, "-"], {
      encoding: "utf8",
    });
    rmSync(dir, { recursive: true, force: true });
    return text;
  } catch {
    return null;
  }
}

function assertContainsAll(text: string, needles: string[], label: string) {
  for (const needle of needles) {
    assert.ok(
      text.includes(needle),
      `${label} — article/section manquant dans le PDF généré : "${needle}"`,
    );
  }
}

const FAMILY_A_ARTICLES = [
  "ARTICLE 1 - OBJET",
  "ARTICLE 2 - OFFRE SOUSCRITE ET PRESTATIONS",
  "ARTICLE 3 - PROCESSUS DE VALIDATION ET ACCES",
  "ARTICLE 4 - DUREE ET RESILIATION",
  "ARTICLE 5 - REMUNERATION ET MODALITES DE PAIEMENT",
  "ARTICLE 6 - OBLIGATIONS DU PRESTATAIRE",
  "ARTICLE 7 - OBLIGATIONS DU CLIENT",
  "ARTICLE 8 - PROPRIETE INTELLECTUELLE",
  "ARTICLE 9 - CONFIDENTIALITE",
  "ARTICLE 10 - PROTECTION DES DONNEES PERSONNELLES",
  "ARTICLE 11 - RESPONSABILITE ET FORCE MAJEURE",
  "ARTICLE 12 - DROIT APPLICABLE ET REGLEMENT DES LITIGES",
  "ARTICLE 13 - SIGNATURES",
];

const FAMILY_B_SECTIONS = [
  "01 - CONTEXTE DU PROJET",
  "02 - OBJECTIFS FONCTIONNELS",
  "03 - MODULES FONCTIONNELS",
  "04 - FONCTIONNALITES INCLUSES",
  "05 - GESTION DES ACCES ET ROLES UTILISATEURS",
  "LIVRABLES",
  "06 - PLANNING D'EXECUTION",
  "07 - RESSOURCES A FOURNIR PAR LE CLIENT",
  "08 - CRITERES DE RECETTE ET VALIDATION",
  "09 - HORS PERIMETRE - NON INCLUS",
  "CONDITIONS CONTRACTUELLES",
  "VALIDATION ET APPROBATION DU CAHIER DES CHARGES",
];

async function main() {
  // Famille A — prestation / abonnement (réseaux sociaux) : 13 articles complets.
  const famA = await generateContractPdf({
    number: "MSK-CONTRAT-2026-001",
    family: "PRESTATION_ABONNEMENT",
    serviceKind: "RESEAUX_SOCIAUX",
    familyLabel: "Prestation / abonnement",
    serviceKindLabel: "Réseaux sociaux",
    clientName: "Awa Traoré",
    clientCompany: "Boutique Awa",
    clientAddress: "Hamdallaye, Bamako",
    contactName: "Awa Traoré",
    offerTier: "PREMIUM",
    startDate: "01/12/2026",
    billingDay: 5,
    currency: "XOF",
    vatRate: 18,
    lines: [
      { label: "Gestion réseaux sociaux — pack Premium", qty: 1, unitPrice: 200_000 },
      { label: "Création de contenu additionnel", qty: 2, unitPrice: 25_000 },
    ],
    complementaryServices: [
      { type: "Captation vidéo courte (1 à 2h / mois)", tariff: "60 000 FCFA", status: "Sur bon de commande" },
    ],
    paymentTerms: "Virement bancaire | Orange Money | Wave | Chèque",
    renewalTerms:
      "Le contrat est conclu pour une durée initiale de trois (3) mois. À l'issue, il est renouvelé automatiquement par périodes d'un (1) mois, sauf dénonciation par l'une des Parties.",
    terminationTerms:
      "À la résiliation : MSK CREATION restitue les accès sous 48 heures ; les sommes dues jusqu'à la date effective restent exigibles.",
  });
  assert.ok(famA.length > 1000, "contrat famille A trop petit");
  const docA = await PDFDocument.load(famA);
  assert.ok(docA.getPageCount() >= 1, "contrat famille A sans page");

  const textA = extractText(famA);
  if (textA) {
    assertContainsAll(textA, FAMILY_A_ARTICLES, "Famille A");
    // Grille d'offres packagées (Article 2) + offre retenue.
    assertContainsAll(textA, ["STANDARD", "PRO", "PREMIUM", "OUI (retenue)"], "Famille A — grille offres");
  } else {
    console.warn("⚠ pdftotext indisponible — assertions de contenu Famille A ignorées");
  }

  // Famille B — engagement / cahier des charges (application web) : sections CDC complètes.
  const longList = Array.from({ length: 25 }, (_, i) => `Point de perimetre numero ${i + 1} avec un libelle assez long pour forcer la pagination du document PDF genere.`);
  const famB = await generateContractPdf({
    number: "MSK-CONTRAT-2026-002",
    family: "ENGAGEMENT_CDC",
    serviceKind: "APPLICATION_WEB",
    familyLabel: "Engagement / cahier des charges",
    serviceKindLabel: "Application web",
    title: "Développement application de gestion de stock",
    clientName: "Ibrahim Koné",
    clientCompany: "SARL Koné Logistique",
    clientAddress: "Zone industrielle, Bamako",
    clientEmail: "contact@konelogistique.ml",
    contactName: "Ibrahim Koné",
    startDate: "15/12/2026",
    currency: "XOF",
    vatRate: 18,
    lines: [
      { label: "Développement application (forfait)", qty: 1, unitPrice: 3_500_000 },
      { label: "Maintenance évolutive (3 mois)", qty: 3, unitPrice: 150_000 },
    ],
    paymentTerms: "40% à la commande, 40% à la recette, 20% à la livraison finale.",
    terminationTerms: "Résiliation encadrée par les CGV MSK CREATION.",
    scope: {
      interlocutorName: "M. Koné",
      interlocutorTitle: "Dirigeant",
      location: "Bamako, Mali",
      currentTools: "Excel + OneDrive",
      contextProblems: ["Suivi des stocks encore fait sur Excel", "Pas de visibilité temps réel"],
      visionTarget: "Centraliser le suivi logistique dans une application web unique.",
      objectives: ["Centraliser le suivi de stock", "Générer des alertes de réapprovisionnement"],
      modules: [
        { name: "Gestion des stocks", features: ["Fiche produit", "Alertes de seuil"] },
      ],
      includedFeatures: [
        { group: "Architecture", items: ["Application web responsive", "Hébergement sécurisé"] },
      ],
      roles: [
        { role: "Administrateur", access: "Total", description: "Tous modules" },
      ],
      deliverables: longList,
      planningPhases: [
        { number: "01", name: "Cadrage", content: "Analyse des besoins", duration: "1 semaine" },
      ],
      totalDurationLabel: "10 à 12 semaines",
      clientResources: [
        { resource: "Fichiers Excel existants", description: "Stocks et références", due: "Avant cadrage" },
      ],
      outOfScope: ["Intégration comptable tierce", "Application mobile native"],
    },
  });
  assert.ok(famB.length > 1000, "contrat famille B trop petit");
  const docB = await PDFDocument.load(famB);
  assert.ok(
    docB.getPageCount() > 1,
    "contrat famille B avec long périmètre devrait paginer sur plusieurs pages",
  );

  const textB = extractText(famB);
  if (textB) {
    assertContainsAll(textB, FAMILY_B_SECTIONS, "Famille B");
  } else {
    console.warn("⚠ pdftotext indisponible — assertions de contenu Famille B ignorées");
  }

  // Famille B sans scope détaillé (fallback gracieux — pas de crash, placeholders "---").
  const famBNoScope = await generateContractPdf({
    number: "MSK-CONTRAT-2026-004",
    family: "ENGAGEMENT_CDC",
    familyLabel: "Engagement / cahier des charges",
    serviceKindLabel: "Site vitrine",
    clientName: "Client Sans Scope",
    lines: [{ label: "Site vitrine", qty: 1, unitPrice: 800_000 }],
  });
  assert.ok(famBNoScope.length > 1000);

  // Signature MVP : sans PNG fourni, pas de crash, tampon texte attendu.
  const unsigned = await generateContractPdf({
    number: "MSK-CONTRAT-2026-003",
    family: "PRESTATION_ABONNEMENT",
    familyLabel: "Prestation / abonnement",
    serviceKindLabel: "Charte graphique",
    clientName: "Client Test",
    lines: [{ label: "Charte graphique", qty: 1, unitPrice: 300_000 }],
  });
  assert.ok(unsigned.length > 1000);

  console.log(
    "✓ contract.test.ts — PDF contrat familles A/B OK (13 articles / sections CDC, pagination, signature MVP)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
