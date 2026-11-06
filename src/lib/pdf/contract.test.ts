import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { generateContractPdf } from "./commercial";

async function main() {
  // Famille A — prestation / abonnement (ex. réseaux sociaux) : pas de bloc périmètre.
  const famA = await generateContractPdf({
    number: "MSK-CONTRAT-2026-001",
    family: "PRESTATION_ABONNEMENT",
    familyLabel: "Prestation / abonnement",
    serviceKindLabel: "Réseaux sociaux",
    clientName: "Awa Traoré",
    clientCompany: "Boutique Awa",
    clientAddress: "Hamdallaye, Bamako",
    contactName: "Awa Traoré",
    startDate: "01/12/2026",
    billingDay: 5,
    currency: "XOF",
    vatRate: 18,
    lines: [
      { label: "Gestion réseaux sociaux — pack Premium", qty: 1, unitPrice: 200_000 },
      { label: "Création de contenu additionnel", qty: 2, unitPrice: 25_000 },
    ],
    paymentTerms: "Paiement mensuel à réception de facture, échéance 10 jours.",
    renewalTerms: "Reconduction tacite par periode de 12 mois sauf préavis de 30 jours.",
    terminationTerms: "Résiliation possible avec préavis écrit de 30 jours.",
  });
  assert.ok(famA.length > 1000, "contrat famille A trop petit");
  const docA = await PDFDocument.load(famA);
  assert.ok(docA.getPageCount() >= 1, "contrat famille A sans page");

  // Famille B — engagement / cahier des charges (ex. application web) : bloc périmètre requis.
  const longList = Array.from({ length: 25 }, (_, i) => `Point de perimetre numero ${i + 1} avec un libelle assez long pour forcer la pagination du document PDF genere.`);
  const famB = await generateContractPdf({
    number: "MSK-CONTRAT-2026-002",
    family: "ENGAGEMENT_CDC",
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
      contextProblems: ["Suivi des stocks encore fait sur Excel", "Pas de visibilité temps réel"],
      objectives: ["Centraliser le suivi de stock", "Générer des alertes de réapprovisionnement"],
      deliverables: longList,
      outOfScope: ["Intégration comptable tierce", "Application mobile native"],
    },
  });
  assert.ok(famB.length > 1000, "contrat famille B trop petit");
  const docB = await PDFDocument.load(famB);
  assert.ok(
    docB.getPageCount() > 1,
    "contrat famille B avec long périmètre devrait paginer sur plusieurs pages",
  );

  // Signature MVP (P4.4) : sans PNG fourni, pas de crash, tampon texte attendu.
  const unsigned = await generateContractPdf({
    number: "MSK-CONTRAT-2026-003",
    family: "PRESTATION_ABONNEMENT",
    familyLabel: "Prestation / abonnement",
    serviceKindLabel: "Charte graphique",
    clientName: "Client Test",
    lines: [{ label: "Charte graphique", qty: 1, unitPrice: 300_000 }],
  });
  assert.ok(unsigned.length > 1000);

  console.log("✓ contract.test.ts — PDF contrat familles A/B OK (pagination, signature MVP)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
