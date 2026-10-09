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
  /** Features affichées sur carte pricing (JSON stocké en description étendue via meta). */
  highlights?: string[];
};

/**
 * Prix réels MSK — forfaits réseaux (STD / PRO / PREMIUM) + add-ons
 * issus des devis clients MSK (intégrés en seed, plus de PDF d’exemple dans docs/).
 */
export const CATALOG_OFFERS_SEED: CatalogOfferSeed[] = [
  // —— Contenu & Communication — offres RS (devis 124)
  {
    sku: "CNT-RS-STD",
    name: "Réseaux sociaux — Standard",
    description:
      "8 publications / mois · Facebook + TikTok · 8 visuels · 2 vidéos · réponses 2×/semaine · rapport simple. Engagement min. 3 mois.",
    pillar: "CONTENU_COMMUNICATION",
    billing: "MONTHLY",
    priceXof: 100_000,
    sortOrder: 10,
    highlights: [
      "8 publications / mois",
      "Facebook + TikTok",
      "8 visuels · 2 vidéos",
      "Community 2× / semaine",
      "Rapport mensuel simple",
    ],
  },
  {
    sku: "CNT-RS-PRO",
    name: "Réseaux sociaux — Pro",
    description:
      "10 publications · FB + IG + TikTok · 4 Réels · messages privés · audit mois 1 · 1 appel stratégique. Engagement min. 3 mois.",
    pillar: "CONTENU_COMMUNICATION",
    billing: "MONTHLY",
    priceXof: 150_000,
    sortOrder: 20,
    highlights: [
      "10 publications / mois",
      "Facebook + Instagram + TikTok",
      "4 Réels · 10 visuels · 3 vidéos",
      "Messages privés inclus",
      "Audit + 1 appel / mois",
    ],
  },
  {
    sku: "CNT-RS-PREMIUM",
    name: "Réseaux sociaux — Premium",
    description:
      "12 publications · tous réseaux · 8 Réels + Stories · Ads inclus (budget séparé) · 2 appels / mois. Engagement min. 3 mois.",
    pillar: "CONTENU_COMMUNICATION",
    billing: "MONTHLY",
    priceXof: 200_000,
    sortOrder: 30,
    highlights: [
      "12 publications / mois",
      "Tous réseaux",
      "8 Réels + Stories",
      "Gestion Ads (budget séparé)",
      "2 appels stratégiques / mois",
    ],
  },
  // —— Image de marque
  {
    sku: "IMG-CHARTE",
    name: "Charte graphique",
    description: "À partir de — identité visuelle complète (devis Marinas §3).",
    pillar: "IMAGE_MARQUE",
    billing: "ONE_SHOT",
    priceXof: 100_000,
    sortOrder: 40,
  },
  {
    sku: "IMG-LOGO",
    name: "Création logo",
    description: "Logo + déclinaisons de base",
    pillar: "IMAGE_MARQUE",
    billing: "ONE_SHOT",
    priceXof: 150_000,
    sortOrder: 45,
  },
  // —— Présence digitale
  {
    sku: "WEB-SITE",
    name: "Site Internet",
    description: "À partir de — vitrine / présence web (devis Marinas §3).",
    pillar: "PRESENCE_DIGITALE",
    billing: "ONE_SHOT",
    priceXof: 50_000,
    sortOrder: 50,
  },
  {
    sku: "WEB-ECOM",
    name: "Boutique e-commerce",
    description: "Catalogue, panier, paiement en ligne",
    pillar: "PRESENCE_DIGITALE",
    billing: "PACKAGE",
    priceXof: 500_000,
    sortOrder: 55,
  },
  // —— Ops / add-ons (devis Marinas §4–5)
  {
    sku: "OPS-DEPL-1M",
    name: "Déplacement / captation — 1 mois",
    description:
      "Tournage, photo/vidéo sur site client — non inclus dans les forfaits RS.",
    pillar: "CONTENU_COMMUNICATION",
    billing: "ONE_SHOT",
    priceXof: 25_000,
    sortOrder: 60,
  },
  {
    sku: "OPS-DEPL-3M",
    name: "Déplacement / captation — 3 mois",
    description: "Forfait déplacement sur 3 mois (avenant).",
    pillar: "CONTENU_COMMUNICATION",
    billing: "PACKAGE",
    priceXof: 60_000,
    sortOrder: 65,
  },
  {
    sku: "OPS-FIG-HALF",
    name: "Figurant / talent — ½ journée",
    description: "Casting, coordination, droits à l’image (MSK).",
    pillar: "CONTENU_COMMUNICATION",
    billing: "ONE_SHOT",
    priceXof: 50_000,
    sortOrder: 70,
  },
  {
    sku: "OPS-FIG-DAY",
    name: "Figurant / talent — journée",
    description: "Casting, coordination, droits à l’image (MSK).",
    pillar: "CONTENU_COMMUNICATION",
    billing: "ONE_SHOT",
    priceXof: 70_000,
    sortOrder: 75,
  },
  // —— Croissance & Transformation
  {
    sku: "ACQ-ADS",
    name: "Campagnes acquisition (Ads)",
    description: "Setup + suivi mensuel — budget média séparé.",
    pillar: "CROISSANCE_ACQUISITION",
    billing: "MONTHLY",
    priceXof: 100_000,
    sortOrder: 80,
  },
  {
    sku: "TRF-DIAG",
    name: "Diagnostic & structuration digitale",
    description: "Audit + feuille de route transformation.",
    pillar: "TRANSFORMATION_STRUCTURATION",
    billing: "PACKAGE",
    priceXof: 200_000,
    sortOrder: 90,
  },
];

/** SKU mis en avant sur la grille pricing (équivalent « Most popular »). */
export const CATALOG_FEATURED_SKU = "CNT-RS-PRO";
