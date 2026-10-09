import type {
  CatalogPillar,
  CrmActivityType,
  CrmLossReason,
  CrmPipelineStage,
  CrmSource,
} from "@prisma/client";

export const PILLAR_LABELS: Record<CatalogPillar, string> = {
  IMAGE_MARQUE: "Image de marque",
  CONTENU_COMMUNICATION: "Contenu & Communication",
  PRESENCE_DIGITALE: "Présence Digitale",
  CROISSANCE_ACQUISITION: "Croissance & Acquisition",
  TRANSFORMATION_STRUCTURATION: "Transformation & Structuration",
};

export const STAGE_LABELS: Record<CrmPipelineStage, string> = {
  NOUVEAU: "À contacter",
  CONTACTE: "Contacté",
  QUALIFICATION: "En cours",
  INTERESSE: "Intéressé",
  DEVIS_ENVOYE: "Devis envoyé",
  NEGOCIATION: "Négociation",
  GAGNE: "Gagné",
  PERDU: "Perdu",
};

export const STAGE_ORDER: CrmPipelineStage[] = [
  "NOUVEAU",
  "CONTACTE",
  "QUALIFICATION",
  "INTERESSE",
  "DEVIS_ENVOYE",
  "NEGOCIATION",
  "GAGNE",
  "PERDU",
];

export const SOURCE_LABELS: Record<CrmSource, string> = {
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  WHATSAPP: "WhatsApp",
  TIKTOK: "TikTok",
  GOOGLE_MAPS: "Google Maps",
  GOOGLE: "Google",
  SNAPCHAT: "Snapchat",
  TERRAIN: "Terrain",
  RECOMMANDATION: "Recommandation",
  EMAIL: "Email",
  TELEPHONE: "Téléphone",
  AUTRE: "Autre",
};

export const ACTIVITY_LABELS: Record<CrmActivityType, string> = {
  APPEL: "Appel",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  EMAIL: "E-mail",
  RDV: "RDV",
  NOTE: "Note",
  AUTRE: "Autre",
};

export const LOSS_LABELS: Record<CrmLossReason, string> = {
  BUDGET: "Budget",
  CONCURRENT: "Concurrent",
  TIMING: "Timing",
  NO_SHOW: "No-show",
  AUTRE: "Autre",
};

/** Mapping libellés Excel → stage */
export function mapExcelStatus(raw: string): CrmPipelineStage {
  const s = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z+]/g, " ")
    .trim();
  if (s.includes("CLIENT") || s.includes("GAGNE")) return "GAGNE";
  if (s.includes("PERDU")) return "PERDU";
  if (s.includes("DEVIS")) return "DEVIS_ENVOYE";
  if (s.includes("INTERESS")) return "INTERESSE";
  if (s.includes("EN COURS") || s.includes("QUALIF")) return "QUALIFICATION";
  if (s.includes("CONTACT")) return "CONTACTE";
  if (s.includes("A CONTACTER") || s.includes("NOUVEAU")) return "NOUVEAU";
  return "NOUVEAU";
}

export function mapExcelSource(raw: string): CrmSource {
  const s = raw.toLowerCase();
  if (s.includes("instagram") || s === "ig") return "INSTAGRAM";
  if (s.includes("linkedin")) return "LINKEDIN";
  if (s.includes("whatsapp") || s === "wa") return "WHATSAPP";
  if (s.includes("tiktok")) return "TIKTOK";
  if (s.includes("maps")) return "GOOGLE_MAPS";
  if (s.includes("google")) return "GOOGLE";
  if (s.includes("snap")) return "SNAPCHAT";
  if (s.includes("terrain")) return "TERRAIN";
  if (s.includes("recommand")) return "RECOMMANDATION";
  if (s.includes("mail") || s.includes("e-mail")) return "EMAIL";
  if (s.includes("tel") || s.includes("phone")) return "TELEPHONE";
  return "AUTRE";
}

export function normalizeOrgName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatXof(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}
