export const GED_BUCKET = "ged";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 Mo

export const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

export const SIGNATURE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

/** Racines année — priorisées COM/CPT (plan Phase 1). */
export const YEAR_ROOT_FOLDERS = [
  { code: "01_COMPTABILITE_ANNUELLE", name: "Comptabilité annuelle" },
  { code: "02_COMPTABILITE_MENSUELLE", name: "Comptabilité mensuelle" },
  { code: "03_CLIENTS", name: "Clients" },
  { code: "04_MODELES", name: "Modèles" },
  { code: "05_COLLABORATEURS", name: "Collaborateurs" },
  { code: "07_STOCKS_ACHATS", name: "Stocks & achats" },
] as const;

export const MODELES_CHILDREN = [
  { code: "Devis", name: "Devis" },
  { code: "Factures", name: "Factures" },
  { code: "Contrats", name: "Contrats" },
  { code: "RH", name: "RH" },
] as const;

export const COMPTA_MENSUELLE_CHILDREN = [
  { code: "01_FACTURES_ET_RECUS", name: "Factures et reçus" },
] as const;

export const COLLAB_SUBFOLDERS = [
  { code: "01_IDENTITE_ADMIN", name: "Identité / admin" },
  { code: "02_CONTRATS", name: "Contrats" },
  { code: "03_PAIE", name: "Paie" },
  { code: "04_CONGES_ABSENCES", name: "Congés / absences" },
  { code: "05_DIPLOMES_ATTESTATIONS", name: "Diplômes / attestations" },
  { code: "06_REGLEMENT_INTERIEUR", name: "Règlement intérieur" },
  { code: "07_PHOTOS", name: "Photos" },
  { code: "09_SORTIE", name: "Sortie / offboarding" },
  { code: "99_AUTRES", name: "Autres" },
] as const;

export function collabFolderSlug(lastName: string, firstName: string) {
  return `${lastName}_${firstName}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
}
