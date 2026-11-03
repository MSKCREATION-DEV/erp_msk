/** Champs profil demandables par le collaborateur (validation RH obligatoire). */

export type ProfileFieldMeta = {
  key: string;
  label: string;
  group: "civil" | "contact" | "address" | "emergency" | "bank";
  /** Justificatif fortement recommandé / requis. */
  evidence: "optional" | "recommended" | "required";
  sensitive?: boolean;
};

export const PROFILE_REQUESTABLE_FIELDS: ProfileFieldMeta[] = [
  { key: "firstName", label: "Prénom", group: "civil", evidence: "required" },
  { key: "lastName", label: "Nom", group: "civil", evidence: "required" },
  { key: "birthName", label: "Nom de naissance", group: "civil", evidence: "required" },
  { key: "birthDate", label: "Date de naissance", group: "civil", evidence: "required" },
  { key: "birthPlace", label: "Lieu de naissance", group: "civil", evidence: "recommended" },
  { key: "nationality", label: "Nationalité", group: "civil", evidence: "recommended" },
  { key: "gender", label: "Sexe", group: "civil", evidence: "optional" },
  { key: "idDocumentType", label: "Type de pièce d’identité", group: "civil", evidence: "required" },
  { key: "idDocumentNumber", label: "N° pièce d’identité", group: "civil", evidence: "required", sensitive: true },
  { key: "idIssuedOn", label: "Date de délivrance", group: "civil", evidence: "required" },
  { key: "idExpiresOn", label: "Date d’expiration", group: "civil", evidence: "required" },
  { key: "idIssuedBy", label: "Autorité de délivrance", group: "civil", evidence: "recommended" },
  { key: "personalPhone", label: "Téléphone personnel", group: "contact", evidence: "optional" },
  { key: "personalEmail", label: "E-mail personnel", group: "contact", evidence: "optional" },
  { key: "phone", label: "Téléphone (fiche RH)", group: "contact", evidence: "optional" },
  { key: "addressLine1", label: "Adresse", group: "address", evidence: "recommended" },
  { key: "addressLine2", label: "Complément d’adresse", group: "address", evidence: "optional" },
  { key: "city", label: "Ville", group: "address", evidence: "recommended" },
  { key: "region", label: "Région", group: "address", evidence: "optional" },
  { key: "postalCode", label: "Code postal", group: "address", evidence: "optional" },
  { key: "country", label: "Pays", group: "address", evidence: "optional" },
  { key: "emergencyContactName", label: "Contact d’urgence — nom", group: "emergency", evidence: "optional" },
  { key: "emergencyContactPhone", label: "Contact d’urgence — téléphone", group: "emergency", evidence: "optional" },
  { key: "emergencyContactRelation", label: "Contact d’urgence — lien", group: "emergency", evidence: "optional" },
  { key: "bankName", label: "Banque", group: "bank", evidence: "required", sensitive: true },
  { key: "bankAccountHolder", label: "Titulaire du compte", group: "bank", evidence: "required", sensitive: true },
  { key: "bankIban", label: "IBAN / RIB", group: "bank", evidence: "required", sensitive: true },
];

export const PROFILE_REQUESTABLE_KEYS = new Set(
  PROFILE_REQUESTABLE_FIELDS.map((f) => f.key),
);

export function maskSensitive(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}
