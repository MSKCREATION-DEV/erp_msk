import type {
  BrandColorCategory,
  BrandItemStatus,
  BrandLogoKind,
  BrandResourceKind,
  BrandTypographyRole,
} from "@/generated/prisma/client";

export const BRAND_LOGO_KIND_LABELS: Record<BrandLogoKind, string> = {
  PRINCIPAL: "Principal",
  HORIZONTAL: "Horizontal",
  VERTICAL: "Vertical",
  COMPACT: "Compact",
  SYMBOLE: "Symbole",
  BLANC: "Blanc",
  MONO: "Monochrome",
  DOCUMENTS: "Documents / PDF",
  FAVICON: "Favicon",
  AUTRE: "Autre",
};

export const BRAND_STATUS_LABELS: Record<BrandItemStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  ARCHIVED: "Archivé",
};

export const BRAND_COLOR_CATEGORY_LABELS: Record<BrandColorCategory, string> = {
  MARQUE: "Marque",
  INTERFACE: "Interface",
  FONCTIONNELLE: "Fonctionnelle",
  DOCUMENTAIRE: "Documentaire",
};

export const BRAND_TYPO_ROLE_LABELS: Record<BrandTypographyRole, string> = {
  HEADING: "Titres",
  BODY: "Corps",
  UI: "Interface",
  PDF: "PDF",
  ACCENT: "Accent",
  IMPACT: "Impact",
};

export const BRAND_RESOURCE_KIND_LABELS: Record<BrandResourceKind, string> = {
  ICONE: "Icône",
  PICTO: "Picto",
  ILLUSTRATION: "Illustration",
  MOTIF: "Motif",
  FOND: "Fond",
  SIGNATURE_GRAPH: "Signature graphique",
  AUTRE: "Autre",
};

export function brandStatusTone(
  status: BrandItemStatus,
): "blue" | "muted" | "coral" | "ink" {
  if (status === "ACTIVE") return "blue";
  if (status === "ARCHIVED") return "coral";
  return "muted";
}
