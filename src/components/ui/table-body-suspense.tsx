import { Suspense, type ReactNode } from "react";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";

/**
 * Corps de tableau sous Suspense avec `key=listKey` pour rejouer le skeleton
 * quand seuls les searchParams changent (Next #49297).
 *
 * Garder en-têtes SortableTh / barre recherche / pagination **hors** de ce
 * Suspense quand possible — sinon au minimum la toolbar parent reste montée.
 */
export function TableBodySuspense({
  listKey,
  children,
  fallback,
  rows = 8,
  cols = 6,
}: {
  listKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  rows?: number;
  cols?: number;
}) {
  return (
    <Suspense
      key={listKey}
      fallback={
        fallback ?? (
          <ListTableSkeleton
            rows={rows}
            cols={cols}
            className="min-h-80"
            ariaBusy
          />
        )
      }
    >
      {children}
    </Suspense>
  );
}
