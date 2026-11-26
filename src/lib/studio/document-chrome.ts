/**
 * Chrome document (en-tête / pied / alignements / logo Charte).
 * Persisté dans `DocumentTemplate.structureJson.chrome` — pas de migration.
 * Source de vérité logos = `BrandLogo` ACTIVE (Charte admin).
 */
import { z } from "zod";
import { company } from "@/lib/company";

export const AlignSchema = z.enum(["left", "center", "right"]);
export type DocAlign = z.infer<typeof AlignSchema>;

export const DocumentChromeSchema = z.object({
  showHeader: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  showLogo: z.boolean().default(true),
  showTagline: z.boolean().default(true),
  showBrandLabel: z.boolean().default(true),
  logoAlign: AlignSchema.default("left"),
  titleAlign: AlignSchema.default("center"),
  footerAlign: AlignSchema.default("center"),
  /** BrandLogo.id ACTIVE — null/undefined = logo documents Charte par défaut. */
  logoId: z.string().min(1).nullable().optional(),
  brandLabel: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(220).optional(),
  /** Titre d’en-tête par défaut (Playground / blocks_only). */
  headerTitle: z.string().trim().max(200).optional(),
  /**
   * Lignes de pied (1–5). Vide / absent → coordonnées légales `company`.
   */
  footerLines: z.array(z.string().trim().max(220)).max(5).optional(),
});

export type DocumentChrome = z.infer<typeof DocumentChromeSchema>;

export type DocumentChromeInput = z.input<typeof DocumentChromeSchema>;

/** Defaults alignés sur le rendu historique hardcodé. */
export function defaultDocumentChrome(
  overrides?: Partial<DocumentChromeInput>,
): DocumentChrome {
  return DocumentChromeSchema.parse({
    showHeader: true,
    showFooter: true,
    showLogo: true,
    showTagline: true,
    showBrandLabel: true,
    logoAlign: "left",
    titleAlign: "center",
    footerAlign: "center",
    logoId: null,
    brandLabel: company.legalName,
    tagline: company.tagline,
    footerLines: defaultFooterLines(),
    ...overrides,
  });
}

export function defaultFooterLines(): string[] {
  return [
    `Adresse : ${company.addressOneLine}`,
    `NIF : ${company.fiscalId} · ${company.email} · ${company.phones}`,
    `PUBLIC — ${company.legalName}`,
  ];
}

/**
 * Extrait `chrome` depuis `structureJson` (legacy ou Studio).
 * Clés inconnues / invalides → defaults (jamais throw sur data legacy).
 */
export function parseDocumentChrome(structureJson: unknown): DocumentChrome {
  const root =
    structureJson && typeof structureJson === "object" && !Array.isArray(structureJson)
      ? (structureJson as Record<string, unknown>)
      : {};
  const raw = root.chrome;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultDocumentChrome();
  }
  const parsed = DocumentChromeSchema.safeParse(raw);
  if (!parsed.success) {
    return defaultDocumentChrome();
  }
  return mergeChromeDefaults(parsed.data);
}

function mergeChromeDefaults(chrome: DocumentChrome): DocumentChrome {
  return {
    ...chrome,
    brandLabel: chrome.brandLabel?.trim() || company.legalName,
    tagline: chrome.tagline?.trim() || company.tagline,
    footerLines:
      chrome.footerLines && chrome.footerLines.length > 0
        ? chrome.footerLines.filter((l) => l.trim().length > 0)
        : defaultFooterLines(),
  };
}

/** Fusionne chrome persisté + overrides Playground (session). */
export function mergeDocumentChrome(
  base: DocumentChrome,
  patch?: Partial<DocumentChromeInput> | null,
): DocumentChrome {
  if (!patch) return base;
  return mergeChromeDefaults(
    DocumentChromeSchema.parse({
      ...base,
      ...patch,
      footerLines:
        patch.footerLines !== undefined ? patch.footerLines : base.footerLines,
    }),
  );
}

/** Réécrit `structureJson` en préservant les autres clés (legacy slots…). */
export function withChromeInStructure(
  structureJson: unknown,
  chrome: DocumentChrome,
): Record<string, unknown> {
  const root =
    structureJson && typeof structureJson === "object" && !Array.isArray(structureJson)
      ? { ...(structureJson as Record<string, unknown>) }
      : {};
  root.chrome = chrome;
  return root;
}

export function resolveFooterLines(chrome: DocumentChrome): string[] {
  if (chrome.footerLines && chrome.footerLines.length > 0) {
    return chrome.footerLines;
  }
  return defaultFooterLines();
}
