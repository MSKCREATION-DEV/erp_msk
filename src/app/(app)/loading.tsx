import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant loading state (Next.js loading.tsx).
 * Affiché à la place de `children` pendant la nav — le layout (sidebar) reste monté.
 * Prefetch Link s’arrête à cette boundary → navigations plus légères.
 */
export default function AppLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
