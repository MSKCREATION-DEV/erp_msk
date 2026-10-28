"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { buildPageWindow } from "@/lib/list/page-window";
import { cn } from "@/lib/utils";

/**
 * Pagination pilotée par état client (sélection dans un formulaire, etc.).
 * Même rythme visuel que `ListPagination` (URL).
 */
export function ClientListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0 || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const tokens = buildPageWindow(page, totalPages);

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
          <PageBtn
            disabled={page <= 1}
            aria-label="Page précédente"
            className="gap-1 px-2.5"
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Précédent</span>
          </PageBtn>
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
              <PageBtn
                isActive={token === page}
                aria-label={`Page ${token}`}
                aria-current={token === page ? "page" : undefined}
                onClick={() => onPageChange(token)}
              >
                {token}
              </PageBtn>
            </li>
          ),
        )}

        <li>
          <PageBtn
            disabled={page >= totalPages}
            aria-label="Page suivante"
            className="gap-1 px-2.5"
            onClick={() => onPageChange(page + 1)}
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </PageBtn>
        </li>
      </ul>
    </nav>
  );
}

function PageBtn({
  children,
  isActive,
  disabled,
  className,
  onClick,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: {
  children: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
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
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/30",
        isActive
          ? "bg-msk-blue text-white shadow-sm shadow-msk-blue/25"
          : "border border-transparent text-msk-ink/65 hover:border-msk-ink/10 hover:bg-msk-chalk hover:text-msk-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
