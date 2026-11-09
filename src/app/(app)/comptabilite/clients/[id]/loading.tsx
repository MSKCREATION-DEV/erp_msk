import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export default function ComptabiliteClientCompteLoading() {
  return (
    <PageShell>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Surface key={i} className="p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-28" />
          </Surface>
        ))}
      </div>
      <Surface className="p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-24 w-full" />
      </Surface>
    </PageShell>
  );
}
