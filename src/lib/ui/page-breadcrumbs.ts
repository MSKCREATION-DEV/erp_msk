export type PageBreadcrumb = { label: string; href?: string };

function normalizePath(href: string) {
  try {
    if (href.startsWith("http")) {
      return new URL(href).pathname.replace(/\/$/, "") || "/";
    }
  } catch {
    /* ignore */
  }
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  return path.replace(/\/$/, "") || "/";
}

/**
 * Hubs déjà présents dans la sidebar / onglets module.
 * Les répéter dans le fil d’Ariane n’apporte rien.
 */
const MODULE_HUB_PATHS = new Set([
  "/commercial",
  "/accueil",
  "/rh",
  "/comptabilite",
  "/stocks",
  "/ged",
  "/organisation",
  "/administration",
]);

const MODULE_HUB_LABELS = new Set([
  "Commercial",
  "Accueil",
  "RH",
  "Comptabilité",
  "Stocks",
  "GED",
  "Organisation",
  "Administration",
]);

function isModuleHub(c: PageBreadcrumb): boolean {
  if (MODULE_HUB_LABELS.has(c.label)) return true;
  if (c.href && MODULE_HUB_PATHS.has(normalizePath(c.href))) return true;
  return false;
}

/**
 * Fil d’Ariane utile uniquement :
 * - pas de hub module (Commercial, Accueil…)
 * - pas de crumb = titre de page
 * - pas de crumb dont l’href = bouton Retour
 */
export function filterPageBreadcrumbs(
  breadcrumbs: PageBreadcrumb[],
  opts: { title: string; backHref?: string },
): PageBreadcrumb[] {
  const backPath = opts.backHref ? normalizePath(opts.backHref) : null;

  return breadcrumbs.filter((c) => {
    if (isModuleHub(c)) return false;
    if (c.label === opts.title && !c.href) return false;
    if (backPath && c.href && normalizePath(c.href) === backPath) return false;
    return true;
  });
}
