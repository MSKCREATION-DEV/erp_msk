import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export default function Loading() {
  return (
    <PageShell>
      <div className="mb-4 h-10 w-48 animate-pulse rounded-lg bg-msk-chalk" />
      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-msk-chalk" />
        </div>
        <ListTableSkeleton rows={8} cols={6} />
      </Surface>
    </PageShell>
  );
}
