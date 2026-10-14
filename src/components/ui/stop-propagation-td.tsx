"use client";

import type { ReactNode } from "react";

/** Cellule tableau dans une ligne navigable — bloque le clic vers la fiche. */
export function StopPropagationTd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={className}
      data-row-nav-ignore
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </td>
  );
}
