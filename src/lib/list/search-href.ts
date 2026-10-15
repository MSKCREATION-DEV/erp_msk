/**
 * Construction d’URL pour la barre de recherche listes (`?q=`).
 * Pure / testable — utilisée par `ListSearchForm`.
 */

export type BuildListSearchHrefOpts = {
  pathname: string;
  /** Search string actuelle (sans `?`), ou URLSearchParams / Record. */
  currentSearch:
    | string
    | URLSearchParams
    | Record<string, string | undefined>;
  /** Valeur saisie (sera trimée). */
  q: string;
  paramKey?: string;
  /** Clé pagination à retirer (défaut `page`). */
  pageKey?: string;
};

function toParams(
  current: BuildListSearchHrefOpts["currentSearch"],
): URLSearchParams {
  if (typeof current === "string") {
    return new URLSearchParams(
      current.startsWith("?") ? current.slice(1) : current,
    );
  }
  if (current instanceof URLSearchParams) {
    return new URLSearchParams(current.toString());
  }
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v != null && v !== "") p.set(k, v);
  }
  return p;
}

/**
 * Construit le href après mutation de `q`.
 * - trim de la requête
 * - reset pagination
 * - conserve tous les autres params (CRM période / owner / stages…)
 */
export function buildListSearchHref(opts: BuildListSearchHrefOpts): string {
  const paramKey = opts.paramKey ?? "q";
  const pageKey = opts.pageKey ?? "page";
  const params = toParams(opts.currentSearch);
  params.delete(pageKey);
  const trimmed = opts.q.trim();
  if (trimmed) params.set(paramKey, trimmed);
  else params.delete(paramKey);
  const qs = params.toString();
  return qs ? `${opts.pathname}?${qs}` : opts.pathname;
}

/** True si le href cible est déjà l’URL courante (évite replace no-op). */
export function isSameListHref(
  pathname: string,
  currentSearch: string | URLSearchParams,
  nextHref: string,
): boolean {
  const currQs =
    typeof currentSearch === "string"
      ? currentSearch.startsWith("?")
        ? currentSearch.slice(1)
        : currentSearch
      : currentSearch.toString();
  const current = currQs ? `${pathname}?${currQs}` : pathname;
  return normalizeHref(current) === normalizeHref(nextHref);
}

function normalizeHref(href: string): string {
  const qIndex = href.indexOf("?");
  if (qIndex < 0) return href;
  const path = href.slice(0, qIndex);
  const params = new URLSearchParams(href.slice(qIndex + 1));
  params.sort();
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
