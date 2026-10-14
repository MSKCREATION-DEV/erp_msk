import { Badge } from "@/components/ui/badge";
import {
  formatRelanceCount,
  RELANCE_GUIDE_THRESHOLD,
} from "@/lib/crm/follow-up-count";
import { cn } from "@/lib/utils";

/**
 * LOT-G — badge historique de relances.
 * `compact` = nombre seul (tableaux) · défaut = « Relancé N× » (fiche).
 * 0 muted · 1–2 blue · ≥3 coral (seuil GUIDE Perdu).
 */
export function RelanceCountBadge({
  count,
  className,
  showZero = true,
  compact = false,
}: {
  count: number;
  className?: string;
  /** Si false, masque le badge quand count === 0. */
  showZero?: boolean;
  /** Tableaux : affiche seulement `N×`. */
  compact?: boolean;
}) {
  if (!showZero && count <= 0) return null;
  const n = Math.max(0, count);
  const tone =
    n >= RELANCE_GUIDE_THRESHOLD ? "coral" : n >= 1 ? "blue" : "muted";
  return (
    <Badge
      tone={tone}
      className={cn("min-w-8 tabular-nums", className)}
      title={`${n} relance${n > 1 ? "s" : ""} journalisée${n > 1 ? "s" : ""} (hors notes)`}
    >
      {compact ? formatRelanceCount(n) : `Relancé ${formatRelanceCount(n)}`}
    </Badge>
  );
}
