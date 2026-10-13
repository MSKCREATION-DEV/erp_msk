/** Fenêtre de pages avec ellipses (style shadcn Pagination). */
export type PageToken = number | "ellipsis";

/**
 * Ex. page 5 / 12 → [1, "ellipsis", 4, 5, 6, "ellipsis", 12]
 */
export function buildPageWindow(
  page: number,
  totalPages: number,
  siblingCount = 1,
): PageToken[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const current = Math.min(Math.max(1, page), totalPages);
  const left = Math.max(2, current - siblingCount);
  const right = Math.min(totalPages - 1, current + siblingCount);

  const tokens: PageToken[] = [1];

  if (left > 2) tokens.push("ellipsis");

  for (let i = left; i <= right; i++) {
    tokens.push(i);
  }

  if (right < totalPages - 1) tokens.push("ellipsis");

  tokens.push(totalPages);
  return tokens;
}
