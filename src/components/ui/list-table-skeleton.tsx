import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Fallback Suspense — zone table uniquement (toolbar / search restent montés). */
export function ListTableSkeleton({
  rows = 8,
  cols = 6,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-x-auto", className)}
      role="status"
      aria-label="Chargement des résultats"
    >
      <div className="min-w-full space-y-0 px-4 py-3">
        <div
          className="mb-3 grid gap-3 border-b border-msk-ink/6 pb-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 border-b border-msk-ink/4 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4", c === 0 ? "w-3/4" : "w-full")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
