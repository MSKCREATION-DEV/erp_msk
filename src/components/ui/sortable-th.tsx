import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  buildSortHref,
  sortAriaLabel,
  type SortDir,
} from "@/lib/list/sort";
import { cn } from "@/lib/utils";

type SortableThProps = {
  label: string;
  column: string;
  sort: string;
  dir: SortDir;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  /** Dir initiale si on change de colonne (`desc` pour dates / montants). */
  defaultDir?: SortDir;
  className?: string;
  /** Alignement contenu (ex. chiffres). */
  align?: "left" | "center" | "right";
};

/**
 * En-tête de colonne triable — URL `?sort=` + `?dir=` (Server Components).
 * Colonnes non triables : garder un `<th>` plain.
 */
export function SortableTh({
  label,
  column,
  sort,
  dir,
  pathname,
  searchParams,
  defaultDir = "asc",
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
  });

  const Icon = !active
    ? ArrowUpDown
    : dir === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "px-4 py-3 font-semibold",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      <Link
        prefetch={false}
        href={href}
        aria-label={sortAriaLabel(label, active, dir)}
        className={cn(
          "group inline-flex max-w-full items-center gap-1 rounded-md outline-none transition",
          "hover:text-msk-ink focus-visible:ring-2 focus-visible:ring-msk-blue/30",
          active ? "text-msk-ink" : "text-inherit",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
        )}
      >
        <span className="truncate">{label}</span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active
              ? "text-msk-blue"
              : "text-msk-ink/25 group-hover:text-msk-ink/45",
          )}
          aria-hidden
        />
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
        "px-4 py-3 font-semibold",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}
