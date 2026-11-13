import { signedGedUrl } from "@/lib/ged/storage";

/** URL d’aperçu logo : Storage signé ou chemin public. */
export async function brandLogoPreviewUrl(logo: {
  storageOptimized: string | null;
  storageOriginal: string | null;
  publicPath: string | null;
}): Promise<string | null> {
  const storage = logo.storageOptimized ?? logo.storageOriginal;
  if (storage) {
    try {
      return await signedGedUrl(storage, 3600);
    } catch {
      /* fallthrough */
    }
  }
  return logo.publicPath;
}

export async function brandResourcePreviewUrl(res: {
  storagePath: string | null;
  publicPath: string | null;
}): Promise<string | null> {
  if (res.storagePath) {
    try {
      return await signedGedUrl(res.storagePath, 3600);
    } catch {
      /* fallthrough */
    }
  }
  return res.publicPath;
}
