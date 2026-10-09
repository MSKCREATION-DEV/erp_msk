import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function GedLoading() {
  return (
    <PageShell>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </PageShell>
  );
}
