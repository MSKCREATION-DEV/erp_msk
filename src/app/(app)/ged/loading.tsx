import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { GedBrowserSkeleton } from "@/components/ged/ged-browser-skeleton";

/**
 * Instant loading GED — même chrome que la page (header + navigateur),
 * pas une page quasi blanche.
 */
export default function GedLoading() {
  return (
    <PageShell>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <GedBrowserSkeleton />
    </PageShell>
  );
}
