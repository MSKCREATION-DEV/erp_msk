import type { ReactNode } from "react";
import Link from "next/link";
import {
  buildSortHref,
  sortAriaLabel,
  type SortDir,
} from "@/lib/list/sort";
import { cn } from "@/lib/utils";
import { SortableThIcon } from "@/components/ui/sortable-th-icon";

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
  className?: string;
  /** Alignement contenu (ex. chiffres). */
  align?: "left" | "center" | "right";
};

/**
 * En-tête de colonne triable — URL `?sort=` + `?dir=` (Server Components).
 * Link + `useLinkStatus` (prefetch=false, scroll=false) pour feedback immédiat.
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
  });

  const mode = !active ? "idle" : dir === "asc" ? "asc" : "desc";

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
        <span className="truncate tracking-wide uppercase">{label}</span>
        <SortableThIcon mode={mode} />
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
