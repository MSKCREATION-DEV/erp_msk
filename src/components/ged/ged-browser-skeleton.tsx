import { Surface } from "@/components/ui/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { gridGedTiles } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";

/** Skeleton navigateur GED — évite le flash blanc pendant le fetch dossier. */
export function GedBrowserSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("min-w-0 space-y-3", className)}
      aria-busy="true"
      aria-label="Chargement GED"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-msk-ink/6 bg-white px-3 py-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
      </div>

      <Surface className="overflow-hidden p-0">
        <ul className={gridGedTiles}>
          {Array.from({ length: 10 }).map((_, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-msk-ink/6 bg-msk-chalk/40 p-3"
            >
              <Skeleton className="mx-auto h-12 w-12 rounded-lg" />
              <Skeleton className="mx-auto h-3 w-[80%]" />
              <Skeleton className="mx-auto h-2.5 w-[50%]" />
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
