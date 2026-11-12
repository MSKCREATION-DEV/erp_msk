import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { buildPageWindow } from "@/lib/list/page-window";
import { cn } from "@/lib/utils";
import { SortPendingIndicator } from "@/components/ui/sort-pending-indicator";

/**
 * Pagination URL — composition inspirée shadcn Pagination
 * @see https://ui.shadcn.com/docs/components/base/pagination
 * Adaptée Next.js `Link` + charte MSK.
 * Conserve `sort`/`dir`/`q`/filtres via `searchParams` ; `scroll={false}`.
 */
export function ListPagination({
  pathname,
  searchParams,
  page,
  totalPages,
  total,
  pageSize,
  pageParam = "page",
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Clé URL (ex. `hpage` pour un 2ᵉ tableau sur la même page). */
  pageParam?: string;
}) {
  if (total === 0) return null;

  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v == null || v === "" || k === pageParam) continue;
      params.set(k, v);
    }
    if (p > 1) params.set(pageParam, String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const tokens = buildPageWindow(safePage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t border-msk-ink/6 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-msk-ink/45">
        <span className="font-medium tabular-nums text-msk-ink/65">
          {from}–{to}
        </span>{" "}
        sur{" "}
        <span className="font-medium tabular-nums text-msk-ink/65">{total}</span>
      </p>

      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <PaginationNavLink
            href={hrefFor(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Page précédente"
            className="gap-1 px-2.5"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Précédent</span>
          </PaginationNavLink>
        </li>

        {tokens.map((token, i) =>
          token === "ellipsis" ? (
            <li
              key={`e-${i}`}
              className="flex h-9 w-9 items-center justify-center text-msk-ink/35"
              aria-hidden
            >
              <MoreHorizontal className="h-4 w-4" />
            </li>
          ) : (
            <li key={token}>
              <PaginationNavLink
                href={hrefFor(token)}
                isActive={token === safePage}
                aria-label={`Page ${token}`}
                aria-current={token === safePage ? "page" : undefined}
              >
                {token}
              </PaginationNavLink>
            </li>
          ),
        )}

        <li>
          <PaginationNavLink
            href={hrefFor(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Page suivante"
            className="gap-1 px-2.5"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </PaginationNavLink>
        </li>
      </ul>
    </nav>
  );
}

function PaginationNavLink({
  href,
  children,
  isActive,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: {
  href: string;
  children: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
}) {
  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium text-msk-ink/25",
          className,
        )}
        aria-disabled
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      prefetch={false}
      scroll={false}
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/30",
        isActive
          ? "bg-msk-blue text-white shadow-sm shadow-msk-blue/25"
          : "border border-transparent text-msk-ink/65 hover:border-msk-ink/10 hover:bg-msk-chalk hover:text-msk-ink",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortPendingIndicator label="Chargement de la page" />
      </span>
    </Link>
  );
}
