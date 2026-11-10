import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { PageShell } from "@/components/ui/page-shell";

export default function SuiviMouvementsLoading() {
  return (
    <PageShell>
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-msk-ink/6" />
      <ListTableSkeleton rows={8} cols={6} />
    </PageShell>
  );
}
