import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Conteneur de scroll horizontal **local** pour tableaux larges.
 * Empêche le débordement de page tout en gardant les colonnes lisibles.
 * Ne pas utiliser pour masquer un layout cassé hors table.
 */
export function ListTableScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-x-auto overscroll-x-contain scrollbar-thin",
        className,
      )}
      data-list-table-scroll
    >
      {children}
    </div>
  );
}
