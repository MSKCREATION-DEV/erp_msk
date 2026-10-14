/**
 * LOT-I P2-4 — secteurs métier MSK (liste + Autre).
 * Valeurs libres existantes restent affichables ; nouvelle saisie = liste.
 */

export const CRM_SECTOR_OTHER = "Autre";

/** Liste fixe affichée au create / edit. */
export const CRM_SECTOR_OPTIONS = [
  "Agroalimentaire",
  "BTP & Construction",
  "Commerce & Distribution",
  "Restauration & Hôtellerie",
  "Santé & Bien-être",
  "Éducation & Formation",
  "Finance & Assurance",
  "Tech & Digital",
  "Mode & Beauté",
  "Immobilier",
  "Transport & Logistique",
  "Administration & ONG",
  "Industrie",
  "Services aux entreprises",
  "Médias & Communication",
  CRM_SECTOR_OTHER,
] as const;

export type CrmSectorOption = (typeof CRM_SECTOR_OPTIONS)[number];

const PRESET_SET = new Set<string>(
  CRM_SECTOR_OPTIONS.filter((s) => s !== CRM_SECTOR_OTHER),
);

export function resolveSectorSelection(current: string | null | undefined): {
  preset: string | null;
  otherDetail: string;
} {
  const trimmed = (current ?? "").trim();
  if (!trimmed) return { preset: null, otherDetail: "" };
  if (PRESET_SET.has(trimmed)) {
    return { preset: trimmed, otherDetail: "" };
  }
  if (trimmed === CRM_SECTOR_OTHER) {
    return { preset: CRM_SECTOR_OTHER, otherDetail: "" };
  }
  return { preset: CRM_SECTOR_OTHER, otherDetail: trimmed };
}

/** Valeur stockée en BDD (`CrmOrganization.sector`). */
export function composeSectorValue(
  preset: string | null,
  otherDetail: string,
): string {
  if (!preset) return "";
  if (preset === CRM_SECTOR_OTHER) {
    const detail = otherDetail.trim();
    return detail || CRM_SECTOR_OTHER;
  }
  return preset;
}

export const SECTOR_PICKER_OPTIONS = CRM_SECTOR_OPTIONS.map((s) => ({
  value: s,
  label: s,
}));
