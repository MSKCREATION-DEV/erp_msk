/** Limites & MIME — uploads Charte (hors GED documents métier). */

export const MAX_BRAND_LOGO_BYTES = 8 * 1024 * 1024;
export const MAX_BRAND_FONT_BYTES = 4 * 1024 * 1024;
export const MAX_BRAND_RESOURCE_BYTES = 12 * 1024 * 1024;

export const BRAND_LOGO_MIME = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const BRAND_FONT_MIME = [
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-otf",
  "application/octet-stream",
] as const;

export const BRAND_RESOURCE_MIME = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const BRAND_STORAGE_PREFIX = "brand";

export const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8}|[0-9A-Fa-f]{3})$/;

/** Tokens CSS Tailwind `@theme` synchronisables depuis BrandColor.tokenKey. */
export const CSS_SYNC_TOKEN_KEYS = [
  "msk-blue",
  "msk-ink",
  "msk-coral",
  "msk-chalk",
  "msk-paper",
  "msk-muted",
] as const;

export type CssSyncTokenKey = (typeof CSS_SYNC_TOKEN_KEYS)[number];
