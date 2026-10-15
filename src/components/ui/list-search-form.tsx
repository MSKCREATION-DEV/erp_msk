"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import {
  buildListSearchHref,
  isSameListHref,
} from "@/lib/list/search-href";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 400;

/**
 * Barre de recherche listes — frappe locale + debounce → URL `q`.
 * L’input reste monté ; les résultats se rechargent via Suspense page
 * (ne pas await searchParams dans le shell parent).
 */
export function ListSearchForm({
  placeholder = "Rechercher…",
  paramKey = "q",
  className,
  autoFocus = false,
}: {
  placeholder?: string;
  /** Nom du searchParam (défaut `q`). */
  paramKey?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(paramKey) ?? "";

  const [value, setValue] = useState(urlValue);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushed = useRef(urlValue);

  // Sync si navigation arrière / filtre externe (pas si on vient de pousser)
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  const commit = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const href = buildListSearchHref({
        pathname,
        currentSearch: searchParams,
        q: trimmed,
        paramKey,
      });
      if (isSameListHref(pathname, searchParams, href)) {
        lastPushed.current = trimmed;
        return;
      }

      lastPushed.current = trimmed;
      start(() => {
        router.replace(href, { scroll: false });
      });
    },
    [paramKey, pathname, router, searchParams],
  );

  // Debounce → URL
  useEffect(() => {
    if (value.trim() === urlValue.trim()) return;
    const t = window.setTimeout(() => commit(value), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value, urlValue, commit]);

  function clear() {
    setValue("");
    lastPushed.current = "";
    commit("");
    inputRef.current?.focus();
  }

  const showClear = value.length > 0;
  const busy = pending || value.trim() !== urlValue.trim();

  return (
    <div
      className={cn("group relative min-w-0 w-full sm:max-w-sm", className)}
      role="search"
    >
      <label htmlFor={`list-search-${paramKey}`} className="sr-only">
        {placeholder}
      </label>
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border bg-white pl-3 pr-2 shadow-sm transition",
          "border-msk-ink/12 hover:border-msk-ink/20",
          "focus-within:border-msk-blue/50 focus-within:shadow-md focus-within:shadow-msk-blue/10 focus-within:ring-2 focus-within:ring-msk-blue/20",
          busy && "border-msk-blue/30",
        )}
      >
        {busy ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-msk-blue"
            aria-hidden
          />
        ) : (
          <Search
            className="h-4 w-4 shrink-0 text-msk-ink/35 transition group-focus-within:text-msk-blue"
            aria-hidden
          />
        )}
        <input
          ref={inputRef}
          id={`list-search-${paramKey}`}
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              clear();
            }
            if (e.key === "Enter") {
              e.preventDefault();
              commit(value);
            }
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent py-2 text-sm text-msk-ink outline-none",
            "placeholder:text-msk-ink/35",
            "[&::-webkit-search-cancel-button]:hidden",
          )}
          aria-busy={busy || undefined}
        />
        {showClear ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-msk-ink/40 transition hover:bg-msk-chalk hover:text-msk-ink"
            aria-label="Effacer la recherche"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
