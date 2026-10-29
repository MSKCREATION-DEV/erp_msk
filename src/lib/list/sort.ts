/**
 * Tri URL pour listes / tableaux ERP (`?sort=` + `?dir=`).
 * Serveur : `parseListSort` → `orderBy` Prisma.
 * UI : `SortableTh` + `buildSortHref`.
 */

export type SortDir = "asc" | "desc";

export const SORT_PARAM = "sort";
export const DIR_PARAM = "dir";

export type SortColumnMap<TKey extends string> = Record<
  TKey,
  /** Fragment Prisma `orderBy` (objet ou tableau). */
  (dir: SortDir) => unknown
>;

export type ParsedListSort<TKey extends string> = {
  key: TKey;
  dir: SortDir;
  orderBy: unknown;
};

export function parseSortDir(
  raw: string | undefined,
  fallback: SortDir = "asc",
): SortDir {
  if (raw === "asc" || raw === "desc") return raw;
  return fallback;
}

export function parseSortKey<TKey extends string>(
  raw: string | undefined,
  allowed: readonly TKey[],
  fallback: TKey,
): TKey {
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as TKey;
  }
  return fallback;
}

/**
 * Lit `sort` / `dir` depuis les searchParams et résout le `orderBy` Prisma.
 * `paramKeys` permet une 2ᵉ table sur la même page (ex. `hsort` / `hdir`).
 */
export function parseListSort<TKey extends string>(
  sp: Record<string, string | undefined>,
  columns: SortColumnMap<TKey>,
  defaults: { key: TKey; dir: SortDir },
  paramKeys?: { sortKey?: string; dirKey?: string },
): ParsedListSort<TKey> {
  const sortKey = paramKeys?.sortKey ?? SORT_PARAM;
  const dirKey = paramKeys?.dirKey ?? DIR_PARAM;
  const keys = Object.keys(columns) as TKey[];
  const key = parseSortKey(sp[sortKey], keys, defaults.key);
  const defaultDirForKey = key === defaults.key ? defaults.dir : "asc";
  const dir = parseSortDir(sp[dirKey], defaultDirForKey);
  return {
    key,
    dir,
    orderBy: columns[key](dir),
  };
}

/** Recopie `sort`/`dir` (ou clés custom) dans un URLSearchParams cible. */
export function appendSortParams(
  target: URLSearchParams,
  source: Record<string, string | undefined> | URLSearchParams,
  paramKeys?: { sortKey?: string; dirKey?: string },
) {
  const sortKey = paramKeys?.sortKey ?? SORT_PARAM;
  const dirKey = paramKeys?.dirKey ?? DIR_PARAM;
  const get = (k: string) =>
    source instanceof URLSearchParams ? source.get(k) : source[k];
  const sort = get(sortKey)?.trim();
  const dir = get(dirKey)?.trim();
  if (sort) target.set(sortKey, sort);
  if (dir === "asc" || dir === "desc") target.set(dirKey, dir);
}

/**
 * Href au clic sur une colonne :
 * - même colonne → inverse `dir`
 * - autre colonne → `defaultDir` (asc texte, desc dates)
 * - reset `page`
 */
export function buildSortHref(opts: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  column: string;
  currentSort: string;
  currentDir: SortDir;
  /** Dir initiale si on change de colonne (défaut `asc`). */
  defaultDir?: SortDir;
  sortKey?: string;
  dirKey?: string;
  pageKey?: string;
}): string {
  const sortKey = opts.sortKey ?? SORT_PARAM;
  const dirKey = opts.dirKey ?? DIR_PARAM;
  const pageKey = opts.pageKey ?? "page";
  const nextDir: SortDir =
    opts.column === opts.currentSort
      ? opts.currentDir === "asc"
        ? "desc"
        : "asc"
      : (opts.defaultDir ?? "asc");

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.searchParams)) {
    if (v == null || v === "") continue;
    if (k === pageKey || k === sortKey || k === dirKey) continue;
    params.set(k, v);
  }
  params.set(sortKey, opts.column);
  params.set(dirKey, nextDir);
  const qs = params.toString();
  return qs ? `${opts.pathname}?${qs}` : opts.pathname;
}

/** Libellé accessible pour l’état de tri courant. */
export function sortAriaLabel(
  label: string,
  active: boolean,
  dir: SortDir,
): string {
  if (!active) return `Trier par ${label}`;
  return dir === "asc"
    ? `${label} — tri croissant. Cliquer pour décroissant`
    : `${label} — tri décroissant. Cliquer pour croissant`;
}
