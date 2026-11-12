import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  buildSortHref,
  sortAriaLabel,
  type SortDir,
} from "@/lib/list/sort";
import { cn } from "@/lib/utils";
import {
  LinkPendingBusy,
  SortIconSlot,
} from "@/components/ui/sort-pending-indicator";

type SortableThProps = {
  label: string;
  column: string;
  sort: string;
  dir: SortDir;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  /** Dir initiale si on change de colonne (`desc` pour dates / montants). */
  defaultDir?: SortDir;
  /** Clés URL custom (2ᵉ tableau sur la même page). */
  sortParam?: string;
  dirParam?: string;
  /** Clé page à réinitialiser au tri (ex. `hpage`). */
  pageParam?: string;
  className?: string;
  /** Alignement contenu (ex. chiffres). */
  align?: "left" | "center" | "right";
};

/**
 * En-tête de colonne triable — URL `?sort=` + `?dir=` (Server Components).
 * Link `scroll={false}` + `prefetch={false}` + indicateur `useLinkStatus`.
 */
export function SortableTh({
  label,
  column,
  sort,
  dir,
  pathname,
  searchParams,
  defaultDir = "asc",
  sortParam,
  dirParam,
  pageParam,
  className,
  align = "left",
}: SortableThProps) {
  const active = sort === column;
  const href = buildSortHref({
    pathname,
    searchParams,
    column,
    currentSort: sort,
    currentDir: dir,
    defaultDir,
    sortKey: sortParam,
    dirKey: dirParam,
    pageKey: pageParam,
  });

  const Icon = !active
    ? ArrowUpDown
    : dir === "asc"
      ? ArrowUp
      : ArrowDown;

  const idleIcon = (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
        active
          ? "border-msk-blue/30 bg-msk-blue/10 text-msk-blue"
          : "border-msk-ink/15 bg-white text-msk-ink/50 group-hover:border-msk-blue/25 group-hover:text-msk-blue",
      )}
      aria-hidden
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );

  return (
    <th
      scope="col"
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "px-3 py-3 font-semibold",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      <Link
        prefetch={false}
        scroll={false}
        href={href}
        title={sortAriaLabel(label, active, dir)}
        aria-label={sortAriaLabel(label, active, dir)}
        className={cn(
          "group inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 outline-none transition",
          "hover:bg-white/80 hover:text-msk-ink focus-visible:ring-2 focus-visible:ring-msk-blue/30",
          active ? "bg-white text-msk-ink shadow-sm" : "text-msk-ink/55",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
        )}
      >
        <LinkPendingBusy className="inline-flex max-w-full items-center gap-1.5">
          <span className="truncate tracking-wide uppercase">{label}</span>
          <SortIconSlot idle={idleIcon} />
        </LinkPendingBusy>
      </Link>
    </th>
  );
}

/** En-tête non triable (actions, cases à cocher…) — même rythme visuel. */
export function PlainTh({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-3 font-semibold tracking-wide text-msk-ink/40 uppercase",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}
