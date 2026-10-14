import type { CrmSource } from "@prisma/client";
import { SourceChannelIcon } from "@/components/brand/channel-icons";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

/**
 * Origine prospect — même langage visuel que les badges réseaux d’offre.
 * `compact` pour tableaux ; défaut pour fiche.
 */
export function OriginChip({
  source,
  className,
  size = "default",
}: {
  source: CrmSource | null | undefined;
  className?: string;
  size?: "default" | "compact";
}) {
  if (size === "compact") {
    if (!source) {
      return <span className={cn("text-msk-ink/40", className)}>—</span>;
    }
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-msk-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-msk-ink shadow-sm",
          className,
        )}
        title={`Origine · ${SOURCE_LABELS[source]}`}
      >
        <SourceChannelIcon source={source} className="h-3.5 w-3.5" />
        {SOURCE_LABELS[source]}
      </span>
    );
  }

  if (!source) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2.5 rounded-xl border border-dashed border-msk-ink/15 bg-msk-chalk/50 px-3 py-2",
          className,
        )}
      >
        <span className="text-xs text-msk-ink/40">Origine non renseignée</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 rounded-xl border border-msk-ink/[0.08] bg-white px-3 py-2 shadow-sm",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-msk-chalk">
        <SourceChannelIcon source={source} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
          Origine
        </span>
        <span className="block truncate text-sm font-semibold text-msk-ink">
          {SOURCE_LABELS[source]}
        </span>
      </span>
    </div>
  );
}
