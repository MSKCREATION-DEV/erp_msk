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

export function roleChips(input: {
  isSuperAdmin: boolean;
  groupCodes: string[];
  packCodes: string[];
}): { label: string; tone: "blue" | "ink" | "muted" }[] {
  const seen = new Set<string>();
  const chips: { label: string; tone: "blue" | "ink" | "muted" }[] = [];

  const push = (key: string, label: string, tone: "blue" | "ink" | "muted") => {
    const k = key.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    chips.push({ label, tone });
  };

  if (input.isSuperAdmin) push("super_admin", "Super Admin", "blue");

  // Packs d’abord (plus parlant), puis groupes non déjà couverts
  for (const code of input.packCodes) {
    push(code, PACK_LABELS[code] ?? code, "muted");
  }
  for (const code of input.groupCodes) {
    push(code, GROUP_LABELS[code] ?? code, "ink");
  }

  return chips;
}
