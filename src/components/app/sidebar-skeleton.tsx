import { Skeleton } from "@/components/ui/skeleton";

/** Fallback Suspense sidebar — layout shell streamable sans attendre cookies. */
export function SidebarSkeleton() {
  return (
    <aside
      className="flex h-full w-[248px] shrink-0 flex-col overflow-hidden border-r border-msk-ink/[0.07] bg-white"
      aria-busy
      aria-label="Chargement navigation"
    >
      <div className="flex h-[64px] items-center px-4">
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-5">
        <Skeleton className="mb-2 h-3 w-16" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
        <Skeleton className="mb-2 mt-4 h-3 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`a-${i}`} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <div className="border-t border-msk-ink/[0.07] p-3">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </aside>
  );
}
