import type { CatalogBilling, CatalogPillar } from "@prisma/client";

export type CatalogOfferSeed = {
  sku: string;
  name: string;
  description: string;
  pillar: CatalogPillar;
  billing: CatalogBilling;
  priceXof: number;
  priceEurHint?: number;
  sortOrder: number;
};

/** Offres représentatives — prix indicatifs FCFA (CDC §6.2bis). */
export const CATALOG_OFFERS_SEED: CatalogOfferSeed[] = [
  {
    sku: "IMG-LOGO",
    name: "Création logo",
    description: "Identité visuelle — logo + déclinaisons de base",
    pillar: "IMAGE_MARQUE",
    billing: "ONE_SHOT",
    priceXof: 250_000,
    priceEurHint: 380,
    sortOrder: 10,
  },
  {
    sku: "IMG-CHARTE",
    name: "Charte graphique",
    description: "Charte complète + kit branding",
    pillar: "IMAGE_MARQUE",
    billing: "PACKAGE",
    priceXof: 450_000,
    priceEurHint: 680,
    sortOrder: 20,
  },
  {
    sku: "CNT-RS-STD",
    name: "Gestion réseaux sociaux — Standard",
    description: "Publications + community management (mensuel)",
    pillar: "CONTENU_COMMUNICATION",
    billing: "MONTHLY",
    priceXof: 100_000,
    priceEurHint: 150,
    sortOrder: 30,
  },
  {
    sku: "CNT-VIDEO",
    name: "Production vidéo / motion",
    description: "Visuels animés & vidéo courte",
    pillar: "CONTENU_COMMUNICATION",
    billing: "ONE_SHOT",
    priceXof: 200_000,
    priceEurHint: 300,
    sortOrder: 40,
  },
  {
    sku: "WEB-VITRINE",
    name: "Site vitrine",
    description: "Site institutionnel responsive",
    pillar: "PRESENCE_DIGITALE",
    billing: "ONE_SHOT",
    priceXof: 500_000,
    priceEurHint: 760,
    sortOrder: 50,
  },
  {
    sku: "WEB-ECOM",
    name: "Boutique e-commerce",
    description: "Catalogue, panier, paiement",
    pillar: "PRESENCE_DIGITALE",
    billing: "PACKAGE",
    priceXof: 950_000,
    priceEurHint: 1450,
    sortOrder: 60,
  },
  {
    sku: "ACQ-ADS",
    name: "Campagnes acquisition",
    description: "Meta / Google Ads — setup + suivi mensuel",
    pillar: "CROISSANCE_ACQUISITION",
    billing: "MONTHLY",
    priceXof: 150_000,
    priceEurHint: 230,
    sortOrder: 70,
  },
  {
    sku: "TRF-DIAG",
    name: "Diagnostic & structuration digitale",
    description: "Audit + feuille de route transformation",
    pillar: "TRANSFORMATION_STRUCTURATION",
    billing: "PACKAGE",
    priceXof: 350_000,
    priceEurHint: 530,
    sortOrder: 80,
  },
];
