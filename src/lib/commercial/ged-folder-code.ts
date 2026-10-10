import { folderCodeFromName } from "@/lib/ged/tree";

/** Code dossier GED unique par client (slug + suffixe id). */
export function buildClientGedFolderCode(
  name: string,
  clientId: string,
): string {
  const base = folderCodeFromName(name).slice(0, 40);
  const suffix = clientId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `${base}_${suffix || "X"}`;
}
