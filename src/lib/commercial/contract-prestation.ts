import type {
  CatalogPillar,
  ComContractFamily,
  ComServiceKind,
} from "@/generated/prisma/client";
import { SERVICE_KIND_DEFAULT_FAMILY } from "@/lib/commercial/labels";

export type ContractPrestationCatalogLine = {
  label: string;
  /** Ligne complémentaire (déplacement, etc.) — pondération réduite. */
  isTravel?: boolean;
  catalogOffer?: {
    sku: string;
    name: string;
    pillar: CatalogPillar;
  } | null;
};

export type ContractPrestationInput = {
  family: ComContractFamily | null;
  serviceKind: ComServiceKind | null;
  scopeJson: unknown;
  lines: ContractPrestationCatalogLine[];
};

const RS_LABEL =
  /r[eé]seau|social|tiktok|instagram|facebook|linkedin|\bRS\b/i;
const CHARTE_LABEL = /charte|logo|identit[eé]\s*visuelle/i;
const WEB_APP_LABEL = /e-?commerce|application|web\s*app|plateforme/i;
const VITRINE_LABEL = /site\s*internet|vitrine|pr[eé]sence\s*web/i;

function inferFromCatalogOffer(offer: {
  sku: string;
  name: string;
  pillar: CatalogPillar;
}): ComServiceKind | null {
  const sku = offer.sku.toUpperCase();
  if (sku.includes("-RS-") || sku.startsWith("CNT-RS")) return "RESEAUX_SOCIAUX";
  if (sku.startsWith("IMG-")) return "CHARTE_GRAPHIQUE";
  if (sku.startsWith("WEB-ECOM") || sku.includes("ECOM")) return "APPLICATION_WEB";
  if (sku.startsWith("WEB-")) return "SITE_VITRINE";

  switch (offer.pillar) {
    case "IMAGE_MARQUE":
      return "CHARTE_GRAPHIQUE";
    case "PRESENCE_DIGITALE":
      return WEB_APP_LABEL.test(offer.name) ? "APPLICATION_WEB" : "SITE_VITRINE";
    case "CONTENU_COMMUNICATION":
      if (RS_LABEL.test(offer.name) || sku.includes("RS")) {
        return "RESEAUX_SOCIAUX";
      }
      return null;
    default:
      return null;
  }
}

function inferFromLabel(label: string): ComServiceKind | null {
  if (RS_LABEL.test(label)) return "RESEAUX_SOCIAUX";
  if (CHARTE_LABEL.test(label)) return "CHARTE_GRAPHIQUE";
  if (WEB_APP_LABEL.test(label)) return "APPLICATION_WEB";
  if (VITRINE_LABEL.test(label)) return "SITE_VITRINE";
  return null;
}

/**
 * Déduit la nature de prestation depuis les lignes (catalogue + libellés).
 * Retourne `null` uniquement si aucune ligne exploitable.
 */
export function inferServiceKindFromLines(
  lines: ContractPrestationCatalogLine[],
): ComServiceKind | null {
  const kinds = new Set<ComServiceKind>();

  for (const line of lines) {
    if (line.isTravel) continue;
    const fromOffer = line.catalogOffer
      ? inferFromCatalogOffer(line.catalogOffer)
      : null;
    const fromLabel = inferFromLabel(line.label);
    const kind = fromOffer ?? fromLabel;
    if (kind) kinds.add(kind);
  }

  if (kinds.size === 0) {
    for (const line of lines) {
      const fromOffer = line.catalogOffer
        ? inferFromCatalogOffer(line.catalogOffer)
        : null;
      const fromLabel = inferFromLabel(line.label);
      const kind = fromOffer ?? fromLabel;
      if (kind) kinds.add(kind);
    }
  }

  if (kinds.size === 0) return null;
  if (kinds.size === 1) return [...kinds][0]!;
  return "BUNDLE";
}

function readScopeServiceKind(scopeJson: unknown): ComServiceKind | null {
  if (!scopeJson || typeof scopeJson !== "object") return null;
  const raw = (scopeJson as Record<string, unknown>).serviceKind;
  if (typeof raw !== "string") return null;
  const values = new Set<string>([
    "RESEAUX_SOCIAUX",
    "APPLICATION_WEB",
    "SITE_VITRINE",
    "CHARTE_GRAPHIQUE",
    "AUTRE",
    "BUNDLE",
  ]);
  return values.has(raw) ? (raw as ComServiceKind) : null;
}

/**
 * Résout famille + nature pour génération PDF (contrats legacy ou créés
 * depuis devis sans champs P4).
 */
export function resolveContractPrestation(
  input: ContractPrestationInput,
): { family: ComContractFamily; serviceKind: ComServiceKind } {
  const fromScope = readScopeServiceKind(input.scopeJson);
  const inferred =
    input.serviceKind ??
    fromScope ??
    inferServiceKindFromLines(input.lines) ??
    "RESEAUX_SOCIAUX";

  const serviceKind = input.serviceKind ?? inferred;
  const family =
    input.family ?? SERVICE_KIND_DEFAULT_FAMILY[serviceKind] ?? "PRESTATION_ABONNEMENT";

  return { family, serviceKind };
}
