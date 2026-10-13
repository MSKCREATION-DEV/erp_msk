/** Taille de page par défaut pour les listes ERP (absolu). */
export const DEFAULT_PAGE_SIZE = 20;

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 10_000);
}

export function parsePageSize(
  raw: string | undefined,
  fallback = DEFAULT_PAGE_SIZE,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 5) return fallback;
  return Math.min(Math.floor(n), 100);
}

export function pageSkip(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Clamp page si hors bornes après un count. */
export function clampPage(page: number, total: number, pageSize: number): number {
  const max = totalPages(total, pageSize);
  return Math.min(Math.max(1, page), max);
}
