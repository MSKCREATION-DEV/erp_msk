import { PageShell } from "@/components/ui/page-shell";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function GabaritsLoading() {
  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-14 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 xl:col-span-9">
          <ListTableSkeleton rows={8} cols={4} />
        </div>
        <div className="space-y-4 lg:col-span-4 xl:col-span-3">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </PageShell>
  );
}
