export function formatSize(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Libellé enfants directs (dossiers / fichiers), pas de deep count. */
export function childCountLabel(folders: number, files: number): string {
  const parts: string[] = [];
  if (folders > 0) {
    parts.push(`${folders} dossier${folders > 1 ? "s" : ""}`);
  }
  if (files > 0) {
    parts.push(`${files} fichier${files > 1 ? "s" : ""}`);
  }
  if (parts.length === 0) return "Vide";
  return parts.join(" · ");
}
