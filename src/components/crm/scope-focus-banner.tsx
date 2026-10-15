import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { CrmScopeLens } from "@/lib/crm/scope-period";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * Panneau unique « Focus collaborateur » — période, actions, clear, contenu.
 * Remplace le double bandeau (CrmScopeContext live + ancien header).
 */
export function ScopeFocusBanner({
  label,
  periodLabel,
  lens = "live",
  clearHref,
  clearAriaLabel = "Fermer le focus collaborateur",
  resetHref,
  resetLabel = "Revenir à aujourd’hui",
  actions,
  className,
  children,
}: {
  label: string;
  /** Période affichée sous le nom (anti-screenshot trompeur). */
  periodLabel?: string | null;
  lens?: CrmScopeLens;
  clearHref: string;
  clearAriaLabel?: string;
  /** Lien « Revenir à aujourd’hui » en vue historique. */
  resetHref?: string;
  resetLabel?: string;
  /** Boutons à droite (Prospects, Rapport…). */
  actions?: ReactNode;
  className?: string;
  /** Corps optionnel (KPI, strips…) sous l’en-tête. */
  children?: ReactNode;
}) {
  const isHistory = lens === "period";

  return (
    <Surface
      className={cn(
        "overflow-hidden p-0",
        isHistory
          ? "ring-1 ring-msk-coral/20"
          : "ring-1 ring-msk-blue/15",
        className,
      )}
      role="region"
      aria-label={`Focus collaborateur · ${label}`}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5",
          isHistory
            ? "border-msk-coral/15 bg-msk-coral/[0.05]"
            : "border-msk-blue/12 bg-msk-blue/[0.04]",
        )}
      >
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              isHistory ? "text-msk-coral/80" : "text-msk-blue",
            )}
          >
            Focus collaborateur
          </p>
          <p className="truncate text-base font-semibold tracking-tight text-msk-ink sm:text-lg">
            {label}
          </p>
          {periodLabel ? (
            <p className="text-xs leading-relaxed text-msk-ink/50">
              {isHistory ? (
                <>
                  <span className="font-medium text-msk-ink/65">
                    Vue historique
                  </span>
                  {" · "}
                  {periodLabel}
                  {" — portefeuille à date masqué"}
                </>
              ) : (
                <>Période · {periodLabel}</>
              )}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHistory && resetHref ? (
            <Link
              prefetch={false}
              href={resetHref}
              className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-msk-blue transition hover:bg-white/80 hover:underline"
            >
              {resetLabel}
            </Link>
          ) : null}
          {actions}
          <Link
            prefetch={false}
            href={clearHref}
            aria-label={clearAriaLabel}
            title={clearAriaLabel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-msk-ink/10 bg-white text-msk-ink/65 shadow-sm transition hover:bg-msk-chalk hover:text-msk-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {children ? (
        <div className="space-y-4 p-4 sm:p-5">{children}</div>
      ) : null}
    </Surface>
  );
}
