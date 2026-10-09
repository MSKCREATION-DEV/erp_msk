/** Préférences d’affichage GED (client) — inspiré Drive / SharePoint. */

export type GedViewMode = "list" | "compact" | "tiles";
export type GedSortKey = "name" | "date" | "size" | "type";
export type GedSortDir = "asc" | "desc";
export type GedGroupBy = "none" | "kind" | "type" | "date";

export const GED_VIEW_LABELS: Record<GedViewMode, string> = {
  list: "Liste",
  compact: "Liste compacte",
  tiles: "Vignettes",
};

export const GED_SORT_LABELS: Record<GedSortKey, string> = {
  name: "Nom",
  date: "Date",
  size: "Taille",
  type: "Type",
};

export const GED_GROUP_LABELS: Record<GedGroupBy, string> = {
  none: "Aucun",
  kind: "Dossiers / fichiers",
  type: "Type de fichier",
  date: "Date",
};

export function folderAccent(code: string): string {
  const n = Number.parseInt(code.slice(0, 2), 10);
  if (!Number.isFinite(n)) return "bg-msk-blue/10 text-msk-blue";
  const accents = [
    "bg-teal-500/15 text-teal-700",
    "bg-msk-blue/15 text-msk-blue",
    "bg-msk-coral/15 text-msk-coral",
    "bg-[#2A3D8E]/15 text-[#2A3D8E]",
    "bg-emerald-500/15 text-emerald-700",
    "bg-sky-500/15 text-sky-700",
  ];
  return accents[(n - 1) % accents.length] ?? accents[0]!;
}

export function mimeKind(mime: string): string {
  if (mime.startsWith("image/")) return "Image";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Word";
  if (mime.includes("sheet") || mime.includes("excel")) return "Excel";
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return "PowerPoint";
  if (mime.startsWith("text/")) return "Texte";
  return "Autre";
}

export function dateBucket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Inconnue";
  const label = d.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
