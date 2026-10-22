/**
 * Chemins des captures dans `public/guides/shots/`.
 * Générer : `node scripts/capture-guides-shots.mjs` (dev serveur + Playwright).
 */
export const GUIDE_SHOTS = {
  accueil: "/guides/shots/accueil.png",
  guidesHome: "/guides/shots/guides-home.png",
  commercialHub: "/guides/shots/commercial-hub.png",
  crmDashboard: "/guides/shots/crm-dashboard.png",
  crmProspects: "/guides/shots/crm-prospects.png",
  crmProspectsNouveau: "/guides/shots/crm-prospects-nouveau.png",
  crmRelances: "/guides/shots/crm-relances.png",
  ged: "/guides/shots/ged.png",
  espace: "/guides/shots/espace.png",
  adminUsers: "/guides/shots/admin-users.png",
} as const;
