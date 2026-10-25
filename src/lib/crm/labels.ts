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

/**
 * Libellés statut — distincts et compréhensibles (LOT-I) :
 * - En discussion = échange en cours (ex-QUALIFICATION)
 * - Devis envoyé = proposition commerciale déjà transmise
 */
export const STAGE_LABELS: Record<CrmPipelineStage, string> = {
  NOUVEAU: "À contacter",
  CONTACTE: "Contacté",
  QUALIFICATION: "En discussion",
  INTERESSE: "Intéressé",
  DEVIS_ENVOYE: "Devis envoyé",
  /** Masqué en UI — traité comme Devis envoyé (métier MSK). */
  NEGOCIATION: "Devis envoyé",
  GAGNE: "Client",
  PERDU: "Perdu",
};

/** Aide courte (picker statut + fiche) — LOT-I. */
export const STAGE_HINTS: Partial<Record<CrmPipelineStage, string>> = {
  NOUVEAU: "Pas encore contacté — à appeler ou écrire.",
  CONTACTE: "Premier contact fait — journaliser la suite.",
  QUALIFICATION:
    "Échange en cours : besoin / budget / timing à clarifier. Pas encore prêt pour un devis.",
  INTERESSE: "Intérêt confirmé — prêt pour proposition / client commercial.",
  DEVIS_ENVOYE: "Proposition déjà envoyée — suivi de réponse.",
  GAGNE: "Devenu client MSK.",
  PERDU: "Prospect clos sans signature.",
};

/** Ordre UI métier (7 statuts LISTES — sans Négociation). */
export const STAGE_ORDER: CrmPipelineStage[] = [
  "NOUVEAU",
  "CONTACTE",
  "QUALIFICATION",
  "INTERESSE",
  "DEVIS_ENVOYE",
  "GAGNE",
  "PERDU",
];

/**
 * Couleurs distinctes par statut (1 teinte = 1 stage — pas de bleus quasi-identiques).
 * Aligné charte MSK + accents data-viz lisibles.
 */
export const STAGE_COLORS: Record<CrmPipelineStage, string> = {
  NOUVEAU: "#00ACEE",
  CONTACTE: "#1D73BC",
  QUALIFICATION: "#2A3D8E",
  INTERESSE: "#0F766E",
  DEVIS_ENVOYE: "#C27803",
  NEGOCIATION: "#C27803",
  GAGNE: "#0D1330",
  PERDU: "#FF5A3C",
};

/** Prospects encore ouverts (hors Client / Perdu). */
export const OPEN_PIPELINE_STAGES: CrmPipelineStage[] = [
  "NOUVEAU",
  "CONTACTE",
  "QUALIFICATION",
  "INTERESSE",
  "DEVIS_ENVOYE",
  "NEGOCIATION",
];

/** Stages BDD à passer dans `?stages=` pour un filtre UI (NEGOCIATION ↔ Devis envoyé). */
export function stagesForFilter(stage: CrmPipelineStage): CrmPipelineStage[] {
  if (stage === "DEVIS_ENVOYE" || stage === "NEGOCIATION") {
    return ["DEVIS_ENVOYE", "NEGOCIATION"];
  }
  return [stage];
}

/** URL listing prospects filtrée par statut(s). */
export function prospectsStagesHref(stages: CrmPipelineStage[]): string {
  const unique = [...new Set(stages)];
  return `/crm/prospects?stages=${unique.join(",")}`;
}

/** Tous les stages BDD (incl. legacy Négociation) — affichage / mapping uniquement. */
export const STAGE_ORDER_ALL: CrmPipelineStage[] = [
  ...STAGE_ORDER.slice(0, 5),
  "NEGOCIATION",
  ...STAGE_ORDER.slice(5),
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
  if (
    s.includes("DISCUSSION") ||
    s.includes("EN COURS") ||
    s.includes("QUALIF")
  ) {
    return "QUALIFICATION";
  }
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
  // ChatGPT / IA → AUTRE (enum sans CHATGPT pour l’instant ; notes import)
  if (s.includes("chatgpt") || s.includes("openai") || s.includes("gpt")) {
    return "AUTRE";
  }
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
