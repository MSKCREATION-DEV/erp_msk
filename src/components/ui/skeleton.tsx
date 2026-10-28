import { gridKpi4 } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-msk-ink/6", className)}
    />
  );
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className={gridKpi4}>
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
