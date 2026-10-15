import Link from "next/link";
import type { CrmScopeLens } from "@/lib/crm/scope-period";
import { cn } from "@/lib/utils";

/**
 * Bandeau léger pour vue historique (sans focus collab) ou dashboard sans panneau.
 * Si un `ScopeFocusBanner` est affiché, ne pas passer `ownerLabel` ici
 * (évite le double « Focus »).
 */
export function CrmScopeContext({
  lens,
  periodLabel,
  ownerLabel,
  resetHref,
  className,
}: {
  lens: CrmScopeLens;
  periodLabel: string;
  ownerLabel?: string | null;
  /** Lien vers période courante (sans owner, ou avec owner selon l’écran). */
  resetHref: string;
  className?: string;
}) {
  if (lens === "live" && !ownerLabel) return null;

  const isHistory = lens === "period";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
        isHistory
          ? "border-msk-coral/25 bg-msk-coral/[0.06] text-msk-ink/80"
          : "border-msk-blue/20 bg-msk-blue/[0.04] text-msk-ink/75",
        className,
      )}
      role="status"
    >
      <p className="min-w-0 text-xs leading-relaxed sm:text-sm">
        {isHistory ? (
          <>
            <span className="font-semibold text-msk-ink">Vue historique</span>
            {" · "}
            {periodLabel}
            {ownerLabel ? ` · ${ownerLabel}` : ""}
            {" — "}
            portefeuille « à date » masqué (non comparable à cette période).
          </>
        ) : (
          <>
            <span className="font-semibold text-msk-ink">Focus collaborateur</span>
            {ownerLabel ? ` · ${ownerLabel}` : ""}
            {" · "}
            {periodLabel}
          </>
        )}
      </p>
      {isHistory ? (
        <Link
          prefetch={false}
          href={resetHref}
          className="shrink-0 text-xs font-medium text-msk-blue hover:underline"
        >
          Revenir à aujourd’hui
        </Link>
      ) : null}
    </div>
  );
}
