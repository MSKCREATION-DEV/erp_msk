import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bandeau de contexte quand une page réagit à un filtre collab (`?owner=` / `?collab=`).
 * Fermeture = croix seule (pas de libellé « Toute l’équipe » / « Vue d’ensemble »).
 */
export function ScopeFocusBanner({
  label,
  clearHref,
  clearAriaLabel = "Fermer le focus collaborateur",
  className,
  children,
}: {
  label: string;
  clearHref: string;
  /** Accessible name for the icon-only clear control. */
  clearAriaLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-msk-blue/20 bg-msk-blue/[0.04] px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-blue/70">
          Focus collaborateur
        </p>
        <p className="truncate text-sm font-semibold text-msk-ink">{label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Link
          prefetch={false}
          href={clearHref}
          aria-label={clearAriaLabel}
          title={clearAriaLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/12 bg-white text-msk-ink/70 transition hover:bg-msk-chalk hover:text-msk-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
