import { Skeleton } from "@/components/ui/skeleton";
import { gridKpi3 } from "@/lib/ui/layout-grids";

/**
 * Instant loading state (Next.js loading.tsx).
 * Affiché à la place de `children` pendant la nav — le layout (sidebar) reste monté.
 * Prefetch Link s’arrête à cette boundary → navigations plus légères.
 */
export default function AppLoading() {
  return (
    <div
      className="min-w-0 space-y-4"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className={gridKpi3}>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
