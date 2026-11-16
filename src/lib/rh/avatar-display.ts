/** GED signée prioritaire, sinon chemin public (organigramme seed). */
export function coalescePhotoSrc(
  gedSignedUrl: string | null | undefined,
  staticPath: string | null | undefined,
): string | null {
  if (gedSignedUrl) return gedSignedUrl;
  if (staticPath) return staticPath;
  return null;
}
