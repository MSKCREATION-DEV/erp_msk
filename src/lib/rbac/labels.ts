/** Libellés FR pour chips UI (évite codes bruts + doublons). */

const GROUP_LABELS: Record<string, string> = {
  direction: "Direction",
  commerciaux: "Commerciaux",
  rh: "RH",
  comptabilite: "Comptabilité",
  stock: "Stock",
  projets: "Projets",
  collaborateur: "Collaborateur",
};

const PACK_LABELS: Record<string, string> = {
  collaborateur: "Collaborateur",
  commercial: "Commercial",
  admin_crm: "Admin CRM",
  admin_rh: "Admin RH",
  comptable: "Comptable",
  projets: "Projets",
  stock: "Stock",
  direction: "Direction",
  admin_plateforme: "Admin plateforme",
};

export function groupLabel(code: string): string {
  return GROUP_LABELS[code] ?? code;
}

export function packLabel(code: string): string {
  return PACK_LABELS[code] ?? code;
}

/**
 * Chips Accueil — couche claire :
 * 1) Super Admin
 * 2) Groupes (appartenance)
 * 3) Packs directs seulement (pas les packs déjà hérités du groupe)
 */
export function roleChips(input: {
  isSuperAdmin: boolean;
  groupCodes: string[];
  packCodes: string[];
  directPackCodes?: string[];
  groupPackCodes?: string[];
}): { label: string; tone: "blue" | "ink" | "muted" }[] {
  const chips: { label: string; tone: "blue" | "ink" | "muted" }[] = [];
  const seen = new Set<string>();
  const push = (key: string, label: string, tone: "blue" | "ink" | "muted") => {
    const k = key.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    chips.push({ label, tone });
  };

  if (input.isSuperAdmin) push("super_admin", "Super Admin", "blue");

  for (const code of input.groupCodes) {
    push(`g:${code}`, groupLabel(code), "ink");
  }

  const direct = input.directPackCodes ?? input.packCodes;
  const inherited = new Set(input.groupPackCodes ?? []);
  for (const code of direct) {
    // Ne pas re-afficher un pack déjà apporté par le groupe
    if (inherited.has(code)) continue;
    push(`p:${code}`, `Pack ${packLabel(code)}`, "muted");
  }

  return chips;
}
